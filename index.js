var utf8 = require('utf8');
var crypto = require('crypto');
var request = require('request');
var http = require("http");

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

var authorization = createSharedAccessToken(
  process.env.EVENT_HUB_HOST,
  process.env.EVENT_HUB_ACCESS_KEY_NAME,
  process.env.EVENT_HUB_ACCESS_KEY_VALUE
);

console.log("Authorization: " + authorization);

var requestCount = 0;

function sendMessageToEventHub(){
  var content = JSON.stringify({ timestamp: Date.now().timestamp, "message": "Hello Event Hub" });
  var contentLenght = content.length;

  request.post( 
  {
    headers: 
    {
      'Content-Length': contentLenght,
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': authorization,
      'Origin': '*',
      'Access-Control-Allow-Credentials': true,
      "Connection":"Keep-Alive"
    },
    uri: "https://" + process.env.EVENT_HUB_HOST_URL + "/messages",
    method: "POST",
    body: content,

  }, 
  function(err, resp, body)
  {
    if(err){
      console.log(err);
    } else{
      console.log(resp.statusCode + ': ' + resp.statusMessage);
      requestCount += 1;
    }
  });

  console.log(requestCount);
};

setInterval(sendMessageToEventHub, 1000)

var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write("OK");
  response.end();
});

server.listen(process.env.PORT || 8000);
console.log("Server is listening");