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
var AWS = require("aws-sdk");

const defaultRegion = "eu-west-3";
const defaultProfile = "default";

const regionList = [
  { name: "default" },
  { name: "us-east-2" },
  { name: "us-east-1" },
  { name: "us-west-1" },
  { name: "us-west-2" },
  { name: "ap-east-1" },
  { name: "ap-south-1" },
  { name: "ap-northeast-3" },
  { name: "ap-northeast-2" },
  { name: "ap-southeast-1" },
  { name: "ap-southeast-2" },
  { name: "ap-northeast-1" },
  { name: "ca-central-1" },
  { name: "cn-north-1" },
  { name: "cn-northwest-1" },
  { name: "eu-central-1" },
  { name: "eu-west-1" },
  { name: "eu-west-2" },
  { name: "eu-west-3" },
  { name: "eu-north-1" },
  { name: "me-south-1" },
  { name: "sa-east-1" },
  { name: "us-gov-east-1" },
  { name: "us-gov-west-1" },
];

const readline = require("readline");

/*
(async () => {
	console.log(await startSessionTask())
})();

*/

async function startSessionTask() {
  //select region
  for (var i = 0; i < regionList.length; i++) {
    console.log(`> ${regionList[i].name}`);
  }
  const region =
    (await prompt(`Choose your region (default: ${defaultRegion}): `)) ||
    defaultRegion;
  AWS.config.update({ region: region });

  //select profile
  const profile =
    (await prompt(`Choose your profile (default: ${defaultProfile}): `)) ||
    defaultProfile;
  if (profile !== "default") {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({
      profile: profile,
    });
  }

  //select instance
  var ssm = new AWS.SSM();
  const instances = await getInstances(ssm);
  if (instances.length === 0) {
    console.log("no instance were found");
    return;
  }
  const defaultInstance = instances[0].InstanceId;
  for (var i = 0; i < instances.length; i++) {
    console.log(`> ${instances[i].InstanceId}`);
  }
  const instance =
    (await prompt(`Choose instance (default: ${defaultInstance}): `)) ||
    defaultInstance;
  if (!instance) {
    console.log("one instance must be selected");
    return;
  }

  //start session
  return await startSession(ssm, instance);
}

async function prompt(message) {
  return new Promise(function (resolve, reject) {
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(message, (res) => {
      rl.close();
      resolve(res);
    });
  });
}

async function getInstances(ssm) {
  return new Promise(function (resolve, reject) {
    ssm.describeInstanceInformation({}, function (err, data) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(data.InstanceInformationList);
      }
    });
  });
}

async function startSession(ssm, target) {
  return new Promise(function (resolve, reject) {
    ssm.startSession({ Target: target }, function (err, data) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

module.exports = startSessionTask;
