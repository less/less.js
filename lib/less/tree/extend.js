(function (tree) {

tree.Extend = function Extend(elements, index) {
    this.selector = new(tree.Selector)(elements);
    this.index = index;
};

tree.Extend.prototype.eval = function Extend_eval(env) {
    var selfSelectors = findSelfSelectors(env.selectors),
        targetValue = this.selector.elements[0].value;

    env.frames.forEach(function(frame) {
        frame.rulesets().forEach(function(rule) {
            rule.selectors.forEach(function(selector) {
                selector.elements.forEach(function(element, idx) {
                    if (element.value === targetValue) {
                        selfSelectors.forEach(function(_selector) {
                            rule.selectors.push(new tree.Selector(
                                selector.elements
                                    .slice(0, idx)
                                    .concat(_selector.elements)
                                    .concat(selector.elements.slice(idx + 1))
                            ));
                        });
                    }
                });
            });
        });
    });
    return this;
};

function findSelfSelectors(selectors) {
    var ret = [];

    (function loop(elem, i) {
        if (selectors[i] && selectors[i].length) {
            selectors[i].forEach(function(s) {
                loop(s.elements.concat(elem), i + 1);
            });
        }
        else {
            ret.push({ elements: elem });
        }
    })([], 0);

    return ret;
}


})(require('../tree'));
