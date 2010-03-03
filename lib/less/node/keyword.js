if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Keyword = function Keyword(value) { this.value = value };
tree.Keyword.prototype = {
    eval: function () { return this },
    toCSS: function () { return this.value }
};
