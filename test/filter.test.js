var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/field');
require('../lib/carto/tree/dimension');
require('../lib/carto/tree/filter');

describe('Field', function() {
    describe('basic functionality', function() {
        it('should be constructed', function() {
            var f = new tree.Filter(new tree.Field('foo'), '=', new tree.Dimension(1));
            assert.ok(f);
        });
        it('can be evaluated', function() {
            var f = new tree.Filter(new tree.Field('foo'), '=', new tree.Dimension(1));
            f.eval({});
            assert.ok(f);
        });
        it('yields xml', function() {
            var f = new tree.Filter(new tree.Field('foo'), '=', new tree.Dimension(1));
            f.eval({});
            assert.equal(f.toXML({}), '[foo] = 1');
        });
    });
});
