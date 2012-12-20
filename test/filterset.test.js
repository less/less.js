var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/filterset');

describe('Filtersets', function() {
    describe('basic functionality', function() {
        it('should be constructed', function() {
            var f = new tree.Filterset();
            assert.ok(f);
            assert.ok(f.filters);
        });
        it('yields xml', function() {
            var f = new tree.Filterset();
            assert.equal(f.toXML({}), '');
        });
        it('yields a clone', function() {
            var f = new tree.Filterset();
            assert.ok(f.clone() instanceof tree.Filterset);
        });
    });

    describe('should add filters correctly', function() {
        it('adding to empty set', function() {
            var f = new tree.Filterset();
            assert.ok(true === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '=11');
            assert.ok(true === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '!=90');
            assert.ok(true === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '>9');
            assert.ok(true === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '>=9');
            assert.ok(true === f.addable({ key: 'TOTAL', op: '<',  val:  90  }), '<90');
            assert.ok(true === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '<=90');
        });

        it('adding to set with one and same key', function() {
            var f = new tree.Filterset();
            f.add({ key: 'TOTAL', op: '=', val: '11' });
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '=11 =11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '=11 !=90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>',  val:  '9'  }), '=11 >9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>=', val:  '9'  }), '=11 >=9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<', val:   '90'  }), '=11 <90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  '90'  }), '=11 <=90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '90' }), '=11 =90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '!=',  val: '11' }), '=11 !=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '=11 >90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '=11 >=90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<', val:   9  }), '=11 <9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '=11 <=9');
        });

        it('adding to set with one and same key and !=', function() {
            var f = new tree.Filterset();
            f.add({ key: 'TOTAL', op: '!=', val: '11' });
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '!=11 =11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=',  val: '11' }), '!=11 !=11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '9' }), '!=11 !=9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '!=11 !=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '!=11 >9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '!=11 >=9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '!=11 >90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '!=11 >=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<', val:   9  }), '!=11 <9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '!=11 <=9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<', val:   90  }), '!=11 <90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '!=11 <=90');
        });

        it('adding to set with one and same key and >', function() {
            var f = new tree.Filterset();
            f.add({ key: 'TOTAL', op: '>', val: 11 });
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '>11 =11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '11' }), '>11 !=11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>',  val:  11  }), '>11 >11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>=', val:  11  }), '>11 >=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<',  val:  11  }), '>11 <11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<=', val:  11  }), '>11 <=11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '90' }), '>11 =90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '>11 !=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '>11 >90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '>11 >=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<',  val:  90  }), '>11 <90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '>11 <=90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '9' }), '>11 =9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '9' }), '>11 !=9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '>11 >9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '>11 >=9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<',  val:  9  }), '>11 <9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '>11 <=9');
        });

        it('adding to set with one and same key and >=', function() {
            var f = new tree.Filterset();
            f.add({ key: 'TOTAL', op: '>=', val: 11 });
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '>=11 =11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '11' }), '>=11 !=11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>',  val:  11  }), '>=11 >11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>=', val:  11  }), '>=11 >=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<',  val:  11  }), '>=11 <11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<=', val:  11  }), '>=11 <=11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '90' }), '>=11 =90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '>=11 !=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '>=11 >90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '>=11 >=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<',  val:  90  }), '>=11 <90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '>=11 <=90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '9' }), '>=11 =9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '9' }), '>=11 !=9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '>=11 >9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '>=11 >=9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<',  val:  9  }), '>=11 <9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '>=11 <=9');
        });

        it('adding to set with one and same key and <', function() {
            var f = new tree.Filterset();
            f.add({ key: 'TOTAL', op: '<', val: 11 });
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '<11 =11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '11' }), '<11 !=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  11  }), '<11 >11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>=', val:  11  }), '<11 >=11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<',  val:  11  }), '<11 <11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  11  }), '<11 <=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '90' }), '<11 =90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '<11 !=90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '<11 >90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '<11 >=90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<',  val:  90  }), '<11 <90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '<11 <=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '9' }), '<11 =9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '9' }), '<11 !=9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '<11 >9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '<11 >=9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<',  val:  9  }), '<11 <9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '<11 <=9');
        });

        it('adding to set with one and same key and <=', function() {
            var f = new tree.Filterset();
            f.add({ key: 'TOTAL', op: '<=', val: 11 });
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '<=11 =11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '11' }), '<=11 !=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  11  }), '<=11 >11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  11  }), '<=11 >=11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<',  val:  11  }), '<=11 <11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  11  }), '<=11 <=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '90' }), '<=11 =90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '<=11 !=90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '<=11 >90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '<=11 >=90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<',  val:  90  }), '<=11 <90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '<=11 <=90');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '9' }), '<=11 =9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '9' }), '<=11 !=9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '<=11 >9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '<=11 >=9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<',  val:  9  }), '<=11 <9');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '<=11 <=9');
        });

        it('adding to filterset with three filters', function() {
            var f = new tree.Filterset();
            f.add({ key: 'TOTAL', op: '<=', val: 11 });
            f.add({ key: 'TOTAL', op: '>',  val: 9 });
            f.add({ key: 'TOTAL', op: '!=',  val: '10' });
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '10' }), '<=11 >9 !=10 =10');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '10.5' }), '<=11 >9 !=10 =10.5');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '9' }), '<=11 >9 !=10 =9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '8' }), '<=11 >9 !=10 =8');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '<=11 >9 !=10 =11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '10' }), '<=11 >9 !=10 !=10');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '10.5' }), '<=11 >9 !=10 !=10.5');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '9' }), '<=11 >9 !=10 !=9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '8' }), '<=11 >9 !=10 !=8');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '!=', val: '11' }), '<=11 >9 !=10 !=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  11  }), '<=11 >9 !=10 >11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '>=', val:  11  }), '<=11 >9 !=10 >=11');
            assert.ok(true  === f.addable({ key: 'TOTAL', op: '<',  val:  11  }), '<=11 >9 !=10 <11');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  11  }), '<=11 >9 !=10 <=11');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '<=11 >9 !=10 >90');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '<=11 >9 !=10 >=90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<',  val:  90  }), '<=11 >9 !=10 <90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '<=11 >9 !=10 <=90');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '<=11 >9 !=10 >9');
            assert.ok(null  === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '<=11 >9 !=10 >=9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<',  val:  9  }), '<=11 >9 !=10 <9');
            assert.ok(false === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '<=11 >9 !=10 <=9');
        });
    });


    it('should add filtersets', function() {
        var f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '=',  val: '11' });
        assert.deepEqual(f.filters, { 'TOTAL=':   { key: 'TOTAL', op: '=',  val: '11' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '4' });
        assert.deepEqual(f.filters, { 'TOTAL!=4': { key: 'TOTAL', op: '!=', val: '4' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '>', val: '4' });
        assert.deepEqual(f.filters, { 'TOTAL>':   { key: 'TOTAL', op: '>', val: '4' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '>=', val: '4' });
        assert.deepEqual(f.filters, { 'TOTAL>=':  { key: 'TOTAL', op: '>=', val: '4' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '<', val: '4' });
        assert.deepEqual(f.filters, { 'TOTAL<':   { key: 'TOTAL', op: '<', val: '4' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '<=', val: '4' });
        assert.deepEqual(f.filters, { 'TOTAL<=':  { key: 'TOTAL', op: '<=', val: '4' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '!=', val: '9' });
        assert.deepEqual(f.filters, { 'TOTAL!=9': { key: 'TOTAL', op: '!=', val: '9' }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '>',  val:  9  });
        assert.deepEqual(f.filters, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  9  }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '>',  val:  11 });
        assert.deepEqual(f.filters, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  11 }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '>',  val:  90 });
        assert.deepEqual(f.filters, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  90 }});
        
        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '>=', val:  9  });
        assert.deepEqual(f.filters, { 'TOTAL>=':  { key: 'TOTAL', op: '>=', val:  9  }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '>=',  val:  11 });
        assert.deepEqual(f.filters, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  11 }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '>=', val:  90 });
        assert.deepEqual(f.filters, { 'TOTAL>=':  { key: 'TOTAL', op: '>=', val:  90 }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '<',  val:  9  });
        assert.deepEqual(f.filters, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  9  }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '<',  val:  11 });
        assert.deepEqual(f.filters, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  11 }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '<',  val:  90 });
        assert.deepEqual(f.filters, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  90 }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '<=', val:  9  });
        assert.deepEqual(f.filters, { 'TOTAL<=':  { key: 'TOTAL', op: '<=', val:  9  }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '<=', val:  11 });
        assert.deepEqual(f.filters, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  11 }});

        f = new tree.Filterset();
        f.add({ key: 'TOTAL', op: '!=', val: '11' });
        f.add({ key: 'TOTAL', op: '<=', val:  90 });
        assert.deepEqual(f.filters, { 'TOTAL<=':  { key: 'TOTAL', op: '<=', val:  90 }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});
    });
});
