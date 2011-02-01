var assert = require('assert');
var tree = require('mess/tree');
require('mess/tree/filter');

exports['soundess for ='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '=', val: '2' }
    }), '=2 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '=', val: '3' }
    }), 'NOT =2 =3');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '3' },
        'b': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT =3 =2');

    // !=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '3' }
    }), '=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '3' },
        'b': { key: 'TOTAL', op: '=', val: '2' }
    }), '!=3 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), 'NOT =2 !=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT !=2 =2');

    // >
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '1' }
    }), '=2 >1');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op: '>', val: '1' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), '>1 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '3' }
    }), 'NOT =2 >3');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op: '>', val: '3' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT >3 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), 'NOT =2 >2');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op: '>', val: '2' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT >2 =2');


    // >=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '1' }
    }), '=2 >=1');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op: '>=', val: '1' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), '>=1 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '3' }
    }), 'NOT =2 >=3');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op: '>=', val: '3' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT >=3 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '=2 >=2');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op: '>=', val: '2' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), '>=2 =2');


    // <
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '1' }
    }), 'NOT =2 <1');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op: '<', val: '1' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT <1 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '3' }
    }), '=2 <3');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op: '<', val: '3' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), '<3 =2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), 'NOT =2 <2');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op: '<', val: '2' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT <2 =2');

    // <=
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '1' }
    }), 'NOT =2 <=1');
    assert.ok(!tree.Filter.sound({
        'b': { key: 'TOTAL', op: '<=', val: '1' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), 'NOT <=1 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '3' }
    }), '=2 <=3');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op: '<=', val: '3' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), '<=3 =2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '=2 <=2');
    assert.ok(tree.Filter.sound({
        'b': { key: 'TOTAL', op: '<=', val: '2' },
        'a': { key: 'TOTAL', op: '=', val: '2' }
    }), '<=2 =2');
}

exports['soundness for !='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '!=2 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '3' }
    }), '!=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '!=3 !=2');

    // >
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '3' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '!=3 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '3' }
    }), '>2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '3' }
    }), '!=2 >3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '>3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '!=2 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '>2 !=2');


    // >=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '3' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '!=3 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '3' }
    }), '>=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '3' }
    }), '!=2 >=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '>=3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '!=2 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '>=2 !=2');



    // <
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '3' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), '!=3 <2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '3' }
    }), '<2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '3' }
    }), '!=2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '<3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), '!=2 <2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '<2 !=2');


    // <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '3' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '!=3 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '!=', val: '3' }
    }), '<=2 !=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '3' }
    }), '!=2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '<=3 !=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '!=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '!=2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '3' },
        'b': { key: 'TOTAL', op: '!=', val: '2' }
    }), '<=2 !=2');
};

exports['test soundness for >'] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '>2 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '3' }
    }), '>2 >3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '3' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '>3 >2');


    // >=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '>2 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '>=2 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '3' }
    }), '>2 >=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '3' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '>=3 >2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '1' }
    }), '>2 >=1');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '1' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '>=1 >2');


    // <
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '3' }
    }), '>2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '3' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '<3 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '1' }
    }), 'NOT >2 <1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '1' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), 'NOT <1 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), 'NOT >2 <2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), 'NOT <2 >2');

    // <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '3' }
    }), '>2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '3' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), '<=3 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '1' }
    }), 'NOT >2 <=1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '1' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), 'NOT <=1 >2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), 'NOT >2 <=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '>', val: '2' }
    }), 'NOT <=2 >2');
};

exports['test soundness for >='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '>=2 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '3' }
    }), '>=2 >=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '3' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '>=3 >=2');

    // <
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '3' }
    }), '>=2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '3' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '<3 >=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '1' }
    }), 'NOT >=2 <1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '1' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), 'NOT <1 >=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), 'NOT >=2 <2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), 'NOT <2 >=2');

    // <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '3' }
    }), '>=2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '3' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '<=3 >=2');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '1' }
    }), 'NOT >=2 <=1');
    assert.ok(!tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '1' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), 'NOT <=1 >=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '>=2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '>=', val: '2' }
    }), '<=2 >=2');
};


exports['test soundness for <'] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), '<2 <2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '3' }
    }), '<2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '3' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), '<3 <2');

    //  <=
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '3' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '<3 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '3' }
    }), '<=2 <3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '1' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '<1 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '1' }
    }), '<=2 <1');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '<2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '<', val: '2' }
    }), '<=2 <2');
};

exports['test soundness for <='] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '<=2 <=2');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '2' },
        'b': { key: 'TOTAL', op: '<=', val: '3' }
    }), '<=2 <=3');
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '<=', val: '3' },
        'b': { key: 'TOTAL', op: '<=', val: '2' }
    }), '<=3 <=2');
};

exports['test soundness for large number strings'] = function() {
    assert.ok(tree.Filter.sound({
        'a': { key: 'TOTAL', op: '>', val: '69457.4' },
        'b': { key: 'TOTAL', op: '<', val: '104184.6' }
    }), '>69457.5 <104184.6');
}
