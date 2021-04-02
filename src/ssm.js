import sha256 from "./sha256.js";

const ACK_TYPE = 3;
const INPUT_TYPE = 1;
const OUTPUT_TYPE = 0;

var messageSequenceNumber = 0;

function buildAgentMessage(
  payload,
  messageType,
  sequenceNumber,
  payloadType,
  flags
) {
  return {
    headerLength: 116,
    messageType: messageType,
    schemaVersion: 1,
    createdDate: new Date().getTime(),
    sequenceNumber: sequenceNumber,
    flags: flags,
    messageId: generateUuid(),
    payloadDigest: generateDigest(payload),
    payloadType: payloadType,
    payloadLength: payload.length,
    payload: payload,
  };
}

function parseUuid(buf) {
  var part1, part2, part3, part4, part5, i;
  part1 = part2 = part3 = part4 = part5 = "";
  for (i = 8; i < 12; i++) {
    part1 += formatNum(buf[i].toString(16));
  }
  for (i = 12; i < 14; i++) {
    part2 += formatNum(buf[i].toString(16));
  }
  for (i = 14; i < 16; i++) {
    part3 += formatNum(buf[i].toString(16));
  }
  for (i = 0; i < 2; i++) {
    part4 += formatNum(buf[i].toString(16));
  }
  for (i = 2; i < 8; i++) {
    part5 += formatNum(buf[i].toString(16));
  }
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

function formatNum(num) {
  return ("0" + num).slice(-2);
}
function generateUuid() {
  var result = [
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
  ];
  var uuid = uuidv4().split("-");

  var part1Split = uuid[0].match(/.{1,2}/g);
  result[8] = parseInt(part1Split[0], 16);
  result[9] = parseInt(part1Split[1], 16);
  result[10] = parseInt(part1Split[2], 16);
  result[11] = parseInt(part1Split[3], 16);

  var part2Split = uuid[1].match(/.{1,2}/g);
  result[12] = parseInt(part2Split[0], 16);
  result[13] = parseInt(part2Split[1], 16);

  var part3Split = uuid[2].match(/.{1,2}/g);
  result[14] = parseInt(part3Split[0], 16);
  result[15] = parseInt(part3Split[1], 16);

  var part4Split = uuid[3].match(/.{1,2}/g);
  result[0] = parseInt(part4Split[0], 16);
  result[1] = parseInt(part4Split[1], 16);

  var part5Split = uuid[4].match(/.{1,2}/g);
  result[2] = parseInt(part5Split[0], 16);
  result[3] = parseInt(part5Split[1], 16);
  result[4] = parseInt(part5Split[2], 16);
  result[5] = parseInt(part5Split[3], 16);
  result[6] = parseInt(part5Split[4], 16);
  result[7] = parseInt(part5Split[5], 16);

  return result;
}

function generateDigest(data) {
  return sha256(data).substring(0, 32);
}

function stringToBuffer(data) {
  var enc = new TextEncoder();
  return enc.encode(data);
}

function agentMessageToBuffer(payload) {
  var buf = new Uint8Array(116 + payload.payload.length + 4);
  putInt(buf, payload.headerLength, 0);
  putString(buf, payload.messageType, 4, 32);
  putInt(buf, payload.schemaVersion, 36);
  putLong(buf, payload.createdDate, 40);
  putLong(buf, payload.sequenceNumber, 48);
  putLong(buf, payload.flags, 56);
  putByteArray(buf, payload.messageId, 64);
  putString(buf, payload.payloadDigest, 80);
  putInt(buf, payload.payloadType, 112);
  putInt(buf, payload.payloadLength, 116);
  putString(buf, payload.payload, 120);
  return buf;
}

function putInt(buf, data, offset) {
  var byteArray = intToByteArray(data);
  for (var i = 0; i < 4; i++) {
    buf[offset + i] = byteArray[i];
  }
}

function putLong(buf, data, offset) {
  var byteArray = longToByteArray(data);
  for (var i = 0; i < 8; i++) {
    buf[offset + i] = byteArray[i];
  }
}

function putString(buf, data, offset, maxLength) {
  var i;
  if (maxLength) {
    var diff = 0;
    if (data.length < maxLength) {
      diff = maxLength - data.length;
      for (i = 0; i < diff; i++) {
        buf[offset + i] = 0;
      }
    }
    for (i = diff; i < maxLength; i++) {
      buf[offset + i] = data[i - diff] ? data[i - diff].charCodeAt(0) : 0;
    }
  } else {
    for (i = 0; i < data.length; i++) {
      buf[offset + i] = data[i] ? data[i].charCodeAt(0) : 0;
    }
  }
}

function putByteArray(buf, data, offset) {
  for (var i = data.length - 1; i >= 0; i--) {
    buf[offset + i] = data[i];
  }
}

function longToByteArray(long) {
  var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
  for (var index = byteArray.length - 1; index >= 0; index--) {
    var byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }
  return byteArray;
}

function intToByteArray(int) {
  var byteArray = [0, 0, 0, 0];
  for (var index = byteArray.length - 1; index >= 0; index--) {
    var byte = int & 0xff;
    byteArray[index] = byte;
    int = (int - byte) / 256;
  }
  return byteArray;
}

function getInt(buf) {
  var data = 0;
  for (var i = 3; i >= 0; i--) {
    data += buf[i] << ((3 - i) * 8);
  }
  return data;
}

function getString(buf) {
  var data = "";
  for (var i = 0; i < buf.byteLength; i++) {
    data += String.fromCharCode(buf[i]);
  }
  return data;
}
function getLong(buf) {
  var data = 0;
  for (var i = 0; i < buf.byteLength; i++) {
    data = data + buf[buf.byteLength - 1 - i] * Math.pow(256, i);
  }
  return data;
}

//https://stackoverflow.com/a/2117523/2614364
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

var ssm = {
  decode: function (buffer) {
    /*
		var buf = new Uint8Array([
			0x00,0x00,0x00,0x74,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x69,0x6e,0x70,0x75,0x74,0x5f,0x73,0x74,0x72,0x65,0x61,0x6d,0x5f,0x64,0x61,0x74,0x61,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x00,0x1e,0x5b,0x37,0xe2,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x73,0x0f,0x66,0x49,0x14,0x53,0x4e,0x2a,0x9f,0x01,0xa3,0x7d,0xbf,0xfe,0xfc,0xe1,0x65,0x34,0x34,0x33,0x36,0x35,0x62,0x39,0x35,0x31,0x31,0x36,0x32,0x65,0x64,0x61,0x36,0x34,0x61,0x63,0x65,0x66,0x64,0x32,0x37,0x35,0x37,0x32,0x32,0x30,0x39,0x65,0x00,0x00,0x00,0x03,0x00,0x00,0x00,0x16,0x7b,0x22,0x63,0x6f,0x6c,0x73,0x22,0x3a,0x32,0x30,0x32,0x2c,0x22,0x72,0x6f,0x77,0x73,0x22,0x3a,0x31,0x38,0x7d]);
		console.log(buf);
		*/
    var buf = new Uint8Array(buffer);
    var agentMessage = {
      headerLength: getInt(buf.slice(0, 4)), //4
      messageType: getString(buf.slice(4, 36)).trim(), //32
      schemaVersion: getInt(buf.slice(36, 40)), //4
      createdDate: getLong(buf.slice(40, 48)), //8
      sequenceNumber: getLong(buf.slice(48, 56)), //8
      flags: getLong(buf.slice(56, 64)), //8
      messageId: parseUuid(buf.slice(64, 80)), //16
      payloadDigest: getString(buf.slice(80, 112)), //32
      payloadType: getInt(buf.slice(112, 116)), //4
      payloadLength: getInt(buf.slice(116, 120)), //4
      payload: getString(buf.slice(120, buf.byteLength)),
    };
    console.log(agentMessage);
    var res = buf.slice(120, buf.byteLength);
    var charList = "";
    for (var i = 0; i < res.length; i++) {
      charList += String.fromCharCode(res[i]);
    }
    console.log(charList);
    console.log(res);
    return agentMessage;
  },

  init: function (connection, data) {
    messageSequenceNumber = 0;
    connection.send(ssm.buildTokenMessage(data.token));
    connection.send(ssm.buildInitMessage(data.termOptions));
  },

  sendInitMessage: function (connection, termOptions) {
    connection.send(ssm.buildInitMessage(termOptions));
  },
  buildTokenMessage: function (token) {
    return JSON.stringify({
      MessageSchemaVersion: "1.0",
      RequestId: uuidv4(),
      TokenValue: token,
    });
  },

  buildInitMessage: function (options) {
    var payload = {
      cols: options.cols,
      rows: options.rows,
    };
    var initMessage = buildAgentMessage(
      JSON.stringify(payload),
      "input_stream_data",
      messageSequenceNumber,
      ACK_TYPE,
      1
    );
    //console.log("initMessage",initMessage);
    return agentMessageToBuffer(initMessage);
  },

  buildAcknowledge: function (messageType, sequenceNumber, messageID) {
    var payload = {
      AcknowledgedMessageType: "output_stream_data",
      AcknowledgedMessageId: messageID,
      AcknowledgedMessageSequenceNumber: sequenceNumber,
      IsSequentialMessage: true,
    };
    var ackMessage = buildAgentMessage(
      JSON.stringify(payload),
      "acknowledge",
      sequenceNumber,
      ACK_TYPE,
      0
    );
    //console.log("acknowledge",ackMessage);
    return agentMessageToBuffer(ackMessage);
  },

  buildInputMessage: function (text, sequenceNumber) {
    var inputMessage = buildAgentMessage(
      text,
      "input_stream_data",
      sequenceNumber,
      INPUT_TYPE,
      sequenceNumber == 1 ? 0 : 1
    );
    //console.log("inputMessage",inputMessage);
    return agentMessageToBuffer(inputMessage);
  },

  sendACK: function (connection, agentMessage) {
    connection.send(
      ssm.buildAcknowledge(
        agentMessage.messageType,
        agentMessage.sequenceNumber,
        agentMessage.messageId
      )
    );
  },

  sendText: function (connection, text, sequenceNum) {
    console.log(text);
    if (typeof sequenceNum === "undefined") {
      messageSequenceNumber++;
      connection.send(ssm.buildInputMessage(text, messageSequenceNumber));
    } else {
      connection.send(ssm.buildInputMessage(text, sequenceNum));
    }
  },
};

export default ssm;
