var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    fs = require('fs');

var mess = require('mess');
var tree = require('mess/tree');
var helper = require('./support/helper');

function cleanupItem(item) {
    // Remove indexes; we don't care about the exact byte number.
    delete item.selector.index;
    for (var i = 0; i < item.selector.filters.length; i++) {
        delete item.selector.filters[i].index;
    }
    // Also flatten the elements array a bit, we only care about
    // the actual selector.
    item.selector.elements = item.selector.elements.map(function(el) {
        return el.value;
    });
    return item.selector.filters.length ? item.selector : item.selector.elements;
}

helper.files('specificity', 'mss', function(file) {
    exports['test ' + file] = function(beforeExit) {
        helper.file(file, function(content) {
            new mess.Parser({
                paths: [ path.dirname(file) ],
                filename: file
            }).parse(content, function (err, tree) {
                if (err) throw err;
                
                var mss = tree.toList();
                mss = mss.map(cleanupItem);
                mss = helper.makePlain(mss);
                
                helper.compareToFile(mss, file, helper.resultFile(file));
            });
        });
    }
});
