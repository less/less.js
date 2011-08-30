(function(tree) {

tree.Layer = function Layer(obj) {
    this.name = obj.name;
    this.styles = obj.styles;
    this.attributes = obj.attributes || {};
    this.srs = obj.srs;
    this.datasource = obj.Datasource;
};

tree.Layer.prototype.toXML = function() {
    var dsoptions = [];
    for (var i in this.datasource) {
        dsoptions.push('<Parameter name="' + i + '"><![CDATA[' +
            this.datasource[i] + ']]></Parameter>');
    }

    var attr_string = '';
    for (var i in this.attributes) {
        attr_string += '  ' + i + '="' + this.attributes[i] + '"\n';
    }

    return '<Layer' +
        ' name="' + this.name + '"\n' +
        attr_string +
        '  srs="' + this.srs + '">\n    ' +
        this.styles.reverse().map(function(s) {
            return '<StyleName>' + s + '</StyleName>';
        }).join('\n    ') +
        '\n    <Datasource>\n       ' +
        dsoptions.join('\n       ') +
        '\n    </Datasource>\n' +
        '  </Layer>\n';
};

})(require('../tree'));
