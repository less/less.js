var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/quoted');

describe('Quoted', function() {
    describe('basic functionality', function() {
        it('should be constructed', function() {
            var f = new tree.Quoted("Tom's & \"<quoted>\"");
            assert.ok(f);
            assert.equal(f.is, 'string');
        });
        it('should produce normal output', function() {
            var f = new tree.Quoted("Tom's & \"<quoted>\"");
            assert.ok(f);
            assert.equal(f.toString(), "Tom's &amp; \"<quoted>\"");
        });
        it('should produce xml-friendly output', function() {
            var f = new tree.Quoted("Tom's & \"<quoted>\"");
            assert.ok(f);
            assert.equal(f.toString(true), "'Tom\\'s &amp; &quot;&lt;quoted&gt;&quot;'");
        });
    });
});
