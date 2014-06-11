var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/operation');
require('../lib/carto/tree/dimension');
require('../lib/carto/tree/color');
require('../lib/carto/tree/field');
require('../lib/carto/tree/literal');
require('../lib/carto/tree/quoted');

describe('Operation', function() {
    it('should work with percent', function() {
        var env = { ppi:72, error:function(err) { console.log(err.message); } };

        var o = new tree.Operation("+", [ new tree.Dimension(2), new tree.Dimension(10, "%") ]);
        assert.equal(o.ev(env).value, 2.2);
    });

    it('should work with units', function() {
        var env = { ppi:72, error:function(err) { console.log(err.message); } };

        var o = new tree.Operation("+", [ new tree.Dimension(2.54, 'cm'), new tree.Dimension(0.0254, 'm') ]);
        assert.equal(o.ev(env).value, 144);

        var o = new tree.Operation("+", [ new tree.Dimension(25.4, 'mm'), new tree.Dimension(72, 'pt') ]);
        assert.equal(o.ev(env).value, 144);

        var o = new tree.Operation("+", [ new tree.Dimension(72, 'pt'), new tree.Dimension(6, 'pc') ]);
        assert.equal(o.ev(env).value, 144);
    });

    it('should work with different ppi', function() {
        var env = { ppi:300, error:function(err) { console.log(err.message); } };

        var o = new tree.Operation("+", [ new tree.Dimension(2.54, 'cm'), new tree.Dimension(0.0254, 'm') ]);
        assert.equal(o.ev(env).value, 600);

        var o = new tree.Operation("+", [ new tree.Dimension(25.4, 'mm'), new tree.Dimension(72, 'pt') ]);
        assert.equal(o.ev(env).value, 600);

        var o = new tree.Operation("+", [ new tree.Dimension(72, 'pt'), new tree.Dimension(6, 'pc') ]);
        assert.equal(o.ev(env).value, 600);
    });


});
