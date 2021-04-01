"use strict"

const session = require("../../scripts/aws-get-session");
const WebSocket = require('ws');
const readline = require('readline');
const { ssm } = require("ssm-session");

const termOptions = {
  rows: 34,
  cols: 197
};

(async () => {
	var startSessionRes = await session();
	//console.log(`TokenValue: ${startSessionRes.TokenValue}`)
	//console.log(`StreamUrl: ${startSessionRes.StreamUrl}`)

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
		var agentMessage = ssm.decode(event.data);
		//console.log(agentMessage);
		ssm.sendACK(connection, agentMessage);
        if (agentMessage.payloadType === 1){
          process.stdout.write(agentMessage.payload);
        } else if (agentMessage.payloadType === 17){
          ssm.sendInitMessage(connection, termOptions);
        }
	}

	connection.onclose = () => {
		console.log("websocket closed")
	}
})();