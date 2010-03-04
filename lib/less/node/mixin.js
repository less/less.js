if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.mixin = {};
tree.mixin.Call = function MixinCall(elements, args) {
    this.selector = new(tree.Selector)(elements);
    this.arguments = args;
};
tree.mixin.Call.prototype = {
    eval: function (env) {
        var mixins, rules = [];

        for (var i = 0; i < env.frames.length; i++) {
            if ((mixins = env.frames[i].find(this.selector)).length > 0) {
                for (var m = 0; m < mixins.length; m++) {
                    Array.prototype.push.apply(rules, mixins[m].rules);
                }
                return rules;
            }
        }
        throw new(Error)("mixin " + this.selector.toCSS() + " is undefined");
    }
};

tree.mixin.Definition = function MixinDefinition(name, params) {
    this.name = name;
    this.params = params;
};
