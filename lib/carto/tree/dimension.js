(function(tree) {
var _ = require('underscore');
//
// A number with a unit
//
tree.Dimension = function Dimension(value, unit, index) {
    this.value = parseFloat(value);
    this.unit = unit || null;
    this.index = index;
};

tree.Dimension.prototype = {
    is: 'float',
    'ev': function (env) {
        if (this.unit && _.indexOf(['px','%','m','cm','in','mm','pt','pc'], this.unit) === -1) {
            env.error({
                message: "Invalid unit: '" + this.unit + "'",
                index: this.index
            });
        }

        //normalize units which are not px or %
        if (this.unit && _.indexOf(['px','%'], this.unit) === -1) {
            if(!env.ppi) {
                env.error({
                    message: "ppi is not set, so metric units can't be used",
                    index: this.index
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }
            
            //convert all units to inch
            switch(this.unit) {
                case 'm': 
                    this.value = this.value / 0.0254;
                    break;
                case 'cm': 
                    this.value = this.value / 2.54;
                    break;
                case 'mm': 
                    this.value = this.value / 25.4;
                    break;
                case 'pt': 
                    this.value = this.value / 72;
                    break;
                case 'pc': 
                    this.value = this.value / 6;
                    break;
            }

            //convert inch to px using ppi
            this.value = this.value * env.ppi;
            this.unit = "px";
        }

        return this;
    },
    toColor: function() {
        return new tree.Color([this.value, this.value, this.value]);
    },
    round: function() {
        this.value = Math.round(this.value);
        return this;
    },
    toString: function() {
        return this.value.toString();
    },

    operate: function(env, op, other) {
        if(this.unit === '%' && other.unit !== '%') {
            env.error({ 
                message: "If two operands differ, the first must not be %",
                index: this.index
            });
            return {
                is: 'undefined',
                value: 'undefined'
            };
        }

        if(this.unit !== '%' && other.unit === '%') {
            if(op === '*' || op === '/' || op === '%') {
                env.error({
                    message: "Percent values can only be added or subtracted from other values",
                    index: this.index
                });
                return {
                    is: 'undefined',
                    value: 'undefined'
                };
            }

            return new tree.Dimension(tree.operate(op, this.value, this.value * other.value * 0.01), this.unit);       
        }

        //here the operands are either the same (% or undefined or px), or one is undefined and the other is px
        return new tree.Dimension(tree.operate(op, this.value, other.value), this.unit || other.unit);
    }
};

})(require('../tree'));
