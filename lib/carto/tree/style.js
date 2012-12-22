(function(tree) {
var _ = require('underscore');

tree.Style = function Style(name, attachment, definitions) {
};

tree.Style.toXML = function(name, attachment, definitions, env) {
    var existing = {};

    function byName(name) {
        return _.flatten(definitions.map(function(definition) {
            return definition.rules.filter(function(rule) {
                return (rule.name === name);
            });
        }));
    }

    var image_filters = byName('image-filters');
    var comp_op = byName('comp-op');
    var opacity = byName('opacity');

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