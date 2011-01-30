var assert = require('assert');
var tree = require('mess/tree');
require('mess/tree/filter');

exports['simplify filters'] = function() {
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' },
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, true), {
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, '=2 =2');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' },
        'TOTAL!=3': { key: 'TOTAL', op: '!=', val: '3' }
    }, true), {
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, '=2 !=3');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' },
        'TOTAL!=3': { key: 'TOTAL', op: '!=', val: '3' },
        'TOTAL!=4': { key: 'TOTAL', op: '!=', val: '4' }
    }, true), {
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, '=2 !=3 !=4');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL!=3': { key: 'TOTAL', op: '!=', val: '3' },
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, true), {
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, '!=3 =2');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL!=3': { key: 'TOTAL', op: '!=', val: '3' },
        'TOTAL!=4': { key: 'TOTAL', op: '!=', val: '4' },
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, true), {
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, '!=3 !=4 =2');
    
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' },
        'TOTAL>1': { key: 'TOTAL', op: '>', val: '1' }
    }, true), {
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' }
    }, '>2 >1');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>1': { key: 'TOTAL', op: '>', val: '1' },
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' }
    }, true), {
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' }
    }, '>1 >2');
    
    
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' },
        'TOTAL>1': { key: 'TOTAL', op: '>', val: '1' }
    }, true), {
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, '=2 >1');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>1': { key: 'TOTAL', op: '>', val: '1' },
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, true), {
        'TOTAL=2': { key: 'TOTAL', op: '=', val: '2' }
    }, '>1 =2');
    
    
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>1': { key: 'TOTAL', op: '>', val: '1' },
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' }
    }, true), {
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' }
    }, '>1 >=2');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' },
        'TOTAL>1': { key: 'TOTAL', op: '>', val: '1' }
    }, true), {
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' }
    }, '>=2 >1');

    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' },
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' }
    }, true), {
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' }
    }, '>2 >=2');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' },
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' }
    }, true), {
        'TOTAL>2': { key: 'TOTAL', op: '>', val: '2' }
    }, '>=2 >2');
    
    
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' },
        'TOTAL>=1': { key: 'TOTAL', op: '>=', val: '1' }
    }, true), {
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' }
    }, '>=2 >=1');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL>=1': { key: 'TOTAL', op: '>=', val: '1' },
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' }
    }, true), {
        'TOTAL>=2': { key: 'TOTAL', op: '>=', val: '2' }
    }, '>=1 >=2');

    
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' },
        'TOTAL<1': { key: 'TOTAL', op: '<', val: '1' }
    }, true), {
        'TOTAL<1': { key: 'TOTAL', op: '<', val: '1' }
    }, '<2 <1');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<1': { key: 'TOTAL', op: '<', val: '1' },
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' }
    }, true), {
        'TOTAL<1': { key: 'TOTAL', op: '<', val: '1' }
    }, '<1 <2');


    assert.deepEqual(tree.Filter.simplify({
        'TOTAL=1': { key: 'TOTAL', op: '=', val: '1' },
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' }
    }, true), {
        'TOTAL=1': { key: 'TOTAL', op: '=', val: '1' }
    }, '=1 <2');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' },
        'TOTAL=1': { key: 'TOTAL', op: '=', val: '1' }
    }, true), {
        'TOTAL=1': { key: 'TOTAL', op: '=', val: '1' }
    }, '<2 =1');


    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<3': { key: 'TOTAL', op: '<', val: '3' },
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' }
    }, true), {
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' }
    }, '<3 <=2');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' },
        'TOTAL<3': { key: 'TOTAL', op: '<', val: '3' }
    }, true), {
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' }
    }, '<=2 <3');

    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' },
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' }
    }, true), {
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' }
    }, '<2 <=2');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' },
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' }
    }, true), {
        'TOTAL<2': { key: 'TOTAL', op: '<', val: '2' }
    }, '<=2 <2');


    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' },
        'TOTAL<=3': { key: 'TOTAL', op: '<=', val: '3' }
    }, true), {
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' }
    }, '<=2 <=3');
    assert.deepEqual(tree.Filter.simplify({
        'TOTAL<=3': { key: 'TOTAL', op: '<=', val: '3' },
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' }
    }, true), {
        'TOTAL<=2': { key: 'TOTAL', op: '<=', val: '2' }
    }, '<=3 <=2');
};