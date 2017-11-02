var utf8 = require('utf8');
var crypto = require('crypto');
var request = require('request');
var https = require("https");
var http = require("http");
const HttpsAgent = require('agentkeepalive').HttpsAgent;

function createSharedAccessToken(uri, saName, saKey) {
    if (!uri || !saName || !saKey) {
        throw "Missing required parameter";
    }

    var encoded = encodeURIComponent(uri);
    var now = new Date();
    var week = 60*60*24*7;
    var ttl = Math.round(now.getTime() / 1000) + week;
    var signature = encoded + '\n' + ttl;
    var signatureUTF8 = utf8.encode(signature);
    var hash = crypto.createHmac('sha256', saKey).update(signatureUTF8).digest('base64');

    return 'SharedAccessSignature sr=' + encoded + '&sig=' +
        encodeURIComponent(hash) + '&se=' + ttl + '&skn=' + saName;
};

const authorization = createSharedAccessToken(
  process.env.EVENT_HUB_HOST,
  process.env.EVENT_HUB_ACCESS_KEY_NAME,
  process.env.EVENT_HUB_ACCESS_KEY_VALUE
);

const keepaliveAgent = new HttpsAgent();

console.log("Authorization: " + authorization);

var requestCount = 0;
var errorCount = 0;
var successCount = 0;

function sendMessageToEventHub(){
  var content = JSON.stringify({ timestamp: Date.now().timestamp, "message": "Hello Event Hub" });
  var contentLenght = content.length;

  requestCount += 1;
  console.log("Requests count: " + requestCount + ", Success count: " + successCount + ", Errors count: " + errorCount);

  var postOptions = {
    host: process.env.EVENT_HUB_HOST,
    path: "/mapwize-repro-hub/messages",
    port: 443,
    method: "POST",
    headers:{
      'Content-Length': contentLenght,
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': authorization,
      'Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    agent: keepaliveAgent
  };

  var postRequest = https.request(postOptions, function(res) {
    console.log(res.statusMessage);
    if(res.statusCode === 201) {
      successCount += 1;
    }
    else {
      errorCount += 1;
    }
  });
  
  postRequest.write(content);
  postRequest.end();
};

setInterval(sendMessageToEventHub, 100);

var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write("OK !");
  response.end();
});

server.listen(process.env.PORT || 8000);
console.log("Server is listening");