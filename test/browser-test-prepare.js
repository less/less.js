var path = require('path'),
    fs = require('fs'),
    sys = require('util');

var createTestRunnerPage = function(dir, exclude, testSuiteName) {
    var output = '<html><head>\n';

    fs.readdirSync(path.join("test", dir, 'less')).forEach(function (file) {
        if (! /\.less/.test(file)) { return; }
        
        var name = path.basename(file, '.less');
        
        if (exclude && name.match(exclude)) { return; }
        
        output += '<link id="original-less:' + (dir ? dir+'-' : "") +'less-'+name+'" rel="stylesheet/less" type="text/css" href="http://localhost:8081/' + path.join(dir, 'less', name) + '.less' +'">\n';
        output += '<link id="expected-less:' + (dir ? dir+'-' : "") +'less-'+name+'" rel="stylesheet"  type="text/css" href="http://localhost:8081/' + path.join(dir, 'css', name) + '.css' + '">\n';
    });

    output += String(fs.readFileSync(path.join('test/browser', 'template.htm'))).replace("{runner-name}", testSuiteName);

    fs.writeFileSync(path.join('test/browser', 'test-runner-'+testSuiteName+'.htm'), output);
};

createTestRunnerPage("", /javascript|urls/, "main");
createTestRunnerPage("browser", null, "browser");