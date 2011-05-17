(function(tree) {

tree.Layer = function Layer(obj) {
    this.name = obj.name;
    this.styles = obj.styles;
    this.srs = obj.srs;
    this.datasource = obj.Datasource;
};

tree.Layer.prototype.toXML = function() {
    var dsoptions = [];
    for (var i in this.datasource) {
        dsoptions.push('<Parameter name="' + i + '"><![CDATA[' +
            this.datasource[i] + ']]></Parameter>');
    }
    return '<Layer\n   ' +
        '   name="' + this.name + '"\n' +
        '   srs="' + this.srs + '">\n    ' +
        this.styles.reverse().map(function(s) {
            return '<StyleName>' + s + '</StyleName>';
        }).join('\n    ') +
        '\n    <Datasource>\n       ' +
        dsoptions.join('\n       ') +
        '\n    </Datasource>\n' +
        '  </Layer>\n';
};

})(require('carto/tree'));
