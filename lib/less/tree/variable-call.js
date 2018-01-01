import Node from "./node";
import Variable from "./variable";

export default class VariableCall extends Node {
    constructor(variable) {
        super();
        this.variable = variable;
        this.allowRoot = true;
    }

    eval(context) {
        const detachedRuleset = new Variable(this.variable).eval(context);
        return detachedRuleset.callEval(context);
    }
}

VariableCall.prototype.type = "VariableCall";
