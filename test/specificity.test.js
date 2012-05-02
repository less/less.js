var path = require('path'),
    assert = require('assert'),
    fs = require('fs');

var carto = require('../lib/carto');
var tree = require('../lib/carto').tree;
var helper = require('./support/helper');

function cleanupItem(key, value) {
    if (key === 'rules') return;
    else if (key === 'ruleIndex') return;
    else if (key === 'elements') return value.map(function(item) { return item.value; });
    else if (key === 'filters') {
        var arr = [];
        for (var id in value) arr.push(id + value[id].val);
        if (arr.length) return arr;
    }
    else if (key === 'attachment' && value === '__default__') return;
    else if (key === 'zoom') {
        if (value != tree.Zoom.all) return tree.Zoom.toString(value);
    }
    else return value;
}

describe('Specificity', function() {
helper.files('specificity', 'mss', function(file) {
    it('should handle spec correctly in ' + file, function(done) {
        helper.file(file, function(content) {
            var tree = (new carto.Parser({
                paths: [ path.dirname(file) ],
                filename: file
            })).parse(content);

            var mss = tree.toList({});
            mss = helper.makePlain(mss, cleanupItem);

            helper.compareToFile(mss, file, helper.resultFile(file));
            done();
        });
    });
});
});
