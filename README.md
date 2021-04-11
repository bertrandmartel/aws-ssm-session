# AWS SSM Session for Javascript

![build](https://github.com/bertrandmartel/aws-ssm-session/workflows/build/badge.svg) [![License](http://img.shields.io/:license-mit-blue.svg)](LICENSE.md)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/bertrandmartel/aws-ssm-session.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/bertrandmartel/aws-ssm-session/alerts/) [![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/bertrandmartel/aws-ssm-session.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/bertrandmartel/aws-ssm-session/context:javascript)

Javascript library for starting an AWS SSM session compatible with Browser and NodeJS

[![npm package](https://nodei.co/npm/ssm-session.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/ssm-session)

|                                    Start a shell session in the Browser                                     |                                      Start a shell session using NodeJS                                      |
| :---------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| ![web](https://user-images.githubusercontent.com/5183022/78514983-5ad5c880-77b4-11ea-80cb-a35a1bbfd7ff.png) | ![node](https://user-images.githubusercontent.com/5183022/78514982-5a3d3200-77b4-11ea-8cc9-d7d3fdc060de.png) |

## About AWS System Manager Session Manager

> Session Manager is a fully managed AWS Systems Manager capability that lets you manage your Amazon EC2 instances, on-premises instances, and virtual machines (VMs) through an interactive one-click browser-based shell or through the AWS CLI. Session Manager provides secure and auditable instance management without the need to open inbound ports, maintain bastion hosts, or manage SSH keys. Session Manager also makes it easy to comply with corporate policies that require controlled access to instances, strict security practices, and fully auditable logs with instance access details, while still providing end users with simple one-click cross-platform access to your managed instances.

## Quick Start

### NodeJS

```bash
git clone git@github.com:bertrandmartel/aws-ssm-session.git
cd aws-ssm-session
npm i
npm run build
node ./examples/node/app.js
```

You will be prompted for AWS Region, AWS profile (default if not specified), choose your instance and a session is started directly

### Browser

We need to generate the Websocket stream URL and token value using AWS API using a NodeJS script :

```bash
git clone git@github.com:bertrandmartel/aws-ssm-session.git
cd aws-ssm-session
npm i
npm run build
node scripts/generate-session.js
```

In another shell start the local webserver

```bash
cd examples/web
npm start
```

Go to http://localhost:8080 and enter your token & stream value from the output of the first shell then click "start session"

## Installation

From npm :

```bash
npm i --save ssm-session
```

## Usage

```javascript
const { ssm } = require("ssm-session");
```

or

```javascript
import { ssm } from "ssm-session";
```

## Example

### Browser

The following code starts a session and use [Xterm.js](https://xtermjs.org/) to write the result and listen to key events, checkout the [`web` directory](https://github.com/bertrandmartel/aws-ssm-session/tree/master/web)

```javascript
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

import { ssm } from "ssm-session";

var socket;
var terminal;
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const termOptions = {
  rows: 34,
  cols: 197,
  fontFamily: "Fira Code, courier-new, courier, monospace",
};

$(document).ready(function () {
  $(".toast").toast({
    delay: 3500,
  });
});
$("#startSessionBtn").click(startSession);
$("#stopSessionBtn").click(stopSession);
function startSession() {
  var tokenValue = document.getElementById("tokenValue").value;
  var websocketStreamURL = document.getElementById("websocketStreamURL").value;
  if (!tokenValue) {
    showMessage("Token value is required to start session");
    return;
  }
  if (!websocketStreamURL) {
    showMessage("Websocket stream URL is required to start session");
    return;
  }

  socket = new WebSocket(websocketStreamURL);
  socket.binaryType = "arraybuffer";
  initTerminal();

  socket.addEventListener("open", function (event) {
    ssm.init(socket, {
      token: tokenValue,
      termOptions: termOptions,
    });
  });
  socket.addEventListener("close", function (event) {
    showMessage("Websocket closed");
  });
  socket.addEventListener("message", function (event) {
    var agentMessage = ssm.decode(event.data);
    ssm.sendACK(socket, agentMessage);
    if (agentMessage.payloadType === 1) {
      terminal.write(textDecoder.decode(agentMessage.payload));
    } else if (agentMessage.payloadType === 17) {
      ssm.sendInitMessage(socket, termOptions);
    }
  });
}

function stopSession() {
  if (socket) {
    socket.close();
  }
  terminal.dispose();
}

function showMessage(message) {
  $("#toastMessage").text(message);
  $("#alertMessage").toast("show");
}

function initTerminal() {
  terminal = new Terminal(termOptions);
  terminal.open(document.getElementById("terminal"));
  terminal.onData(function (data) {
    ssm.sendText(socket, textEncoder.encode(data));
  });
  terminal.focus();
}
```

### NodeJS

The following code uses [ws](https://github.com/websockets/ws) as websocket client and listens to key events, from the [examples/node](https://github.com/bertrandmartel/aws-ssm-session/tree/master/examples/node) directory :

```javascript
"use strict";

const session = require("../../scripts/aws-get-session");
const WebSocket = require("ws");
const readline = require("readline");
const { ssm } = require("ssm-session");
const util = require("util");

const textDecoder = new util.TextDecoder();
const textEncoder = new util.TextEncoder();

const termOptions = {
  rows: 34,
  cols: 197,
};

(async () => {
  var startSessionRes = await session();

  const rl = readline.createInterface({
    input: process.stdin,
    output: null,
  });
  readline.emitKeypressEvents(process.stdin);

  const connection = new WebSocket(startSessionRes.StreamUrl);

  process.stdin.on("keypress", (str, key) => {
    if (connection.readyState === connection.OPEN) {
      ssm.sendText(connection, textEncoder.encode(str));
    }
  });

  connection.onopen = () => {
    ssm.init(connection, {
      token: startSessionRes.TokenValue,
      termOptions: termOptions,
    });
  };

  connection.onerror = (error) => {
    console.log(`WebSocket error: ${error}`);
  };

  connection.onmessage = (event) => {
    var agentMessage = ssm.decode(event.data);
    ssm.sendACK(connection, agentMessage);
    if (agentMessage.payloadType === 1) {
      process.stdout.write(textDecoder.decode(agentMessage.payload));
    } else if (agentMessage.payloadType === 17) {
      ssm.sendInitMessage(connection, termOptions);
    }
  };

  connection.onclose = () => {
    console.log("websocket closed");
  };
})();
```

## How it works ?

The flow is the following :

- get the SSM Managed instance list using AWS API : [ssm describe-instances-information](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_DescribeInstanceInformation.html)
- call the start session API on one target instance using AWS API : [ssm start-session API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_StartSession.html). This gives you the websocket URL and a Token value that will be used for authentication
- open a websocket connection on this URL
- send an authentication request composed of the following JSON stringified :

```json
{
  "MessageSchemaVersion": "1.0",
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "TokenValue": "<YOUR-TOKEN-VALUE>"
}
```

From this moment the protocol is not JSON anymore. It is implemented in the offical [Amazon SSM agent](https://github.com/aws/amazon-ssm-agent) which is required if you want start a SSM session from the AWS CLI. The payload must be sent & receive according [this binary format](https://github.com/aws/amazon-ssm-agent/blob/c65d8ac29a8bbe6cd3f7cea778c1eeb1b06d49a3/agent/session/contracts/agentmessage.go)

Also more specifically from [amazon-ssm-agent source code](https://github.com/aws/amazon-ssm-agent/blob/c65d8ac29a8bbe6cd3f7cea778c1eeb1b06d49a3/agent/session/contracts/agentmessage.go):

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
  headerLength: getInt(buf.slice(0, 4)), // 4 bytes
  messageType: getString(buf.slice(4, 36)).trim(), // 32 bytes
  schemaVersion: getInt(buf.slice(36, 40)), // 4 bytes
  createdDate: getLong(buf.slice(40, 48)), // 8 bytes
  sequenceNumber: getLong(buf.slice(48, 56)), // 8 bytes
  flags: getLong(buf.slice(56, 64)), // 8 bytes
  messageId: parseUuid(buf.slice(64, 80)), // 16 bytes
  payloadDigest: getString(buf.slice(80, 112)), // 32 bytes
  payloadType: getInt(buf.slice(112, 116)), // 4 bytes
  payloadLength: getInt(buf.slice(116, 120)), // 4 bytes
  payload: buf.slice(120, buf.byteLength), //variable length
};
```

Byte order is Big endian

For the communication part :

- each message with type "output_stream_data" must be acknowledged using an "acknowledge" type message which is referencing the messageID (uuid) of the message that has been received.
- when you send text, you send a message with type "input_stream_data", this message must be sent with an incremental sequence number (note the sequenceNumber field in the model above). The message will then be acknowledged by the server

There are possibly some features I didn't implement, for instance I didn't implement yet the ping message which is used to prevent the shell from being terminated due to inactivity

## Note about simultaneous terminal session

There is this sequence number that is required and re-initiliazed to 0 each time you call the `init()` function. If you need to have more than 1 terminal at the same time, there will be an issue because each session must have its own sequential number.

One way is to use you own sequential number and set it to 0 before the call to `init()` and increment it before calling `sendText()`. It will be like this :

In websocket open :

```javascript
customSeqNum = 0;
ssm.init(connection, {
  token: startSessionRes.TokenValue,
  termOptions: termOptions,
});
```

When you write text:

```javascript
ssm.sendText(connection, str, customSeqNum);
```

So this way you can open any number of sessions simultaneously

## Dependencies

- An embedded version of sha256: https://github.com/geraintluff/sha256

## License

The MIT License (MIT) Copyright (c) 2020 Bertrand Martel
