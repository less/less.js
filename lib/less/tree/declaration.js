import Node from "./node";
import Value from "./value";
import Keyword from "./keyword";
import Anonymous from "./anonymous";

export default class Declaration extends Node {
    constructor(name, value, important, merge, index, currentFileInfo, inline, variable) {
        super();
        this.name = name;
        this.value = (value instanceof Node) ? value : new Value([value ? new Anonymous(value) : null]);
        this.important = important ? ' ' + important.trim() : '';
        this.merge = merge;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.inline = inline || false;
        this.variable = (variable !== undefined) ? variable
            : (name.charAt && (name.charAt(0) === '@'));
        this.allowRoot = true;
        this.setParent(this.value, this);
    }

    genCSS(context, output) {
        output.add(this.name + (context.compress ? ':' : ': '), this.fileInfo(), this.getIndex());
        try {
            this.value.genCSS(context, output);
        }
        catch (e) {
            e.index = this._index;
            e.filename = this._fileInfo.filename;
            throw e;
        }
        output.add(this.important + ((this.inline || (context.lastRule && context.compress)) ? "" : ";"), this._fileInfo, this._index);
    }

    eval(context) {
        let strictMathBypass = false;
        let name = this.name;
        let evaldValue;
        let variable = this.variable;
        if (typeof name !== "string") {
            // expand 'primitive' name directly to get
            // things faster (~10% for benchmark.less):
            name = (name.length === 1) && (name[0] instanceof Keyword) ?
                name[0].value : evalName(context, name);
            variable = false; // never treat expanded interpolation as new variable name
        }
        if (name === "font" && !context.strictMath) {
            strictMathBypass = true;
            context.strictMath = true;
        }
        try {
            context.importantScope.push({});
            evaldValue = this.value.eval(context);

            if (!this.variable && evaldValue.type === "DetachedRuleset") {
                throw { message: "Rulesets cannot be evaluated on a property.",
                    index: this.getIndex(), filename: this.fileInfo().filename };
            }
            let important = this.important;
            const importantResult = context.importantScope.pop();
            if (!important && importantResult.important) {
                important = importantResult.important;
            }

            return new Declaration(name,
                evaldValue,
                important,
                this.merge,
                this.getIndex(), this.fileInfo(), this.inline,
                variable);
        }
        catch (e) {
            if (typeof e.index !== 'number') {
                e.index = this.getIndex();
                e.filename = this.fileInfo().filename;
            }
            throw e;
        }
        finally {
            if (strictMathBypass) {
                context.strictMath = false;
            }
        }
    }

    makeImportant() {
        return new Declaration(this.name,
            this.value,
            "!important",
            this.merge,
            this.getIndex(), this.fileInfo(), this.inline);
    }
}

function evalName(context, name) {
    let value = "";
    let i;
    const n = name.length;
    const output = {add(s) {value += s;}};
    for (i = 0; i < n; i++) {
        name[i].eval(context).genCSS(context, output);
    }
    return value;
}

Declaration.prototype.type = "Declaration";