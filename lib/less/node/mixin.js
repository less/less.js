if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.mixin = {};
tree.mixin.Call = function MixinCall(mixins) {
    this.mixins = mixins;
};
tree.mixin.Call.prototype = {
    toCSS: function (context, env) {

    }
};
