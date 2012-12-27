(function(tree) {

tree.LayerXML = function(obj, styles) {
    var dsoptions = [];
    for (var i in obj.Datasource) {
        dsoptions.push('<Parameter name="' + i + '"><![CDATA[' +
            obj.Datasource[i] + ']]></Parameter>');
    }

    var prop_string = '';
    for (var prop in obj.properties) {
        prop_string += '  ' + prop + '="' + obj.properties[prop] + '"\n';
    }

    return '<Layer' +
        ' name="' + obj.name + '"\n' +
        prop_string +
        ((typeof obj.status === 'undefined') ? '' : '  status="' + obj.status + '"\n') +
        '  srs="' + obj.srs + '">\n    ' +
        styles.reverse().map(function(s) {
            return '<StyleName>' + s + '</StyleName>';
        }).join('\n    ') +
        '\n    <Datasource>\n       ' +
        dsoptions.join('\n       ') +
        '\n    </Datasource>\n' +
        '  </Layer>\n';
};

})(require('../tree'));
