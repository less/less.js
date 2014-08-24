var Keyword = require("../tree/keyword.js"),
    Dimension = require("../tree/dimension.js"),
    Color = require("../tree/color.js"),
    Quoted = require("../tree/quoted.js"),
    Anonymous = require("../tree/anonymous.js"),
    URL = require("../tree/url.js"),
    Operation = require("../tree/operation.js"),
    functionRegistry = require("./function-registry.js");

var isa = function (n, Type) {
    return (n instanceof Type) ? Keyword.True : Keyword.False;
    },
    isunit = function (n, unit) {
        return (n instanceof Dimension) && n.unit.is(unit.value || unit) ? Keyword.True : Keyword.False;
    };
functionRegistry.addMultiple({
    iscolor: function (n) {
        return isa(n, Color);
    },
    isnumber: function (n) {
        return isa(n, Dimension);
    },
    isstring: function (n) {
        return isa(n, Quoted);
    },
    iskeyword: function (n) {
        return isa(n, Keyword);
    },
    isurl: function (n) {
        return isa(n, URL);
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
        if(!(val instanceof Dimension)) {
            throw { type: "Argument", message: "the first argument to unit must be a number" + (val instanceof Operation ? ". Have you forgotten parenthesis?" : "") };
        }
        if (unit) {
            if (unit instanceof Keyword) {
                unit = unit.value;
            } else {
                unit = unit.toCSS();
            }
        } else {
            unit = "";
        }
        return new(Dimension)(val.value, unit);
    },
    "get-unit": function (n) {
        return new(Anonymous)(n.unit);
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
        return new Dimension(n);
    }
});
