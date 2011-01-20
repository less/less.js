(function(tree) {

tree.Style = function(name, definitions) {
    this.name = name;
    this.definitions = definitions;
};

tree.Style.prototype.toXML = function() {
    return '<Style name="' + this.name + '">\n' +
        this.definitions.map(function(d) {
            return d.toXML();
        }).join('\n')
        + '</Style>';
};

})(require('mess/tree'));
