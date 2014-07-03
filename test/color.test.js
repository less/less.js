var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/functions');
require('../lib/carto/tree/color');
require('../lib/carto/tree/dimension');

describe('Color', function() {
    describe('basic functionality', function() {
        it('should be constructed', function() {
            var f = new tree.Color([0, 0, 0], 1);
            assert.deepEqual(f.toHSL(), {"h":0,"s":0,"l":0,"a":1});
            assert.ok(f);
        });
    });
    describe('functions', function() {
        it('should be constructed', function() {
            assert.deepEqual(tree.functions.rgb(0, 0, 0), new tree.Color([0, 0, 0], 1));
            assert.deepEqual(tree.functions.hue(new tree.Color([0, 0, 0], 1)), new tree.Dimension(0));
            assert.deepEqual(tree.functions.saturation(new tree.Color([0, 0, 0], 1)), new tree.Dimension(0, '%'));
            assert.deepEqual(tree.functions.lightness(new tree.Color([0, 0, 0], 1)), new tree.Dimension(0, '%'));
            assert.deepEqual(tree.functions.alpha(new tree.Color([0, 0, 0], 1)), new tree.Dimension(1));
            assert.deepEqual(tree.functions.greyscale(new tree.Color([0, 0, 0], 1)), new tree.Color([0, 0, 0], 1));
        });
    });
});
