# AWS SSM Session for Javascript

Javascript library for starting an AWS SSM session compatible with Browser and NodeJS

Start a shell session in the Browser            |  Start a shell session using NodeJS
:-------------------------:|:-------------------------:
![web](https://user-images.githubusercontent.com/5183022/78464154-1b40ab00-76e6-11ea-92d0-2a81a600c7b9.png)  | ![node](https://user-images.githubusercontent.com/5183022/78464152-1a0f7e00-76e6-11ea-8374-5a874d7cf226.png)


## About AWS System Manager Session Manager

> Session Manager is a fully managed AWS Systems Manager capability that lets you manage your Amazon EC2 instances, on-premises instances, and virtual machines (VMs) through an interactive one-click browser-based shell or through the AWS CLI. Session Manager provides secure and auditable instance management without the need to open inbound ports, maintain bastion hosts, or manage SSH keys. Session Manager also makes it easy to comply with corporate policies that require controlled access to instances, strict security practices, and fully auditable logs with instance access details, while still providing end users with simple one-click cross-platform access to your managed instances.

## Quick Start

### NodeJS

```bash
git clone git@github.com:bertrandmartel/aws-ssm-session.git
cd aws-ssm-session
cd node-example
npm i
npm start
```
You will be prompted for AWS Region, AWS profile (default if not specified), choose your instance and a session is started directly

### Browser

```bash
git clone git@github.com:bertrandmartel/aws-ssm-session.git
cd aws-ssm-session

# we need to generate the Websocket stream URL and token value using AWS API using a NodeJS script
cd scripts
npm i
npm start
```

In another shell start the local webserver

```bash
cd aws-ssm-session
npm install http-server -g
http-server -a localhost -p 3000
```

Go to http://localhost:3000/web-example/ and enter your token & stream value from the output of the first shell then click "start session"

Note that the browser project example has **no** external dependencies (recommended for security reason)

## Installation

From npm :

```bash
npm i --save ssm-session
```

## Usage

```javascript
const ssm = require("ssm-session")
```
or 
```javascript
import * as ssm from "ssm-session";
```

## Example

### Browser

The following code start a session and use [Xterm.js](https://xtermjs.org/) to write the result to and to listen to key events :

```javascript
const ssm = window.ssm

var socket;
var terminal;

const termOptions = {
  rows: 34,
  cols: 197
};

function startSession(){
  var tokenValue = document.getElementById("tokenValue").value;
  var websocketStreamURL = document.getElementById("websocketStreamURL").value;
  
  socket = new WebSocket(websocketStreamURL);
  socket.binaryType = "arraybuffer";
  initTerminal()

  socket.addEventListener('open', function (event) {
    ssm.init(socket, {
      token: tokenValue,
      termOptions: termOptions
    });
  });
  socket.addEventListener('close', function (event) {
    console.log("Websocket closed")
  });
  socket.addEventListener('message', function (event) {
    var agentMessage = ssm.SSMDecode(event.data);
    //console.log(agentMessage);
    if (agentMessage.payloadType === 1){
      ssm.sendACK(socket, agentMessage);
      terminal.write(agentMessage.payload)
    }
  });
}

function stopSession(){
  if (socket){
    socket.close();
  }
  terminal.dispose()
}

function initTerminal() {
	terminal = new window.Terminal(termOptions);
	terminal.open(document.getElementById('terminal'));
	terminal.onKey(e => {
		ssm.sendText(socket, e.key);
	});
	terminal.on('paste', function(data) {
		ssm.sendText(socket, data);
	});
}
```

### NodeJS

The following code use [ws](https://github.com/websockets/ws) as websocket client and listens to key events :

```javascript
"use strict"

const session = require("../scripts/aws-get-session");
const WebSocket = require('ws');
const readline = require('readline');
const ssm = require("ssm-session")

const termOptions = {
  rows: 34,
  cols: 197
};

(async () => {
	var startSessionRes = {
		TokenValue: "your-token-value",
		StreamUrl: "ws://xxxxxxxxxxx"
	};

	const rl = readline.createInterface({
		input: process.stdin,
		output: null
	});
	readline.emitKeypressEvents(process.stdin);
	process.stdin.on('keypress', (str, key) => {
		if (connection.readyState === connection.OPEN) {
			ssm.sendText(connection, str);
		}
	});
	
	const WebSocket = require('ws')
	const connection = new WebSocket(startSessionRes.StreamUrl)

	connection.onopen = () => {
		ssm.init(connection, {
			token: startSessionRes.TokenValue,
			termOptions: termOptions
		})
	}
	
	connection.onerror = (error) => {
		console.log(`WebSocket error: ${error}`)
	}

	connection.onmessage = (event) => {
		var agentMessage = ssm.SSMDecode(event.data);
		//console.log(agentMessage);
		if (agentMessage.payloadType === 1) {
			ssm.sendACK(connection, agentMessage);
			process.stdout.write(agentMessage.payload);
		}
	}

	connection.onclose = () => {
		console.log("websocket closed")
	}
})();
```

## How it works ?

The flow is the following : 

* get the SSM Managed instance list using AWS API : [ssm describe-instances-information](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_DescribeInstanceInformation.html)
* call the start session API on one target instance using AWS API : [ssm start-session API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_StartSession.html). This gives you the websocket URL and a Token value that will be used for authentication
* open a websocket connection on this URL
* send an authentication request composed of the following JSON stringified : 

```json
{
	"MessageSchemaVersion": "1.0",
	"RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
	"TokenValue": "<YOUR-TOKEN-VALUE>"
}
```

From this moment the protocol is not JSON anymore. It is implemented in the offical [Amazon SSM agent](https://github.com/aws/amazon-ssm-agent) which is required if you want start a SSM session from the AWS CLI. The payload must be sent & receive according [this binary format](https://github.com/aws/amazon-ssm-agent/blob/c65d8ac29a8bbe6cd3f7cea778c1eeb1b06d49a3/agent/session/contracts/agentmessage.go)

Also more specifically :

```
// HL - HeaderLength is a 4 byte integer that represents the header length.
// MessageType is a 32 byte UTF-8 string containing the message type.
// SchemaVersion is a 4 byte integer containing the message schema version number.
// CreatedDate is an 8 byte integer containing the message create epoch millis in UTC.
// SequenceNumber is an 8 byte integer containing the message sequence number for serialized message streams.
// Flags is an 8 byte unsigned integer containing a packed array of control flags:
//   Bit 0 is SYN - SYN is set (1) when the recipient should consider Seq to be the first message number in the stream
//   Bit 1 is FIN - FIN is set (1) when this message is the final message in the sequence.
// MessageId is a 16 byte UTF-8 string containing a random UUID identifying this message.
// Payload digest is a 32 byte containing the SHA-256 hash of the payload.
// Payload Type is a 4 byte integer containing the payload type.
// Payload length is an 4 byte unsigned integer containing the byte length of data in the Payload field.
// Payload is a variable length byte data.
```

In Javascript it gives the following :

```javascript 
var agentMessage = {
	headerLength: getInt(buf.slice(0,4)), // 4 bytes
	messageType: getString(buf.slice(4,36)).trim(), // 32 bytes
	schemaVersion: getInt(buf.slice(36, 40)), // 4 bytes
	createdDate: getLong(buf.slice(40, 48)), // 8 bytes
	sequenceNumber: getLong(buf.slice(48,56)), // 8 bytes
	flags: getLong(buf.slice(56,64)), // 8 bytes
	messageId: parseUuid(buf.slice(64, 80)), // 16 bytes
	payloadDigest: getString(buf.slice(80,112)), // 32 bytes
	payloadType: getInt(buf.slice(112,116)), // 4 bytes
	payloadLength: getInt(buf.slice(116,120)), // 4 bytes
	payload: getString(buf.slice(120, buf.byteLength)) //variable length
};
```

Byte order is Big endian (!)

For the communication part :

* each message with type "output_stream_data" must be acknowledged using an "acknowledge" type message which is referencing the messageID (uuid) of the message that has been received.
* when you send text, you send a message with type "input_stream_data", this message must be sent with an incremental sequence number (note the sequenceNumber field in the model above). The message will then be acknowledged by the server

There are possibly many features I didn't implement, for instance I didn't implement yet the ping message which is used to prevent the shell from being terminated due to inactivity

## License

The MIT License (MIT) Copyright (c) 2020 Bertrand Martel