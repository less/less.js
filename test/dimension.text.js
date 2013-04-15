var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/dimension');

describe('Dimension', function() {
    it('should support percentages', function() {
        assert.equal((new tree.Dimension(2, '%')).ev({}).value, 0.02);
        assert.equal((new tree.Dimension(20, '%')).ev({}).value, 0.20);
        assert.equal((new tree.Dimension(100, '%')).ev({}).value, 1);
        assert.equal((new tree.Dimension(0, '%')).ev({}).value, 0);
    });
});
