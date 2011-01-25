var path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    crypto = require('crypto'),
    diff = require('./diff').diff;

var helper = exports;

exports.files = function(dir, extension, callback) {
    var dir = path.join(__dirname, '..', dir);
    extension = new RegExp('\\.' + extension + '$');
    fs.readdirSync(dir).forEach(function(filename) {
        if (extension.test(filename)) {
            callback(path.join(dir, filename));
        }
    });
};

exports.file = function(file, callback) {
    fs.readFile(file, 'utf-8', function (err, content) {
        if (err) throw err;
        callback(content);
    });
}

exports.json = function(file, callback) {
    fs.readFile(file, 'utf-8', function(err, content) {
        if (err) throw err;
        callback(JSON.parse(content));
    });
};

exports.showDifferences = function(e, format) {
    var changes = diff(
        (format || JSON.stringify)(e.actual),
        (format || JSON.stringify)(e.expected)
    );
    
    console.warn(helper.stylize('actual:', 'bold') + '\n' + changes.del);
    console.warn(helper.stylize('expected:', 'bold') + '\n' + changes.ins);
};

exports.formatJSON = function(arr) {
    return '[\n    ' + arr.map(function(t) {
        return JSON.stringify(t);
    }).join(',\n    ') + '\n]';
};

exports.makePlain = function(obj, fn) {
    return JSON.parse(JSON.stringify(obj, fn));
};

exports.compareToFile = function(value, originalFile, resultFile) {
    helper.json(resultFile, function(json) {
        try {
            assert.deepEqual(value, json);
        } catch (e) {
            console.warn(helper.stylize("Failure", 'red') + ': ' + helper.stylize(originalFile, 'underline') + ' differs from expected result.');
            helper.showDifferences(e, helper.formatJSON);
            throw '';
        }
    });
};

exports.resultFile = function(file) {
    return path.join(path.dirname(file), path.basename(file).replace(/\.\w+$/, '.result'));
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
};


exports.isDirectory = function(dir, context) {
    fs.stat(dir, function(err, stats) {
        if (err) throw err;
        assert.ok(stats.isDirectory());
        context.tests++;
    });
};

exports.isFile = function(file, context) {
    fs.stat(file, function(err, stats) {
        if (err) throw err;
        assert.ok(stats.isFile());
        context.tests++;
    });
};

exports.rmrf = function rmrf(p) {
    try {
        if (fs.statSync(p).isDirectory()) {
            fs.readdirSync(p).forEach(function(file) { rmrf(path.join(p, file)); });
            fs.rmdirSync(p);
        }
        else fs.unlinkSync(p);
    } catch(err) {
        if (err.errno !== process.ENOENT) throw err;
    }
};

exports.md5File = function(file, md5, context) {
    fs.readFile(file, 'binary', function(err, data) {
        var hash = crypto.createHash('md5').update(data).digest('hex');
        assert.equal(hash, md5);
        context.tests++;
    });
}