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

tree.Definition.prototype.zoomsForSymbolizer = function(symbolizer) {
    var zooms = [];
    for (var i = 0; i < this.rules.length; i++) {
        if (this.rules[i].symbolizer === symbolizer) {
            zooms.push(this.rules[i].zoom);
        }
    }
    zooms.sort();
    
    zooms.forEach(function(z) {
        console.warn(tree.Zoom.toString(z));
    });
    console.warn('---');
    process.exit();
    
    // Zoom[....X..................]
    // Zoom[....XXXXX..............]
    // Zoom[....XXXXXXXXXXXXXX.....]
    // Zoom[XXXXXXXXXXXXXXXXXXXXXXX]
    // should return
    // Zoom[..................XXXXX]
    // Zoom[.........XXXXXXXXX.....]
    // Zoom[.....XXXX..............]
    // Zoom[....X..................]
    // // Zoom[XXXX...................]
    // 
    // 
    // line-width: 6       Zoom[....XXXXX..............]
    // line-width: 3       Zoom[....XXXXXXXXXXXXXXX....]
    // line-dasharray: 0 2 Zoom[....X..................]
    // line-color: #0000ff Zoom[XXXXXXXXXXXXXXXXXXXXXXX]

};

tree.Definition.prototype.toXML = function(env, symbolizer) {
    var result = [];
    var zooms = this.zoomsForSymbolizer(symbolizer);
    // for (var i = 0; i < zooms.length; i++) {
    //     
    // }
    
    
    // Go through the rules
    
};

// tree.Definition.prototype.toXML = function(env) {
//     if (this._xml) return this._xml;
//
//     var sym = this.symbolizers();
//     if (!env.returnErrors && sym.length !== 1) {
//         throw {
//             message: 'A single symbolizer is expected'
//                 + 'in definition compilation'
//         }
//     } else {
//         sym = sym[0];
//     }
//
//     if (sym) {
//         if (reqfail = tree.Reference.requiredProperties(
//             sym,
//             this.unique_rules())) {
//             env.error({
//                 message: reqfail,
//                 index: this.unique_rules()[0] && this.unique_rules()[0].index,
//                 index: this.unique_rules()[0] && this.unique_rules()[0].filename
//             });
//         }
//     }
//
//     var symname = sym ? sym.charAt(0).toUpperCase()
//         + sym.slice(1).replace(/\-./, function(str) {
//         return str[1].toUpperCase();
//     }) + 'Symbolizer' : '';
//
//     var rules = '    <'
//         + symname
//         + ' '
//         + this.unique_rules().map(function(rule) {
//             if (rule.eval) rule = rule.eval(env);
//             return rule.toXML(env);
//         }).join('\n      ')
//         + '/>';
//
//     var filters = this.selector.combinedFilter(env);
//
//     return this._xml = '  <Rule>\n    ' +
//         filters + '\n' +
//         rules +
//         '\n  </Rule>';
// };

})(require('mess/tree'));
