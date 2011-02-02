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

    // The tree.Zoom.toString function ignores the holes in zoom ranges and outputs
    // scaledenominators that cover the whole range from the first to last bit set.
    // This algorithm can produces zoom ranges that may have holes. However,
    // when using the filter-mode="first", more specific zoom filters will always
    // end up before broader ranges. The filter-mode will pick those first before
    // resorting to the zoom range with the hole and stop processing further rules.
    var available = tree.Zoom.all, xml = '', zoom, fail, name;
    for (var i = 0; i < rules.length && available; i++) {
        zoom = available & rules[i].zoom;
        if (!zoom) continue;
        attributes = {};

        for (var j = i; j < rules.length && zoom; j++) {
            if (zoom & rules[j].zoom && !(rules[j].name in attributes)) {
                zoom &= rules[j].zoom;
                attributes[rules[j].name] = rules[j];
            }
        }

        if (fail = tree.Reference.requiredProperties(symbolizer, attributes)) {
            env.error({
                message: reqfail,
                index: rules[i].index,
                filename: rules[i].filename
            });
        }

        name = symbolizer.charAt(0).toUpperCase() +
               symbolizer.slice(1).replace(/\-./, function(str) {
                   return str[1].toUpperCase();
               }) + 'Symbolizer';

        xml += '  <Rule>\n';
        xml += tree.Zoom.toXML(zoom).join('');
        xml += this.filters.toXML(env);
        xml += '    <' + name + ' ';
        for (var key in attributes) {
            xml += attributes[key].eval().toXML(env) + ' ';
        }
        xml += '/>\n';
        xml += '  </Rule>\n';

        // Process the same rule again if there's still something left.
        available &= ~zoom;
        rules[i].zoom &= available;
        if (rules[i].zoom) i--;
    }

    return xml;
};

})(require('mess/tree'));
