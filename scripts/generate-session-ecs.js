"use strict";
/*
Usage: node generate-session.js
You will be prompted for the following (to choose from a list):
- AWS Region (default value: eu-west-3)
- AWS Profile (default value: default)
- InstanceId (from the list of SSM managed instances)

The output will be the result of startSession which is a JSON containing 
the Websocket Stream URL and the Token value
*/
const session = require("./aws-get-session-ecs");

(async () => {
  console.log(await session());
})();
