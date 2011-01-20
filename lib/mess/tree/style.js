(function(tree) {

tree.Style = function(name, definitions) {
    this.name = name;
    this.definitions = definitions;
};

tree.Style.prototype.toXML = function() {
    this.definitions.map(function(d) {
        return d.toXML();
    }).join('\n');
};

})(require('mess/tree'));
