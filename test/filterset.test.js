var assert = require('assert');
var tree = require('../lib/carto/tree.js');
require('../lib/carto/tree/filterset');

exports['test filterset addable'] = function() {
    var f = new tree.Filterset;
    assert.ok(true === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '=11');
    assert.ok(true === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '!=90');
    assert.ok(true === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '>9');
    assert.ok(true === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '>=9');
    assert.ok(true === f.addable({ key: 'TOTAL', op: '<',  val:  90  }), '<90');
    assert.ok(true === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '<=90');

    var f = new tree.Filterset;
    f.add({ key: 'TOTAL', op: '=', val: '11' });
    assert.ok(null  === f.addable({ key: 'TOTAL', op: '=',  val: '11' }), '=11 =11');
    assert.ok(null  === f.addable({ key: 'TOTAL', op: '!=', val: '90' }), '=11 !=90');
    assert.ok(null  === f.addable({ key: 'TOTAL', op: '>',  val:  9  }), '=11 >9');
    assert.ok(null  === f.addable({ key: 'TOTAL', op: '>=', val:  9  }), '=11 >=9');
    assert.ok(null  === f.addable({ key: 'TOTAL', op: '<', val:   90  }), '=11 <90');
    assert.ok(null  === f.addable({ key: 'TOTAL', op: '<=', val:  90  }), '=11 <=90');
    assert.ok(false === f.addable({ key: 'TOTAL', op: '=',  val: '90' }), '=11 =90');
    assert.ok(false === f.addable({ key: 'TOTAL', op: '!=',  val: '11' }), '=11 !=11');
    assert.ok(false === f.addable({ key: 'TOTAL', op: '>',  val:  90  }), '=11 >90');
    assert.ok(false === f.addable({ key: 'TOTAL', op: '>=', val:  90  }), '=11 >=90');
    assert.ok(false === f.addable({ key: 'TOTAL', op: '<', val:   9  }), '=11 <9');
    assert.ok(false === f.addable({ key: 'TOTAL', op: '<=', val:  9  }), '=11 <=9');

    var f = new tree.Filterset;
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

    var f = new tree.Filterset;
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

    var f = new tree.Filterset;
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

    var f = new tree.Filterset;
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

    var f = new tree.Filterset;
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

    var f = new tree.Filterset;
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
};


exports['test filterset add'] = function() {
    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '=',  val: '11' });
    assert.deepEqual(f, { 'TOTAL=':   { key: 'TOTAL', op: '=',  val: '11' }});
    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '4' });
    assert.deepEqual(f, { 'TOTAL!=4': { key: 'TOTAL', op: '!=', val: '4' }});
    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '>', val: '4' });
    assert.deepEqual(f, { 'TOTAL>':   { key: 'TOTAL', op: '>', val: '4' }});
    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '>=', val: '4' });
    assert.deepEqual(f, { 'TOTAL>=':  { key: 'TOTAL', op: '>=', val: '4' }});
    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '<', val: '4' });
    assert.deepEqual(f, { 'TOTAL<':   { key: 'TOTAL', op: '<', val: '4' }});
    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '<=', val: '4' });
    assert.deepEqual(f, { 'TOTAL<=':  { key: 'TOTAL', op: '<=', val: '4' }});


    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '!=', val: '9' });
    assert.deepEqual(f, { 'TOTAL!=9': { key: 'TOTAL', op: '!=', val: '9' }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '>',  val:  9  });
    assert.deepEqual(f, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  9  }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '>',  val:  11 });
    assert.deepEqual(f, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  11 }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '>',  val:  90 });
    assert.deepEqual(f, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  90 }});
    
    
    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '>=', val:  9  });
    assert.deepEqual(f, { 'TOTAL>=':  { key: 'TOTAL', op: '>=', val:  9  }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '>=',  val:  11 });
    assert.deepEqual(f, { 'TOTAL>':   { key: 'TOTAL', op: '>',  val:  11 }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '>=', val:  90 });
    assert.deepEqual(f, { 'TOTAL>=':  { key: 'TOTAL', op: '>=', val:  90 }});


    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '<',  val:  9  });
    assert.deepEqual(f, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  9  }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '<',  val:  11 });
    assert.deepEqual(f, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  11 }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '<',  val:  90 });
    assert.deepEqual(f, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  90 }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});


    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '<=', val:  9  });
    assert.deepEqual(f, { 'TOTAL<=':  { key: 'TOTAL', op: '<=', val:  9  }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '<=', val:  11 });
    assert.deepEqual(f, { 'TOTAL<':   { key: 'TOTAL', op: '<',  val:  11 }});

    var f = new tree.Filterset; f.add({ key: 'TOTAL', op: '!=', val: '11' });
                                f.add({ key: 'TOTAL', op: '<=', val:  90 });
    assert.deepEqual(f, { 'TOTAL<=':  { key: 'TOTAL', op: '<=', val:  90 }, 'TOTAL!=11': { key: 'TOTAL', op: '!=', val: '11' }});


    // TODO: some more adding tests.
};
