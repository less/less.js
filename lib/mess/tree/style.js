(function(tree) {

tree.Style = function Style(id, symbolizer, attachment, definitions) {
    definitions = definitions.filter(function(definition) {
        // Only those that have at least one rule that matches the symbolizer.
        return definition.hasSymbolizer(symbolizer);
    });

    if (!definitions.length) {
        return false;
    }

    this.id = id;
    this.symbolizer = symbolizer;
    this.attachment = attachment;
    this.definitions = definitions;
    this.name = id + '-' + symbolizer + (attachment !== '__default__' ? '-' + attachment : '');
};

tree.Style.prototype.toXML = function(env) {
    var symbolizer = this.symbolizer;
    var rules = this.definitions.map(function(definition) {
        return definition.toXML(env, symbolizer);
    });

    return '<Style name="' + this.name + '">\n' + rules.join('\n') + '\n</Style>';
};

})(require('mess/tree'));
