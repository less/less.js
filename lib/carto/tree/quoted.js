(function(tree) {

tree.Quoted = function Quoted(content) {
    this.value = content || '';
};

tree.Quoted.prototype = {
    is: 'string',

    toString: function(quotes) {
        var xmlvalue = this.value.replace(/&/g, '&amp;');
        xmlvalue = xmlvalue.replace(/\'/g, '&apos;');
        xmlvalue = xmlvalue.replace(/\"/g, '&quot;');
        xmlvalue = xmlvalue.replace(/\</g, '&lt;');
        xmlvalue = xmlvalue.replace(/\>/g, '&gt;');
        return (quotes === true) ? "'" + xmlvalue + "'" : this.value;
    },

    'ev': function() {
        return this;
    },

    operate: function(env, op, other) {
        return new tree.Quoted(tree.operate(op, this.toString(), other.toString(this.contains_field)));
    }
};

})(require('../tree'));
