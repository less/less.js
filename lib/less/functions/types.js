import Keyword from "../tree/keyword";
import DetachedRuleset from "../tree/detached-ruleset";
import Dimension from "../tree/dimension";
import Color from "../tree/color";
import Quoted from "../tree/quoted";
import Anonymous from "../tree/anonymous";
import URL from "../tree/url";
import Operation from "../tree/operation";
import functionRegistry from "./function-registry";

const isa = (n, Type) => (n instanceof Type) ? Keyword.True : Keyword.False;

const isunit = (n, unit) => {
    if (unit === undefined) {
        throw { type: "Argument", message: "missing the required second argument to isunit." };
    }
    unit = typeof unit.value === "string" ? unit.value : unit;
    if (typeof unit !== "string") {
        throw { type: "Argument", message: "Second argument to isunit should be a unit or a string." };
    }
    return (n instanceof Dimension) && n.unit.is(unit) ? Keyword.True : Keyword.False;
};

const getItemsFromNode = node => {
    // handle non-array values as an array of length 1
    // return 'undefined' if index is invalid
    const items = Array.isArray(node.value) ?
        node.value : Array(node);

    return items;
};

functionRegistry.addMultiple({
    isruleset(n) {
        return isa(n, DetachedRuleset);
    },
    iscolor(n) {
        return isa(n, Color);
    },
    isnumber(n) {
        return isa(n, Dimension);
    },
    isstring(n) {
        return isa(n, Quoted);
    },
    iskeyword(n) {
        return isa(n, Keyword);
    },
    isurl(n) {
        return isa(n, URL);
    },
    ispixel(n) {
        return isunit(n, 'px');
    },
    ispercentage(n) {
        return isunit(n, '%');
    },
    isem(n) {
        return isunit(n, 'em');
    },
    isunit,
    unit(val, unit) {
        if (!(val instanceof Dimension)) {
            throw { type: "Argument",
                message: `the first argument to unit must be a number${val instanceof Operation ? ". Have you forgotten parenthesis?" : ""}` };
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
        return new Dimension(val.value, unit);
    },
    "get-unit"(n) {
        return new Anonymous(n.unit);
    },
    extract(values, index) {
        index = index.value - 1; // (1-based index)

        return getItemsFromNode(values)[index];
    },
    length(values) {
        return new Dimension(getItemsFromNode(values).length);
    }
});
