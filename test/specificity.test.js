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
        for (var id in value.filters) arr.push(id + value.filters[id].val);
        if (arr.length) return arr;
    }
    else if (key === 'attachment' && value === '__default__') return;
    else if (key === 'zoom') {
        if (value != tree.Zoom.all) return (new tree.Zoom()).setZoom(value).toString();
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
            var json = JSON.parse(fs.readFileSync(helper.resultFile(file)));
            var actual = file.replace(path.extname(file),'') + '-actual.json';
            var expected = file.replace(path.extname(file),'') + '-expected.json';
            try {
              assert.deepEqual(mss, json);
              // cleanup any actual renders that no longer fail
              try {
                fs.unlinkSync(actual);
                fs.unlinkSync(expected);
              } catch (err) {}
            } catch (err) {
                fs.writeFileSync(actual,JSON.stringify(mss,null,4));
                fs.writeFileSync(expected,JSON.stringify(json,null,4));
                throw new Error('failed: ' + actual + ' not equal to expected: ' + expected);
            }
            done();
        });
    });
});
});
