if (typeof(window) === 'undefined') { var tree = require(require('path').join(__dirname, '..', '..', 'less', 'tree')); }

tree.Call = function Call(name, args) {
    this.name = name;
    this.args = args;
};
