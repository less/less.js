(function(tree) {

tree.Style = function Style(name, attachment, definitions) {
    this.attachment = attachment;
    this.definitions = definitions;
    this.name = name + (attachment !== '__default__' ? '-' + attachment : '');
};

tree.Style.prototype.toXML = function(env) {
    var existing = {};
    var rules = this.definitions.map(function(definition) {
        return definition.toXML(env, existing);
    });

    return '<Style name="' + this.name + '" filter-mode="first">\n' + rules.join('') + '</Style>';
};

})(require('../tree'));
