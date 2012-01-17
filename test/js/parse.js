var less = require('../../lib/less');
var assert = require('assert');
var parser = new less.Parser;

var valid = '.class { width: 1 + 1 }';
var result = '.class {\n  width: 2;\n}\n';
var invalidSyntax = '.class { width: 1 + 1';
var invalidParse = '.class width: 1 + 1';


/*
 * parser.parse callback
 */
exports['callback suucess'] = function() {
    parser.parse(valid, function (err, tree) {
        assert.ok(!err);
        assert.ok(tree instanceof less.tree.Ruleset);
        assert.equal(tree.toCSS(), result);
    });
};

exports['callback syntax error'] = function() {
    parser.parse(invalidSyntax, function (err, tree) {
        assert.ok(err);
        assert.equal(err.type, 'Syntax');
    });
};

exports['callback parse error'] = function() {
    parser.parse(invalidParse, function (err, tree) {
        assert.ok(err);
        assert.equal(err.type, 'Parse');
    });
};

/*
 * parser.parse return value
 */
exports['return value success'] = function() {
    var tree = parser.parse(valid);
    assert.ok(tree instanceof less.tree.Ruleset);
};

exports['return value syntax error'] = function() {
    try {
        var tree = parser.parse(invalidSyntax);
        assert.ok(false);
    } catch (err) {
        assert.ok(err);
        assert.equal(err.type, 'Syntax');
        assert.ok(!tree);
    }
};

exports['return value parse error'] = function() {
    try {
        var tree = parser.parse(invalidParse);
        assert.ok(false);
    } catch (err) {
        assert.ok(err);
        assert.equal(err.type, 'Parse');
        assert.ok(!tree);
    }
};

/*
 * less.render callback
 */
exports['less.render success'] = function() {
    less.render(valid, function(err, css) {
        assert.ok(!err);
        assert.equal(css, result);
    });
};

exports['less.render syntax error'] = function() {
    less.render(invalidSyntax, function(err, css) {
        assert.equal(err.type, 'Syntax');
    });
};

exports['less.render parse error'] = function() {
    less.render(invalidParse, function(err, css) {
        assert.equal(err.type, 'Parse');
    });
};


/*
 * less.render EventEmitter
 */
exports['less.render success ee'] = function() {
    var ee = less.render(valid);
    ee.on('success', function(css) {
        assert.equal(css, result);
    });
    ee.on('error', function() {
        assert.ok(false);
    });
};

exports['less.render syntax error ee'] = function() {
    var ee = less.render(invalidSyntax);
    ee.on('success', function() {
        assert.ok(false);
    });
    ee.on('error', function(err) {
        assert.equal(err.type, 'Syntax');
    });
};

exports['less.render parse error ee'] = function() {
    var ee = less.render(invalidParse);
    ee.on('success', function() {
        assert.ok(false);
    });
    ee.on('error', function(err) {
        assert.equal(err.type, 'Parse');
    });
};
