/**	
	Node TestServer for running the less.js tests inside a browser
*/
var http	= require('http'),
	fs 		= require('fs'),
	path	= require('path'),
	
	currentDist = '../dist/less-1.0.41.js'; // todo: get this dynamically

	
http.createServer(function (request, response) {
	console.log(request.url);
	
	var fileExt = path.extname(request.url),
		contentType = 'text/html',
		filePath = request.url === '/dist/less.js' ? '../dist/less-1.0.41.js' : request.url.substr(1);
	
	fs.readFile(filePath, function (err, data) {
		if (err) {
			response.writeHead(404, {'Content-Type': contentType});
			response.end('<h1>404 Page Not Found</h1>');
			return;
		}
		switch (fileExt){
			case '.less':
				contentType = 'text/less';
				break;
			case '.css':
				contentType = 'text/css';
				break;
			case '.js':
				contentType = 'application/javascript';
				break;
		}
		console.log(contentType);
		response.writeHead(200, {'Content-Type': contentType});
		response.end(data);
    });

  
}).listen(8124);

console.log('Server running at http://127.0.0.1:8124/');
