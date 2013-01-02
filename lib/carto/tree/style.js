(function(tree) {
var _ = require('underscore');

tree.StyleXML = function(name, attachment, definitions, env) {
    var existing = {};
    var image_filters = [], comp_op = [], opacity = [];

    for (var i = 0; i < definitions.length; i++) {
        for (var j = 0; j < definitions[i].rules.length; j++) {
            if (definitions[i].rules[j].name === 'image-filters') {
                image_filters.push(definitions[i].rules[j]);
            }
            if (definitions[i].rules[j].name === 'comp-op') {
                comp_op.push(definitions[i].rules[j]);
            }
            if (definitions[i].rules[j].name === 'opacity') {
                opacity.push(definitions[i].rules[j]);
            }
        }
    }

    var rules = definitions.map(function(definition) {
        return definition.toXML(env, existing);
    });

    var attrs_xml = '';

    if (image_filters.length) {
        attrs_xml += ' image-filters="' + image_filters.map(function(f) {
            return f.eval(env).toXML(env, true, ',', 'image-filter');
        }).join(',') + '" ';
    }

    if (comp_op.length) {
        attrs_xml += ' comp-op="' + comp_op[0].value.eval(env).toString() + '" ';
    }

    if (opacity.length) {
        attrs_xml += ' opacity="' + opacity[0].value.eval(env).toString() + '" ';
    }
    var rule_string = rules.join('');
    if (!attrs_xml && !rule_string) return '';
    return '<Style name="' + name + '" filter-mode="first" ' + attrs_xml + '>\n' + rule_string + '</Style>';
};

})(require('../tree'));
