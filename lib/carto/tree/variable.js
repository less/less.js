(function(tree) {

tree.Variable = function Variable(name, index, filename) {
    this.name = name;
    this.index = index;
    this.filename = filename;
};

tree.Variable.prototype = {
    is: 'variable',
    toString: function() {
        return this.name;
    },
    eval: function(env) {
        var variable,
            v,
            name = this.name;

        if (this._css) return this._css;

        var thisframe = env.frames.filter(function(f) {
            return f.name == this.name;
        }.bind(this));
        if (thisframe.length) {
            return thisframe[0].value.eval(env);
        } else {
            env.error({
                message: 'variable ' + this.name + ' is undefined',
                index: this.index,
                type: 'runtime',
                filename: this.filename
            });
            return {
                is: 'undefined',
                value: 'undefined'
            };
        }
    }
};

})(require('../tree'));
