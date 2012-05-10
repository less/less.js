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

    var rules = this.definitions.map(function(definition) {
        return definition.toXML(env, existing);
    });

    var image_filters_xml = '';

    if (image_filters.length) {
        image_filters_xml = 'image-filters="' + image_filters.map(function(f) {
            return f.value.eval(env).toString(env, null, ';');
        }).join(',') + '"';
    }

    return '<Style name="' + this.name + '" filter-mode="first" ' + image_filters_xml + '>\n' + rules.join('') + '</Style>';
};

})(require('../tree'));
