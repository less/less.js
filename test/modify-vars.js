var less = require('../lib/less'),
    fs = require('fs');

var input = fs.readFileSync("./test/less/modifyVars/extended.less", 'utf8');
var expectedCss = fs.readFileSync('./test/css/modifyVars/extended.css', 'utf8');
var options = {
    modifyVars: JSON.parse(fs.readFileSync("./test/less/modifyVars/extended.json", 'utf8'))
};

less.render(input, options).then(function(result) {
    if (result.css === expectedCss) {
        console.log("PASS");
    } else {
        console.log("FAIL");
    }
}).catch(function(err) {
    console.log(err);
});
