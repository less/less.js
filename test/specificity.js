var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    fs = require('fs');

var mess = require('mess');
var tree = require('mess/tree');
var helper = require('./support/helper');

helper.files('specificity', 'mss', function(filename) {
    var testName = 'test specificity/' + filename;
    exports[testName] = function(beforeExit) {
        var file = path.join(__dirname, 'specificity', filename);
        fs.readFile(file, 'utf-8', function (err, content) {
            if (err) throw err;

            new(mess.Parser)({
                paths: [ path.dirname(file) ],
                filename: file
            }).parse(content, function (err, tree) {
                if (err) {
                    console.log(err);
                    assert.ok(false);
                } else {
                    var mss = tree.toMSS();
                    mss = mss.map(function (item) {
                        // Remove indexes; we don't care about the exact byte number.
                        delete item.selector.index;
                        for (var i = 0; i < item.selector.filters.length; i++) {
                            delete item.selector.filters[i].index;
                        }
                        item.selector.elements = item.selector.elements.map(function(el) {
                            return el.value;
                        });
                        return item.selector.filters.length ? item.selector : item.selector.elements;
                    });

                    // Make sure objects are plain objects.
                    mss = JSON.parse(JSON.stringify(mss));

                    var resultFile = path.join(path.dirname(file), path.basename(file, '.mss') + '.result');
                    helper.json(resultFile, function(json) {

                        try {
                            assert.deepEqual(mss, json);
                        } catch (e) {
                            console.log(helper.stylize("Failure", 'red') + ': ' + helper.stylize(file, 'underline') + ' differs from expected result.');
                            console.log(helper.stylize('actual:', 'bold') + '\n' + formatJSON(e.actual));
                            console.log(helper.stylize('expected:', 'bold') + '\n' + formatJSON(e.expected));
                            throw '';
                        }
                    });
                }
            });
        });
    }
});


function formatJSON(arr) {
    return '[\n    ' + arr.map(function(t) {
        return JSON.stringify(t);
    }).join(',\n    ') + '\n]';
}
