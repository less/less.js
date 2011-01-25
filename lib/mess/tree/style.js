(function(tree) {

tree.Style = function Style(id, symbolizer, definitions) {
    this.id = id;
    this.symbolizer = symbolizer;
    this.definitions = definitions;
};

tree.Style.prototype.name = function() {
    return this.id + '-' + this.symbolizer;
}

tree.Style.prototype.toXML = function(env) {
    return '<Style name="' + this.name() + '">\n' +
        this.definitions.map(function(d) {
            return d.toXML(env);
        }).join('\n')
        + '\n</Style>';
};

})(require('mess/tree'));
