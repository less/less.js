var Keyword = require("../tree/keyword.js");
module.exports = function(functions, tree) {
    var isa = function (n, Type) {
        return (n instanceof Type) ? Keyword.True : Keyword.False;
        },
        isunit = function (n, unit) {
            return (n instanceof tree.Dimension) && n.unit.is(unit.value || unit) ? Keyword.True : Keyword.False;
        };
    functions.functionRegistry.addMultiple({
        iscolor: function (n) {
            return isa(n, tree.Color);
        },
        isnumber: function (n) {
            return isa(n, tree.Dimension);
        },
        isstring: function (n) {
            return isa(n, tree.Quoted);
        },
        iskeyword: function (n) {
            return isa(n, tree.Keyword);
        },
        isurl: function (n) {
            return isa(n, tree.URL);
        },
        ispixel: function (n) {
            return isunit(n, 'px');
        },
        ispercentage: function (n) {
            return isunit(n, '%');
        },
        isem: function (n) {
            return isunit(n, 'em');
        },
        isunit: isunit,
        unit: function (val, unit) {
            if(!(val instanceof tree.Dimension)) {
                throw { type: "Argument", message: "the first argument to unit must be a number" + (val instanceof tree.Operation ? ". Have you forgotten parenthesis?" : "") };
            }
            if (unit) {
                if (unit instanceof tree.Keyword) {
                    unit = unit.value;
                } else {
                    unit = unit.toCSS();
                }
            } else {
                unit = "";
            }
            return new(tree.Dimension)(val.value, unit);
        },
        "get-unit": function (n) {
            return new(tree.Anonymous)(n.unit);
        },
        extract: function(values, index) {
            index = index.value - 1; // (1-based index)
            // handle non-array values as an array of length 1
            // return 'undefined' if index is invalid
            return Array.isArray(values.value) ?
                values.value[index] : Array(values)[index];
        },
        length: function(values) {
            var n = Array.isArray(values.value) ? values.value.length : 1;
            return new tree.Dimension(n);
        }
    });
};
