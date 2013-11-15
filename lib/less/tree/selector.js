(function (tree) {

tree.Selector = function (elements, extendList, condition, index, currentFileInfo, isReferenced) {
    this.elements = elements;
    this.extendList = extendList || [];
    this.condition = condition;
    this.currentFileInfo = currentFileInfo || {};
    this.isReferenced = isReferenced;
    if (!condition) {
        this.evaldCondition = true;
    }
};
tree.Selector.prototype = {
    type: "Selector",
    accept: function (visitor) {
        this.elements = visitor.visit(this.elements);
        this.extendList = visitor.visit(this.extendList);
        this.condition = visitor.visit(this.condition);
    },
    createDerived: function(elements, extendList, evaldCondition) {
        /*jshint eqnull:true */
        evaldCondition = evaldCondition != null ? evaldCondition : this.evaldCondition;
        var newSelector = new(tree.Selector)(elements, extendList || this.extendList, this.condition, this.index, this.currentFileInfo, this.isReferenced);
        newSelector.evaldCondition = evaldCondition;
        return newSelector;
    },
    match: function (other) {
        var elements = this.elements,
            len = elements.length,
            oelements, olen, max, i;

        oelements = other.elements.slice(
            (other.elements.length && other.elements[0].value === "&") ? 1 : 0);
        olen = oelements.length;
        max = Math.min(len, olen);

        if (olen === 0 || len < olen) {
            return 0;
        } else {
            for (i = 0; i < max; i++) {
                if (elements[i].value !== oelements[i].value) {
                    return 0;
                }
            }
        }
        return max; // return number of matched selectors 
    },
    eval: function (env) {
        var evaldCondition = this.condition && this.condition.eval(env);

        return this.createDerived(this.elements.map(function (e) {
            return e.eval(env);
        }), this.extendList.map(function(extend) {
            return extend.eval(env);
        }), evaldCondition);
    },
    genCSS: function (env, output) {
        var i, element;
        if ((!env || !env.firstSelector) && this.elements[0].combinator.value === "") {
            output.add(' ', this.currentFileInfo, this.index);
        }
        if (!this._css) {
            //TODO caching? speed comparison?
            for(i = 0; i < this.elements.length; i++) {
                element = this.elements[i];
                element.genCSS(env, output);
            }
        }
    },
    toCSS: tree.toCSS,
    markReferenced: function () {
        this.isReferenced = true;
    },
    getIsReferenced: function() {
        return !this.currentFileInfo.reference || this.isReferenced;
    },
    getIsOutput: function() {
        return this.evaldCondition;
    }
};

})(require('../tree'));
