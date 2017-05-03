var Ruleset = require("../tree/ruleset"),
    Rule = require("../tree/rule"),
    Selector = require("../tree/selector"),
    Element = require("../tree/element"),
    Dimension = require("../tree/dimension"),
    functionRegistry = require("./function-registry");

var getItemsFromNode = function(node) {
        // handle non-array values as an array of length 1
        // return 'undefined' if index is invalid
        var items = Array.isArray(node.value) ?
            node.value : Array(node);

        return items;
    };
functionRegistry.addMultiple({
    extract: function(values, index) {
        index = index.value - 1; // (1-based index)

        return getItemsFromNode(values)[index];
    },
    length: function(values) {
        return new Dimension(getItemsFromNode(values).length);
    },
    each: function(list, vars, ruleset) {
        var i = 0, rules = [], rs, newRules;

        rs = ruleset ? ruleset.ruleset : vars.ruleset;

        list.value.forEach(function(item) {
            i = i + 1;
            newRules = rs.rules.slice(0);
            newRules.push(new Rule(ruleset && vars.value[1] ? '@' + vars.value[1].value : '@item',
                item,
                false, false, this.index, this.currentFileInfo));
            newRules.push(new Rule(ruleset && vars.value[0] ? '@' + vars.value[0].value : '@index',
                new Dimension(i),
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
