(function(tree) {

tree.Variable = function(name, index) {
    this.name = name;
    this.index = index;
};
tree.Variable.prototype = {
    eval: function(env) {
        var variable,
            v,
            that = this;
            name = this.name;

        if (this._css) return this._css;

        if (variable = tree.find(env.frames, function(frame) {
            if (v = frame.variable(name)) {
                return that._css = v.value.eval(env);
            }
        })) {
            return variable;
        } else {
            throw {
                message: 'variable ' + this.name + ' is undefined',
                index: this.index
            };
        }
    }
};

})(require('mess/tree'));
