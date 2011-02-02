(function(tree) {
var assert = require('assert');

tree.Definition = function Definition(selector, rules) {
    assert.ok(selector.filters instanceof tree.Filterset);
    this.rules = rules;
    this.ruleIndex = [];
    for (var i = 0; i < this.rules.length; i++) {
        this.rules[i].zoom = selector.zoom;
        this.ruleIndex.push(this.rules[i].updateID());
    }
    this.filters = selector.filters;
    this.attachment = selector.attachment || '__default__';
    this.specificity = selector.specificity();
    this.elements = selector.elements;
};

tree.Definition.prototype.toString = function() {
    var str = this.filters.toString();
    for (var i = 0; i < this.rules.length; i++) {
        str += '\n    ' + this.rules[i];
    }
    return str;
};

tree.Definition.prototype.clone = function(filters) {
    assert.ok(filters instanceof tree.Filterset);
    var clone = Object.create(tree.Definition.prototype);
    clone.rules = this.rules.slice();
    clone.ruleIndex = this.ruleIndex.slice();
    clone.filters = filters;
    clone.attachment = this.attachment;
    return clone;
};

tree.Definition.prototype.addRules = function(rules) {
    var added = 0;

    // Add only unique rules.
    for (var i = 0; i < rules.length; i++) {
        if (this.ruleIndex.indexOf(rules[i].id) < 0) {
            this.rules.push(rules[i]);
            this.ruleIndex.push(rules[i].id);
            added++;
        }
    }

    return added;
};

/**
 * Determine whether this selector matches a given id
 * and array of classes, by determining whether
 * all elements it contains match.
 */
tree.Definition.prototype.appliesTo = function(id, classes) {
    for (var i = 0; i < this.elements.length; i++) {
        if (!this.elements[i].matches(id, classes)) {
            return false;
        }
    }
    return true;
};

tree.Definition.prototype.hasSymbolizer = function(symbolizer) {
    for (var i = 0; i < this.rules.length; i++) {
        if (this.rules[i].symbolizer === symbolizer) {
            return true;
        }
    }
    return false;
};

tree.Definition.prototype.toXML = function(env, symbolizer) {
    var rules = this.rules.filter(function(rule) {
        if (rule.symbolizer === symbolizer) {
            return true;
        }
    });

    var xml = '';
    for (var i = 0; i < rules.length; i++) {
        var attributes = {};

        for (var j = i; j < rules.length; j++) {
            if (!(rules[j].name in attributes) && rules[i].zoom & rules[j].zoom) {
                attributes[rules[j].name] = rules[j];
            }
        }

        var fail;
        if (fail = tree.Reference.requiredProperties(symbolizer, attributes)) {
            env.error({
                message: reqfail,
                index: rules[i].index,
                filename: rules[i].filename
            });
        }
        
        var symname = symbolizer.charAt(0).toUpperCase() +
                      symbolizer.slice(1).replace(/\-./, function(str) {
                          return str[1].toUpperCase();
                      }) + 'Symbolizer';


        xml += '  <Rule>\n';
        xml += tree.Zoom.toXML(rules[i].zoom).join('');
        xml += this.filters.toXML(env);
        xml += '    <' + symname + ' ';
        for (var key in attributes) {
            xml += attributes[key].eval().toXML(env) + ' ';
        }
        xml += '/>\n';
        xml += '  </Rule>\n';
    }
    return xml;
};

})(require('mess/tree'));
