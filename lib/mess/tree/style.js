(function(tree) {

tree.Style = function Style(id, attachment, definitions) {
    this.id = id;
    this.attachment = attachment;
    this.definitions = definitions;
    this.name = id + (attachment !== '__default__' ? '-' + attachment : '');
};

tree.Style.prototype.toXML = function(env) {
    var existing = {};
    var rules = this.definitions.map(function(definition) {
        return definition.toXML(env, existing);
    });

    return '<Style name="' + this.name + '" filter-mode="first">\n' + rules.join('') + '</Style>';
};

})(require('mess/tree'));
