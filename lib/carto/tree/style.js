(function(tree) {
var _ = require('underscore');

tree.Style = function Style(name, attachment, definitions) {
    this.attachment = attachment;
    this.definitions = definitions;
    this.name = name + (attachment !== '__default__' ? '-' + attachment : '');
};

tree.Style.prototype.toXML = function(env) {
    var existing = {};
    // TODO :add filters and comp op
    var image_filters = _.flatten(this.definitions.map(function(definition) {
        return definition.rules.filter(function(rule) {
            return (rule.name === 'image-filters');
        });
    }));

    var comp_op = _.flatten(this.definitions.map(function(definition) {
        return definition.rules.filter(function(rule) {
            return (rule.name === 'composite-operation');
        });
    }));

    var rules = this.definitions.map(function(definition) {
        return definition.toXML(env, existing);
    });

    var image_filters_xml = '',
        comp_op_xml = '';

    if (image_filters.length) {
        image_filters_xml = 'image-filters="' + image_filters.map(function(f) {
            return f.toXML(env, true);
        }).join(',') + '"';
    }
    
    if (comp_op.length) {
        comp_op_xml = 'comp-op="' + comp_op[0].value.eval(env).toString() + '"';
    }

    return '<Style name="' + this.name + '" filter-mode="first" ' + image_filters_xml + ' ' + comp_op_xml + '>\n' + rules.join('') + '</Style>';
};

})(require('../tree'));
