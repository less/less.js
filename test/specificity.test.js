var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    fs = require('fs');

var mess = require('mess');
var tree = require('mess/tree');
var helper = require('./support/helper');

function cleanupItem(key, value) {
    if (!key) return value.map(function(item) { return item.selector });
    else if (key === 'elements') return value.map(function(item) { return item.value; });
    else if (key === 'filters') {
        if (Object.keys(value).length) return Object.keys(value);
    }
    else if (key === 'attachment' && value === '__default__') return undefined;
    else if (key === 'index') return undefined;
    else if (key === 'zoom') {
        if (value == tree.Zoom.all) return undefined;
        else return tree.Zoom.toString(value);
    }
    else if (key === 'op') return value.value;
    else if (key === 'val') return value.value;
    else if (key === 'conditions' && value == 0) return void null;
    else return value;
}

helper.files('specificity', 'mss', function(file) {
    exports['test ' + file] = function(beforeExit) {
        helper.file(file, function(content) {
            new mess.Parser({
                paths: [ path.dirname(file) ],
                filename: file
            }).parse(content, function (err, tree) {
                if (err) throw err;

                var mss = tree.toList({});
                mss = helper.makePlain(mss, cleanupItem);

                helper.compareToFile(mss, file, helper.resultFile(file));
            });
        });
    }
});
