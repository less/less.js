var path = require('path'),
    fs = require('fs'),
    sys = require('util'),
    output = '<html><head>\n';
    
fs.readdirSync(path.join('test/less/', '')).forEach(function (file) {
    if (! /\.less/.test(file)) { return; }
    
    var name = path.basename(file, '.less');
    
    if (name === "javascript" || name === "urls") { return; }
    
    output += '<link id="original-less:less-'+name+'" rel="stylesheet/less" type="text/css" href="http://localhost:8081/' + path.join('less', name) + '.less' +'">\n';
    output += '<link id="expected-less:less-'+name+'" rel="stylesheet"  type="text/css" href="http://localhost:8081/' + path.join('css', name) + '.css' + '">\n';
});

output += String(fs.readFileSync(path.join('test/browser', 'template.htm'))).replace("{runner-name}", "main");

fs.writeFileSync(path.join('test/browser', 'test-runner-main.htm'), output);