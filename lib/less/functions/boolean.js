import functionRegistry from "./function-registry";
import Anonymous from "../tree/anonymous";
import Keyword from "../tree/keyword";

functionRegistry.addMultiple({
    boolean(condition) {
        return condition ? Keyword.True : Keyword.False;
    },

    if(condition, trueValue, falseValue) {
        return condition ? trueValue
            : (falseValue || new Anonymous);
    }
});
