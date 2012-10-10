/*
 * Carto pulls in a reference from the `mapnik-reference`
 * module. This file builds indexes from that file for its various
 * options, and provides validation methods for property: value
 * combinations.
 */
(function(tree) {

var _ = require('underscore');
var mapnik_reference = require('mapnik-reference');

tree.Reference = {
    data: mapnik_reference.version.latest
};

/// @param version target mapnik version
/// @return true on success, false on error (unsupported mapnik version)
tree.Reference.setVersion = function(version) {
    if (mapnik_reference.version.hasOwnProperty(version)) {
        tree.Reference.data = mapnik_reference.version[version];
        return true;
    } else {
        return false;
    }
};

tree.Reference.required_prop_list_cache = {};

tree.Reference.selectors = tree.Reference.selectors || (function() {
    var list = [];
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (tree.Reference.data.symbolizers[i][j].hasOwnProperty('css')) {
                list.push(tree.Reference.data.symbolizers[i][j].css);
            }
        }
    }
    return list;
})();

tree.Reference.validSelector = function(selector) {
    return tree.Reference.selectors.indexOf(selector) !== -1;
};

tree.Reference.selectorName = function(selector) {
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (selector == tree.Reference.data.symbolizers[i][j].css) {
                return j;
            }
        }
    }
};

tree.Reference.selector = function(selector) {
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (selector == tree.Reference.data.symbolizers[i][j].css) {
                return tree.Reference.data.symbolizers[i][j];
            }
        }
    }
};

tree.Reference.symbolizer = function(selector) {
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (selector == tree.Reference.data.symbolizers[i][j].css) {
                return i;
            }
        }
    }
};

/*
 * For transform properties and image-filters,
 * mapnik has its own functions.
 */
tree.Reference.mapnikFunctions = function() {
    var functions = [];
    for (var i in tree.Reference.data.symbolizers) {
        for (var j in tree.Reference.data.symbolizers[i]) {
            if (tree.Reference.data.symbolizers[i][j].type === 'functions') {
                functions = functions.concat(tree.Reference.data.symbolizers[i][j].functions);
            }
        }
    }
    return functions;
};

/*
 * For transform properties and image-filters,
 * mapnik has its own functions.
 */
tree.Reference.mapnikFunction = function(name) {
    return _.find(this.mapnikFunctions(), function(f) {
        return f[0] === name;
    });
};

tree.Reference.requiredPropertyList = function(symbolizer_name) {
    if (this.required_prop_list_cache[symbolizer_name]) {
        return this.required_prop_list_cache[symbolizer_name];
    }
    var properties = [];
    for (var j in tree.Reference.data.symbolizers[symbolizer_name]) {
        if (tree.Reference.data.symbolizers[symbolizer_name][j].required) {
            properties.push(tree.Reference.data.symbolizers[symbolizer_name][j].css);
        }
    }
    return this.required_prop_list_cache[symbolizer_name] = properties;
};

tree.Reference.requiredProperties = function(symbolizer_name, rules) {
    var req = tree.Reference.requiredPropertyList(symbolizer_name);
    for (var i in req) {
        if (!(req[i] in rules)) {
            return 'Property ' + req[i] + ' required for defining ' +
                symbolizer_name + ' styles.';
        }
    }
};

/**
 * TODO: finish implementation - this is dead code
 */
tree.Reference._validateValue = {
    'font': function(env, value) {
        if (env.validation_data && env.validation_data.fonts) {
            return env.validation_data.fonts.indexOf(value) != -1;
        } else {
            return true;
        }
    }
};

tree.Reference.isFont = function(selector) {
    return tree.Reference.selector(selector).validate == 'font';
};

// https://gist.github.com/982927
tree.Reference.editDistance = function(a, b){
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    var matrix = [];

    for (var i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (var j = 0; j <= a.length; j++) { matrix[0][j] = j; }

    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i-1) == a.charAt(j-1)) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                    Math.min(matrix[i][j-1] + 1, // insertion
                    matrix[i-1][j] + 1)); // deletion
            }
        }
    }

    return matrix[b.length][a.length];
};

tree.Reference.validValue = function(env, selector, value) {
    var i, j;
    // TODO: handle in reusable way
    if (!tree.Reference.selector(selector)) {
        return false;
    } else if (value.value[0].is == 'keyword') {
        if (typeof tree.Reference.selector(selector).type === 'object') {
            return tree.Reference
                .selector(selector).type
                .indexOf(value.value[0].value) !== -1;
        // Lax permissions for single strings. If you provide a keyword
        // aka unquoted string to a property that is a string, it'll be fine.
        } else if (tree.Reference.selector(selector).type === 'string') {
            return true;
        } else {
            return false;
        }
    } else if (value.value[0].is == 'undefined') {
        // caught earlier in the chain - ignore here so that
        // error is not overridden
        return true;
    } else if (tree.Reference.selector(selector).type == 'numbers') {
        for (i in value.value) {
            if (value.value[i].is !== 'float') {
                return false;
            }
        }
        return true;
    } else if (tree.Reference.selector(selector).type == 'functions') {
        // For backwards compatibility, you can specify a string for `functions`-compatible
        // values, though they will not be validated.
        if (value.value[0].is === 'string') {
            return true;
        } else {
            for (i in value.value) {
                for (j in value.value[i].value) {
                    if (value.value[i].value[j].is !== 'call') {
                        return false;
                    }
                    var f = _.find(tree.Reference
                        .selector(selector).functions, function(x) {
                            return x[0] == value.value[i].value[j].name;
                        });
                    // This filter is unknown
                    if (!f) return false;
                    // The filter has been given an incorrect number of arguments
                    if (f[1] !== value.value[i].value[j].args.length) return false;
                }
            }
            return true;
        }
    } else if (tree.Reference.selector(selector).type === 'expression') {
        return true;
    } else if (tree.Reference.selector(selector).type === 'unsigned') {
        if (value.value[0].is === 'float') {
            value.value[0].round();
            return true;
        } else {
            return false;
        }
    } else {
        if (tree.Reference.selector(selector).validate) {
            var valid = false;
            for (i = 0; i < value.value.length; i++) {
                if (tree.Reference.selector(selector).type == value.value[i].is &&
                    tree.Reference
                        ._validateValue
                            [tree.Reference.selector(selector).validate]
                            (env, value.value[i].value)) {
                    return true;
                }
            }
            return valid;
        } else {
            return tree.Reference.selector(selector).type == value.value[0].is;
        }
    }
};

})(require('../tree'));
