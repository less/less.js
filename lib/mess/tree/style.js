(function(tree) {

tree.Style = function(id, symbolizer, definitions) {
    this.id = id;
    this.symbolizer = symbolizer;
    this.definitions = definitions;
};

tree.Style.prototype.name = function() {
    return this.id + '-' + this.symbolizer;
}

tree.Style.prototype.toXML = function() {
    return '<Style name="' + this.name() + '">\n' +
        this.definitions.map(function(d) {
            return d.toXML();
        }).join('\n')
        + '\n</Style>';
};

})(require('mess/tree'));
