var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/comment');

describe('Comment', function() {
    describe('basic functionality', function() {
        it('should be constructed', function() {
            var f = new tree.Comment('hello world');
            assert.deepEqual(f.toString(), '<!--hello world-->');
            assert.deepEqual(f.ev(), f);
            assert.ok(f);
        });
    });
});
