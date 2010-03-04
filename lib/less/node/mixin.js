if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.mixin = {};
tree.mixin.Call = function MixinCall(elements, args) {
    this.selector = new(tree.Selector)(elements);
    this.arguments = args;
};
tree.mixin.Call.prototype = {
    eval: function (env) {
        var mixin, rules = [];

        for (var i = 0; i < env.frames.length; i++) {
            if (mixin = env.frames[i].find(this.selector)) {
                for (var r = 0; r < mixin.rules.length; r++) {
                    rules.push(mixin.rules[r]);
                }
                return rules;
            }
        }
        throw new(Error)("mixin " + this.selector.toCSS() + " is undefined");
    }
};
