(function(tree) {

tree.Layer = function Layer(obj) {
    this.name = obj.name;
    this.status = obj.status;
    this.styles = obj.styles;
    this.properties = obj.properties  || {};
    this.srs = obj.srs;
    this.datasource = obj.Datasource;
};

tree.Layer.prototype.toXML = function() {
    var dsoptions = [];
    for (var i in this.datasource) {
        dsoptions.push('<Parameter name="' + i + '"><![CDATA[' +
            this.datasource[i] + ']]></Parameter>');
    }

    var prop_string = '';
    for (var i in this.properties) {
        prop_string += '  ' + i + '="' + this.properties[i] + '"\n';
    }

    return '<Layer' +
        ' name="' + this.name + '"\n' +
        prop_string +
        ((typeof this.status === 'undefined') ? '' : '  status="' + this.status + '"\n') +
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
