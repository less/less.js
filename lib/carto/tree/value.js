(function(tree) {

tree.Value = function Value(value) {
    this.value = value;
};

tree.Value.prototype = {
    is: 'value',
    ev: function(env) {
        if (this.value.length === 1) {
            return this.value[0].ev(env);
        } else {
            return new tree.Value(this.value.map(function(v) {
                return v.ev(env);
            }));
        }
    },
    toString: function(env, selector, sep, format) {
        return this.value.map(function(e) {
            return e.toString(env, format);
        }).join(sep || ', ');
    },
    clone: function() {
        var obj = Object.create(tree.Value.prototype);
        if (Array.isArray(obj)) obj.value = this.value.slice();
        else obj.value = this.value;
        obj.is = this.is;
        return obj;
    },

    toJS: function() {
      //var v = this.value[0].value[0];
      var val = this.ev();
      var v = val.toString();
      if(val.is === "color" || val.is === 'uri' || val.is === 'string' || val.is === 'keyword') {
        v = "'" + v + "'";
      } else if (val.is === 'field') {
        // replace [variable] by ctx['variable']
        v = v.replace(/\[(.*)\]/g, "data['$1']");
      }
      return "_value = " + v + ";";
    }

};

})(require('../tree'));
