import Keyword from "../tree/keyword";
import functionRegistry from "./function-registry";

const defaultFunc = {
    eval() {
        const v = this.value_, e = this.error_;
        if (e) {
            throw e;
        }
        if (v != null) {
            return v ? Keyword.True : Keyword.False;
        }
    },
    value(v) {
        this.value_ = v;
    },
    error(e) {
        this.error_ = e;
    },
    reset() {
        this.value_ = this.error_ = null;
    }
};

functionRegistry.add("default", defaultFunc.eval.bind(defaultFunc));

export default defaultFunc;
