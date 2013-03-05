(function (tree) {

tree.Extend = function Extend(selector, option, index) {
    this.selector = selector;
    this.option = option;
    this.index = index;

    switch(option) {
        case "all":
            this.deep = true;
            this.any = true;
        break;
        case "deep":
            this.deep = true;
            this.any = false;
        break;
        case "any":
            this.deep = false;
            this.any = true;
        break;
        default:
            this.deep = false;
            this.any = false;
        break;
    }
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
        var selfElements = [];

        for(i = 0; i < selectors.length; i++) {
            selfElements = selfElements.concat(selectors[i].elements);
        }

        this.selfSelectors = [{ elements: selfElements }];
    }
};

})(require('../tree'));
