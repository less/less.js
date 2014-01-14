(function (tree) {

tree.Selector = function (elements, extendList, condition, index, currentFileInfo, isReferenced) {
    this.elements = elements;
    this.extendList = extendList;
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
        if (this.elements) {
            this.elements = visitor.visitArray(this.elements);
        }
        if (this.extendList) {
            this.extendList = visitor.visitArray(this.extendList);
        }
        if (this.condition) {
            this.condition = visitor.visit(this.condition);
        }
    },
    createDerived: function(elements, extendList, evaldCondition) {
        evaldCondition = (evaldCondition != null) ? evaldCondition : this.evaldCondition;
        var newSelector = new(tree.Selector)(elements, extendList || this.extendList, this.condition, this.index, this.currentFileInfo, this.isReferenced);
        newSelector.evaldCondition = evaldCondition;
        return newSelector;
    },
    match: function (other) {
        var elements = this.elements,
            len = elements.length,
            oelements, olen, i;
            
        oelements = other.elements.map( function(v) {
            return v.combinator.value + (v.value.value || v.value);
        }).join("").match(/[,&#\.\w-]([\w-]|(\\.))*/g); 
        // ^ regexp could be more simple but see test/less/css-escapes.less:17, doh!
        
        if (!oelements) {
            return 0;
        }

        if (oelements[0] === "&") {
            oelements.shift();
        }

        olen = oelements.length;
        if (olen === 0 || len < olen) {
            return 0;
        } else {
            for (i = 0; i < olen; i++) {
                if (elements[i].value !== oelements[i]) {
                    return 0;
                }
            }
        }
        return olen; // return number of matched elements
    },
    eval: function (env) {
        var evaldCondition = this.condition && this.condition.eval(env),
            elements = this.elements, extendList = this.extendList;

        elements = elements && elements.map(function (e) { return e.eval(env); });
        extendList = extendList && extendList.map(function(extend) { return extend.eval(env); });

        return this.createDerived(elements, extendList, evaldCondition);
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
