module.exports = function(functions, tree) {
    var defaultFunc = {
        eval: function () {
            var v = this.value_, e = this.error_;
            if (e) {
                throw e;
            }
            if (v != null) {
                return v ? tree.True : tree.False;
            }
        },
        value: function (v) {
            this.value_ = v;
        },
        error: function (e) {
            this.error_ = e;
        },
        reset: function () {
            this.value_ = this.error_ = null;
        }
    };

    functions.functionRegistry.add("default", defaultFunc.eval.bind(defaultFunc));
    tree.defaultFunc = defaultFunc;
};
