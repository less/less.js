(function(tree) {
var assert = require('assert');

tree.Definition = function Definition(selector, rules) {
    this.elements = selector.elements;
    assert.ok(selector.filters instanceof tree.Filterset);
    this.rules = rules;
    this.ruleIndex = [];
    for (var i = 0; i < this.rules.length; i++) {
        if ('zoom' in this.rules[i]) this.rules[i] = this.rules[i].clone();
        this.rules[i].zoom = selector.zoom;
        this.ruleIndex.push(this.rules[i].updateID());
    }
    this.filters = selector.filters;
    this.zoom = selector.zoom;
    this.attachment = selector.attachment || '__default__';
    this.specificity = selector.specificity();
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

tree.Definition.prototype.symbolizersToXML = function(env, symbolizers, zoom) {
    var xml = '  <Rule>\n';
    xml += tree.Zoom.toXML(zoom).join('');
    xml += this.filters.toXML(env);

    for (var symbolizer in symbolizers) {
        attributes = symbolizers[symbolizer];
        if (fail = tree.Reference.requiredProperties(symbolizer, attributes)) {
            var rule = attributes[Object.keys(attributes).shift()];
            env.error({
                message: fail,
                index: rule.index,
                filename: rule.filename
            });
        }

        name = symbolizer.charAt(0).toUpperCase() +
               symbolizer.slice(1).replace(/\-./, function(str) {
                   return str[1].toUpperCase();
               }) + 'Symbolizer';

        xml += '    <' + name + ' ';
        for (var key in attributes) {
            xml += attributes[key].eval(env).toXML(env) + ' ';
        }
        xml += '/>\n';
    }
    xml += '  </Rule>\n';
    return xml;
};

tree.Definition.prototype.collectSymbolizers = function(zooms, i) {
    var symbolizers = {}, child;

    for (var j = i; j < this.rules.length; j++) {
        child = this.rules[j];
        if (zooms.current & child.zoom &&
           (!(child.symbolizer in symbolizers) ||
           (!(child.name in symbolizers[child.symbolizer])))) {
            zooms.current &= child.zoom;
            if (!(child.symbolizer in symbolizers)) {
                symbolizers[child.symbolizer] = {};
            }
            symbolizers[child.symbolizer][child.name] = child;
        }
    }

    if (Object.keys(symbolizers).length) {
        zooms.rule &= (zooms.available &= ~zooms.current);
        return symbolizers;
    }
};

tree.Definition.prototype.toXML = function(env, existing) {
    // The tree.Zoom.toString function ignores the holes in zoom ranges and outputs
    // scaledenominators that cover the whole range from the first to last bit set.
    // This algorithm can produces zoom ranges that may have holes. However,
    // when using the filter-mode="first", more specific zoom filters will always
    // end up before broader ranges. The filter-mode will pick those first before
    // resorting to the zoom range with the hole and stop processing further rules.
    var filter = this.filters.toString();
    if (!(filter in existing)) existing[filter] = tree.Zoom.all;

    var available = tree.Zoom.all, xml = '', zoom, symbolizers;
    var zooms = { available: tree.Zoom.all };
    for (var i = 0; i < this.rules.length && available; i++) {
        zooms.rule = this.rules[i].zoom;
        if (!(existing[filter] & zooms.rule)) continue;

        while (zooms.current = zooms.rule & available) {
            if (symbolizers = this.collectSymbolizers(zooms, i)) {
                if (!(existing[filter] & zooms.current)) continue;
                xml += this.symbolizersToXML(env, symbolizers, existing[filter] & zooms.current);
                existing[filter] &= ~zooms.current;
            }
        }
    }

    return xml;
};

})(require('carto/tree'));
