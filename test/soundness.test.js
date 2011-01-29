var assert = require('assert');
var tree = require('mess/tree');
require('mess/tree/filter');

var eq = { value: '=' };
var ne = { value: '!=' };
var gt = { value: '>' };
var gte = { value: '>=' };
var lt = { value: '<' };
var lte = { value: '<=' };


exports['soundess for ='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:eq, val: '2' }
    }), '=2 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:eq, val: '3' }
    }), 'NOT =2 =3');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '3' },
        'b': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT =3 =2');

    // !=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '3' }
    }), '=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '3' },
        'b': { key: 'TOTAL', op:eq, val: '2' }
    }), '!=3 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), 'NOT =2 !=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT !=2 =2');

    // >
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '1' }
    }), '=2 >1');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op:gt, val: '1' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), '>1 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '3' }
    }), 'NOT =2 >3');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op:gt, val: '3' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT >3 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), 'NOT =2 >2');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op:gt, val: '2' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT >2 =2');


    // >=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '1' }
    }), '=2 >=1');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op:gte, val: '1' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), '>=1 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '3' }
    }), 'NOT =2 >=3');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op:gte, val: '3' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT >=3 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '=2 >=2');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op:gte, val: '2' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), '>=2 =2');


    // <
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '1' }
    }), 'NOT =2 <1');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op:lt, val: '1' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT <1 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '3' }
    }), '=2 <3');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op:lt, val: '3' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), '<3 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), 'NOT =2 <2');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op:lt, val: '2' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT <2 =2');

    // <=
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '1' }
    }), 'NOT =2 <=1');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op:lte, val: '1' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), 'NOT <=1 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '3' }
    }), '=2 <=3');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op:lte, val: '3' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), '<=3 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:eq, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '=2 <=2');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op:lte, val: '2' },
        'a': { key: 'TOTAL', op:eq, val: '2' }
    }), '<=2 =2');
}

exports['soundness for !='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '!=2 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '3' }
    }), '!=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '!=3 !=2');

    // >
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '3' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '!=3 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '3' }
    }), '>2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '3' }
    }), '!=2 >3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '>3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '!=2 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '>2 !=2');


    // >=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '3' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '!=3 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '3' }
    }), '>=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '3' }
    }), '!=2 >=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '>=3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '!=2 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '>=2 !=2');



    // <
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '3' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), '!=3 <2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '3' }
    }), '<2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '3' }
    }), '!=2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '<3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), '!=2 <2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '<2 !=2');


    // <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '3' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '!=3 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:ne, val: '3' }
    }), '<=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '3' }
    }), '!=2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '<=3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:ne, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '!=2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '3' },
        'b': { key: 'TOTAL', op:ne, val: '2' }
    }), '<=2 !=2');
};

exports['test soundness for >'] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '>2 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '3' }
    }), '>2 >3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '3' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '>3 >2');


    // >=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '>2 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '>=2 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '3' }
    }), '>2 >=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '3' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '>=3 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '1' }
    }), '>2 >=1');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '1' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '>=1 >2');


    // <
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '3' }
    }), '>2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '3' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '<3 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '1' }
    }), 'NOT >2 <1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '1' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), 'NOT <1 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), 'NOT >2 <2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), 'NOT <2 >2');

    // <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '3' }
    }), '>2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '3' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), '<=3 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '1' }
    }), 'NOT >2 <=1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '1' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), 'NOT <=1 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:gt, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), 'NOT >2 <=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:gt, val: '2' }
    }), 'NOT <=2 >2');
};

exports['test soundness for >='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '>=2 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '3' }
    }), '>=2 >=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '3' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '>=3 >=2');

    // <
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '3' }
    }), '>=2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '3' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '<3 >=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '1' }
    }), 'NOT >=2 <1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '1' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), 'NOT <1 >=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), 'NOT >=2 <2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), 'NOT <2 >=2');

    // <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '3' }
    }), '>=2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '3' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '<=3 >=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '1' }
    }), 'NOT >=2 <=1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '1' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), 'NOT <=1 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:gte, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '>=2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:gte, val: '2' }
    }), '<=2 >=2');
};


exports['test soundness for <'] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), '<2 <2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '3' }
    }), '<2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '3' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), '<3 <2');

    //  <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '3' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '<3 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '3' }
    }), '<=2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '1' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '<1 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '1' }
    }), '<=2 <1');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lt, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '<2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:lt, val: '2' }
    }), '<=2 <2');
};

exports['test soundness for <='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '<=2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '2' },
        'b': { key: 'TOTAL', op:lte, val: '3' }
    }), '<=2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op:lte, val: '3' },
        'b': { key: 'TOTAL', op:lte, val: '2' }
    }), '<=3 <=2');
} ;
