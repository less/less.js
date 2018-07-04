var Dimension = require('../tree/dimension'),
    Declaration = require('../tree/declaration'),
    Ruleset = require('../tree/ruleset'),
    Selector = require('../tree/selector'),
    Element = require('../tree/element'),
    functionRegistry = require('./function-registry');

var getItemsFromNode = function(node) {
    // handle non-array values as an array of length 1
    // return 'undefined' if index is invalid
    var items = Array.isArray(node.value) ?
        node.value : Array(node);

    return items;
};

functionRegistry.addMultiple({
    _SELF: function(n) {
        return n;
    },
    extract: function(values, index) {
        index = index.value - 1; // (1-based index)

        return getItemsFromNode(values)[index];
    },
    length: function(values) {
        return new Dimension(getItemsFromNode(values).length);
    },
    each: function(list, ruleset) {
        var i = 0, rules = [], rs, newRules, iterator;

        rs = ruleset.ruleset;
        if (list.value) {
            if (Array.isArray(list.value)) {
                iterator = list.value;
            } else {
                iterator = [list.value];
            }
        } else if (list.ruleset) {
            iterator = list.ruleset.rules;
        } else if (Array.isArray(list)) {
            iterator = list;
        } else {
            iterator = [list];
        }

        iterator.forEach(function(item) {
            i = i + 1;
            newRules = rs.rules.slice(0);
            var key, value;
            if (item instanceof Declaration) {
                key = typeof item.name === 'string' ? item.name : item.name[0].value;
                value = item.value;
            } else {
                key = new Dimension(i);
                value = item;
            }
            newRules.push(new Declaration('@value',
                value,
                false, false, this.index, this.currentFileInfo));
            newRules.push(new Declaration('@index',
                new Dimension(i),
                false, false, this.index, this.currentFileInfo));
            newRules.push(new Declaration('@key',
                key,
                false, false, this.index, this.currentFileInfo));

            rules.push(new Ruleset([ new(Selector)([ new Element("", '&') ]) ],
                newRules,
                rs.strictImports,
                rs.visibilityInfo()
            ));
        });

        return new Ruleset([ new(Selector)([ new Element("", '&') ]) ],
                rules,
                rs.strictImports,
                rs.visibilityInfo()
            ).eval(this.context);

    }
});
