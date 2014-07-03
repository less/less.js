var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/color');

describe('Color', function() {
    describe('basic functionality', function() {
        it('should be constructed', function() {
            var f = new tree.Color([0, 0, 0], 1);
            assert.deepEqual(f.toHSL(), {"h":0,"s":0,"l":0,"a":1});
            assert.ok(f);
        });
    });
});
