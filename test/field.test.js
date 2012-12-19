var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/field');

describe('Field', function() {
    describe('basic functionality', function() {
        it('should be constructed', function() {
            var f = new tree.Field("foo");
            assert.ok(f);
            assert.equal(f.is, 'field');
        });
        it('should produce xml-friendly output', function() {
            var f = new tree.Field("bar");
            assert.ok(f);
            assert.equal(f.toString(), "[bar]");
        });
    });
});
