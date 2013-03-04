(function (tree) {

tree.Extend = function Extend(selector, option, index) {
    this.selector = selector;
    this.option = option;
    this.index = index;
};

tree.Extend.prototype = {
    type: "Extend",
    accept: function (visitor) {
        this.selector = visitor.visit(this.selector);
    },
    eval: function (env) {
        return new(tree.Extend)(this.selector.eval(env), this.option, this.index);
    },
    clone: function (env) {
        return new(tree.Extend)(this.selector, this.option, this.index);
    },
    findSelfSelectors: function (selectors) {
        var selfSelectors = [];

        // multiplies out the selectors, e.g.
        // [[.a],[.b,.c]] => [.a.b,.a.c]
        (function loop(elem, i) {
            if (selectors[i] && selectors[i].length) {
                selectors[i].forEach(function(s) {
                    loop(s.elements.concat(elem), i + 1);
                });
            }
            else {
                selfSelectors.push({ elements: elem });
            }
        })([], 0);

        this.selfSelectors = selfSelectors;
    }
};

})(require('../tree'));
