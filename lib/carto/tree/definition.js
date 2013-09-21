(function(tree) {
var assert = require('assert'),
    _ = require('underscore');

// A definition is the combination of a selector and rules, like
// #foo {
//     polygon-opacity:1.0;
// }
//
// The selector can have filters
tree.Definition = function Definition(selector, rules) {
    this.elements = selector.elements;
    assert.ok(selector.filters instanceof tree.Filterset);
    this.rules = rules;
    this.ruleIndex = {};
    for (var i = 0; i < this.rules.length; i++) {
        if ('zoom' in this.rules[i]) this.rules[i] = this.rules[i].clone();
        this.rules[i].zoom = selector.zoom;
        this.ruleIndex[this.rules[i].updateID()] = true;
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
    if (filters) assert.ok(filters instanceof tree.Filterset);
    var clone = Object.create(tree.Definition.prototype);
    clone.rules = this.rules.slice();
    clone.ruleIndex = _.clone(this.ruleIndex);
    clone.filters = filters ? filters : this.filters.clone();
    clone.attachment = this.attachment;
    return clone;
};

tree.Definition.prototype.addRules = function(rules) {
    var added = 0;

    // Add only unique rules.
    for (var i = 0; i < rules.length; i++) {
        if (!this.ruleIndex[rules[i].id]) {
            this.rules.push(rules[i]);
            this.ruleIndex[rules[i].id] = true;
            added++;
        }
    }

    return added;
};

// Determine whether this selector matches a given id
// and array of classes, by determining whether
// all elements it contains match.
tree.Definition.prototype.appliesTo = function(id, classes) {
    for (var i = 0, l = this.elements.length; i < l; i++) {
        var elem = this.elements[i];
        if (!(elem.wildcard ||
            (elem.type === 'class' && classes[elem.clean]) ||
            (elem.type === 'id' && id === elem.clean))) return false;
    }
    return true;
};

function symbolizerName(symbolizer) {
    function capitalize(str) { return str[1].toUpperCase(); }
    return symbolizer.charAt(0).toUpperCase() +
           symbolizer.slice(1).replace(/\-./, capitalize) + 'Symbolizer';
}

// Get a simple list of the symbolizers, in order
function symbolizerList(sym_order) {
    return sym_order.sort(function(a, b) { return a[1] - b[1]; })
        .map(function(v) { return v[0]; });
}

tree.Definition.prototype.symbolizersToXML = function(env, symbolizers, zoom) {
    var xml = zoom.toXML(env).join('') + this.filters.toXML(env);

    // Sort symbolizers by the index of their first property definition
    var sym_order = [], indexes = [];
    for (var key in symbolizers) {
        indexes = [];
        for (var prop in symbolizers[key]) {
            indexes.push(symbolizers[key][prop].index);
        }
        var min_idx = Math.min.apply(Math, indexes);
        sym_order.push([key, min_idx]);
    }

    sym_order = symbolizerList(sym_order);

    for (var i = 0; i < sym_order.length; i++) {
        var attributes = symbolizers[sym_order[i]];
        var symbolizer = sym_order[i].split('/').pop();

        // Skip the magical * symbolizer which is used for universal properties
        // which are bubbled up to Style elements intead of Symbolizer elements.
        if (symbolizer === '*') continue;

        var fail = tree.Reference.requiredProperties(symbolizer, attributes);
        if (fail) {
            var rule = attributes[Object.keys(attributes).shift()];
            env.error({
                message: fail,
                index: rule.index,
                filename: rule.filename
            });
        }

        var name = symbolizerName(symbolizer);

        var selfclosing = true, tagcontent;
        xml += '    <' + name + ' ';
        for (var j in attributes) {
            if (symbolizer === 'map') env.error({
                message: 'Map properties are not permitted in other rules',
                index: attributes[j].index,
                filename: attributes[j].filename
            });
            var x = tree.Reference.selector(attributes[j].name);
            if (x && x.serialization && x.serialization === 'content') {
                selfclosing = false;
                tagcontent = attributes[j].ev(env).toXML(env, true);
            } else if (x && x.serialization && x.serialization === 'tag') {
                selfclosing = false;
                tagcontent = attributes[j].ev(env).toXML(env, true);
            } else {
                xml += attributes[j].ev(env).toXML(env) + ' ';
            }
        }
        if (selfclosing) {
            xml += '/>\n';
        } else if (typeof tagcontent !== "undefined") {
            if (tagcontent.indexOf('<') != -1) {
                xml += '>' + tagcontent + '</' + name + '>\n';
            } else {
                xml += '><![CDATA[' + tagcontent + ']]></' + name + '>\n';
            }
        }
    }
    if (!xml) return '';
    return '  <Rule>\n' + xml + '  </Rule>\n';
};

// Take a zoom range of zooms and 'i', the index of a rule in this.rules,
// and finds all applicable symbolizers
tree.Definition.prototype.collectSymbolizers = function(zooms, i) {
    var symbolizers = {}, child;

    for (var j = i; j < this.rules.length; j++) {
        child = this.rules[j];
        var key = child.instance + '/' + child.symbolizer;
        if (zooms.current & child.zoom &&
           (!(key in symbolizers) ||
           (!(child.name in symbolizers[key])))) {
            zooms.current &= child.zoom;
            if (!(key in symbolizers)) {
                symbolizers[key] = {};
            }
            symbolizers[key][child.name] = child;
        }
    }

    if (Object.keys(symbolizers).length) {
        zooms.rule &= (zooms.available &= ~zooms.current);
        return symbolizers;
    }
};

// The tree.Zoom.toString function ignores the holes in zoom ranges and outputs
// scaledenominators that cover the whole range from the first to last bit set.
// This algorithm can produces zoom ranges that may have holes. However,
// when using the filter-mode="first", more specific zoom filters will always
// end up before broader ranges. The filter-mode will pick those first before
// resorting to the zoom range with the hole and stop processing further rules.
tree.Definition.prototype.toXML = function(env, existing) {
    var filter = this.filters.toString();
    if (!(filter in existing)) existing[filter] = tree.Zoom.all;

    var available = tree.Zoom.all, xml = '', zoom, symbolizers,
        zooms = { available: tree.Zoom.all };
    for (var i = 0; i < this.rules.length && available; i++) {
        zooms.rule = this.rules[i].zoom;
        if (!(existing[filter] & zooms.rule)) continue;

        while (zooms.current = zooms.rule & available) {
            if (symbolizers = this.collectSymbolizers(zooms, i)) {
                if (!(existing[filter] & zooms.current)) continue;
                xml += this.symbolizersToXML(env, symbolizers,
                    (new tree.Zoom()).setZoom(existing[filter] & zooms.current));
                existing[filter] &= ~zooms.current;
            }
        }
    }

    return xml;
};

})(require('../tree'));
