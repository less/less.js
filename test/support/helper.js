var path = require('path'),
    _ = require('underscore'),
    fs = require('fs'),
    assert = require('assert'),
    crypto = require('crypto'),
    sax = require('sax'),
    diff = require('./diff').diff,
    constants = ((!process.ENOENT) >= 1) ?
        require('constants') :
        { ENOENT: process.ENOENT };

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
    fs.readFile(file, 'utf-8', function(err, content) {
        if (err) throw err;
        callback(content);
    });
};

exports.json = function(file, callback) {
    fs.readFile(file, 'utf-8', function(err, content) {
        if (err) throw err;
        callback(JSON.parse(content));
    });
};

exports.mml = function(file) {
    var mml = JSON.parse(fs.readFileSync(file, 'utf-8'));
    mml.Stylesheet = _(mml.Stylesheet).map(function(s) {
        return {
            id: s,
            data: fs.readFileSync(path.join(path.dirname(file), s), 'utf-8')
        };
    });
    return mml;
};

exports.mss = function(file) {
    return fs.readFileSync(file, 'utf-8');
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
            console.warn(helper.stylize('Failure', 'red')
                + ': ' + helper.stylize(originalFile, 'underline')
                + ' differs from expected result.');
            helper.showDifferences(e, helper.formatJSON);
            throw '';
        }
    });
};

exports.parseXML = function(xml, callback) {
    var parser = sax.parser(true);
    var i = 0;
    var tree = [ {} ];

    parser.onopentag = function(node) {
        if (!(node.name in tree[0])) tree[0][node.name] = [];
        node.attributes.__order__ = i++;
        tree[0][node.name].push(node.attributes);
        tree.unshift(node.attributes);
    };

    parser.onclosetag = function() {
        tree.shift();
        if (tree.length === 1) callback(tree[0]);
    };

    parser.ontext = parser.oncdata = function(text) {
        if (text.trim()) tree[0].text = (tree[0].text || '') + text;
    };

    parser.write(xml.toString());
};

exports.compareToXMLFile = function(filename, second, callback, processors) {
    helper.file(filename, function(first) {
        helper.parseXML(first, function(firstXML) {
            helper.parseXML(second, function(secondXML) {
                processors.forEach(function(processor) {
                    processor(secondXML);
                });

                try {
                    assert.deepEqual(secondXML, firstXML);
                    callback(null);
                } catch (err) {
                    callback(err);
                }
            });
        });
    });
};

exports.resultFile = function(file) {
    return path.join(path.dirname(file), path.basename(file).replace(/\.\w+$/, '.result'));
};


// Stylize a string
exports.stylize = function(str, style) {
    var styles = {
        'bold' : [1, 22],
        'inverse' : [7, 27],
        'underline' : [4, 24],
        'yellow' : [33, 39],
        'green' : [32, 39],
        'red' : [31, 39]
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
    } catch (err) {
        if (err.errno !== constants.ENOENT) throw err;
    }
};

exports.md5File = function(file, md5, context) {
    fs.readFile(file, 'binary', function(err, data) {
        var hash = crypto.createHash('md5').update(data).digest('hex');
        assert.equal(hash, md5);
        context.tests++;
    });
};

helper.removeErrorFilename = function(error) {
    error.forEach(function(e) {
        e.filename = '[absolute path]';
    });
    return error;
};

helper.removeAbsoluteImages = function(xml) {
    xml.Map.forEach(function(map) {
        if (map.Style) map.Style.forEach(function(style) {
            style.Rule.forEach(function(rule) {
                if (rule.PolygonPatternSymbolizer) {
                    rule.PolygonPatternSymbolizer.forEach(function(symbolizer) {
                        symbolizer.file = '[absolute path]';
                    });
                }
            });
        });
    });
};

helper.removeAbsoluteDatasources = function(xml) {
    xml.Map.forEach(function(map) {
        if (map.Layer) map.Layer.forEach(function(layer) {
            layer.Datasource.forEach(function(datasource) {
                datasource.Parameter.forEach(function(param) {
                    if (param.name === 'file') {
                        param.text = '[absolute path]';
                    }
                });
            });
        });
    });
};
