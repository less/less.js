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

        var thisframe = env.frames.filter(function(f) {
            return f.name == this.name;
        });
        if (thisframe.length) {
            return thisframe[0].value.eval(env);
        } else {
            env.error({
                message: 'variable ' + this.name + ' is undefined',
                index: this.index
            });
        }
    }
};

})(require('mess/tree'));
