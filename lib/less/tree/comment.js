if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Comment = function Comment(value) {
    this.value = value;
};
tree.Comment.prototype = {
    toCSS: function () {
        return this.value;
    }
};
