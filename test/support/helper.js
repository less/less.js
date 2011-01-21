var path = require('path'),
    fs = require('fs'),
    diff = require('./diff').diff;

var helper = exports;

exports.files = function(dir, extension, callback) {
    var dir = path.join(__dirname, '..', dir);
    extension = new RegExp('\\.' + extension + '$');
    fs.readdirSync(dir).forEach(function(filename) {
        if (extension.test(filename)) {
            callback(filename);
        }
    });
};

exports.json = function(file, callback) {
    fs.readFile(file, 'utf-8', function(err, content) {
        if (err) throw err;
        callback(JSON.parse(content));
    });
};

exports.showDifferences = function(e) {
    var changes = diff(
        helper.formatJSON(e.actual),
        helper.formatJSON(e.expected)
    );
    
    console.log(helper.stylize('actual:', 'bold') + '\n' + changes.del);
    console.log(helper.stylize('expected:', 'bold') + '\n' + changes.ins);
};


exports.formatJSON = function(arr) {
    return '[\n    ' + arr.map(function(t) {
        return JSON.stringify(t);
    }).join(',\n    ') + '\n]';
};




// Stylize a string
exports.stylize = function(str, style) {
    var styles = {
        'bold'      : [1,  22],
        'inverse'   : [7,  27],
        'underline' : [4,  24],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
}
