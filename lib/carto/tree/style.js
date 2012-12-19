(function(tree) {
var _ = require('lodash');

tree.Style = function Style(name, attachment, definitions) {
    this.attachment = attachment;
    this.definitions = definitions;
    this.name = name + (attachment !== '__default__' ? '-' + attachment : '');
};

tree.Style.prototype.toXML = function(env) {
    var existing = {};

    var definitions = this.definitions;
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

    var rules = this.definitions.map(function(definition) {
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

    return '<Style name="' + this.name + '" filter-mode="first" ' + attrs_xml + '>\n' + rules.join('') + '</Style>';
};

})(require('../tree'));
