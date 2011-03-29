var connect = require('connect');
var path = require('path')

connect.createServer(
	connect.logger()
,	connect.static(path.join(__dirname, '..'))
).listen(3000);

console.log("Open http://localhost:3000/test/less-test.html")
