import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import { Terminal } from "xterm";
import "xterm/css/xterm.css";

import "./style.css";

import { ssm } from "../../../src/index.js";

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
