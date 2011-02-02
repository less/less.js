(function(tree) {
var fs = require('fs');

tree.Reference = JSON.parse(fs.readFileSync(__dirname + '/reference.json'));

for (var i in tree.Reference.colors) {
    var c = tree.Reference.colors[i];
    tree.Reference.colors[i] = new(tree.Color)(c);
}

tree.Reference.color_frames = function() {
    var variables = tree.Reference.colors;
    variables = Object.keys(variables).map(function (k) {
        var value = variables[k];
        if (!(value instanceof tree.Value)) {
            if (!(value instanceof tree.Expression)) {
                value = new(tree.Expression)([value]);
            }
            value = new(tree.Value)([value]);
        }
        return new(tree.Rule)('@' + k, value, false, 0);
    });
    return variables;
};

tree.Reference.required_prop_list_cache = {};

tree.Reference.selectors = tree.Reference.selectors || (function() {
    var list = [];
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (tree.Reference.symbolizers[i][j].hasOwnProperty('css')) {
                list.push(tree.Reference.symbolizers[i][j].css);
            }
        }
    }
    return list;
})();

tree.Reference.validSelector = function(selector) {
    return tree.Reference.selectors.indexOf(selector) !== -1;
};

tree.Reference.selectorName = function(selector) {
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (selector == tree.Reference.symbolizers[i][j].css) {
                return j;
            }
        }
    }
};

tree.Reference.selector = function(selector) {
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (selector == tree.Reference.symbolizers[i][j].css) {
                return tree.Reference.symbolizers[i][j];
            }
        }
    }
};

tree.Reference.symbolizer = function(selector) {
    for (var i in tree.Reference.symbolizers) {
        for (var j in tree.Reference.symbolizers[i]) {
            if (selector == tree.Reference.symbolizers[i][j].css) {
                return i;
            }
        }
    }
};

tree.Reference.requiredPropertyList = function(symbolizer_name) {
    if (this.required_prop_list_cache[symbolizer_name]) {
        return this.required_prop_list_cache[symbolizer_name];
    }
    var properties = [];
    for (var j in tree.Reference.symbolizers[symbolizer_name]) {
        if (tree.Reference.symbolizers[symbolizer_name][j].required) {
            properties.push(tree.Reference.symbolizers[symbolizer_name][j].css);
        }
    }
    return this.required_prop_list_cache[symbolizer_name] = properties;
};

tree.Reference.requiredProperties = function(symbolizer_name, rules) {
    var req = tree.Reference.requiredPropertyList(symbolizer_name);
    for (i in req) {
        if (!(req[i] in rules)) {
            return 'Property ' + req[i] + ' required for defining '
                + symbolizer_name + ' styles.';
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
}

tree.Reference.validValue = function(env, selector, value) {
    if (value[0]) {
        return tree.Reference.selector(selector).type == value[0].is;
    } else {
        // TODO: handle in reusable way
        if (value.value[0].is == 'keyword') {
            return tree.Reference
                .selector(selector).type
                .indexOf(value.value[0].value) !== -1;
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
        } else {
            if (tree.Reference.selector(selector).validate) {
                var valid = false;
                for (var i = 0; i < value.value.length; i++) {
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
    }
}

})(require('mess/tree'));
