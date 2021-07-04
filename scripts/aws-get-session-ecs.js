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

  var ecs = new AWS.ECS();

  //select ECS cluster if more than one
  var clusters = await listClusters(ecs);
  if (clusters.clusterArns.length == 0) {
    console.log("no ECS cluster found");
    return "";
  }
  for (var i = 0; i < clusters.clusterArns.length; i++) {
    console.log(`> ${clusters.clusterArns[i].split("/")[1]}`);
  }
  var ecsCluster = clusters.clusterArns[0].split("/")[1];
  if (clusters.clusterArns.length > 1) {
    ecsCluster =
      (await prompt(`Choose ECS cluster: `)) ||
      clusters.clusterArns[0].split("/")[1];
  }

  //select ECS task
  var tasks = await listTasks(ecs, ecsCluster);
  if (tasks.taskArns.length == 0) {
    console.log(`no ECS tasks found in cluster ${ecsCluster}`);
    return "";
  }
  for (var i = 0; i < tasks.taskArns.length; i++) {
    console.log(`> ${tasks.taskArns[i].split("/")[2]}`);
  }
  var taskId = tasks.taskArns[0].split("/")[2];
  if (tasks.taskArns.length > 1) {
    taskId =
      (await prompt(`Choose ECS task: `)) || tasks.taskArns[0].split("/")[2];
  }

  var task = await describeTask(ecs, ecsCluster, taskId);
  var containers = task.tasks[0].containers;
  if (containers.length == 0) {
    console.log(`no containers found in task ${taskId}`);
    return "";
  }
  for (var i = 0; i < containers.length; i++) {
    console.log(`> ${containers[i].name}`);
  }
  var containerId = containers[0].runtimeId;
  if (containers.length > 1) {
    containerId =
      (await prompt(`Choose container: `)) || containers[0].runtimeId;
  }
  const target = `ecs:${ecsCluster}_${taskId}_${containerId}`;

  //start session
  var ssm = new AWS.SSM();
  return await startSession(ssm, target);
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

async function listClusters(ecs) {
  return new Promise(function (resolve, reject) {
    ecs.listClusters(function (err, data) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
async function listTasks(ecs, cluster) {
  return new Promise(function (resolve, reject) {
    ecs.listTasks({ cluster: cluster }, function (err, data) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function describeTask(ecs, cluster, task) {
  return new Promise(function (resolve, reject) {
    ecs.describeTasks({ cluster, tasks: [task] }, function (err, data) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(data);
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
