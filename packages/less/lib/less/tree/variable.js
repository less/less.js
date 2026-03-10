// @ts-check
/** @import { EvalContext, FileInfo } from './node.js' */
import Node from './node.js';
import Call from './call.js';
import Ruleset from './ruleset.js';

class Variable extends Node {
    get type() { return 'Variable'; }

    /**
     * @param {string} name
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     */
    constructor(name, index, currentFileInfo) {
        super();
        this.name = name;
        this._index = index;
        this._fileInfo = currentFileInfo;
        /** @type {boolean | undefined} */
        this.evaluating = undefined;
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        let variable, name = this.name;

        if (name.indexOf('@@') === 0) {
            name = `@${new Variable(name.slice(1), this.getIndex(), this.fileInfo()).eval(context).value}`;
        }

        if (this.evaluating) {
            throw { type: 'Name',
                message: `Recursive variable definition for ${name}`,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }

        this.evaluating = true;

        variable = this.find(context.frames, function (frame) {
            const v = /** @type {Ruleset} */ (frame).variable(name);
            if (v) {
                if (v.important) {
                    const importantScope = context.importantScope[context.importantScope.length - 1];
                    importantScope.important = v.important;
                }
                // If in calc, wrap vars in a function call to cascade evaluate args first
                if (context.inCalc) {
                    return (new Call('_SELF', [v.value], 0, undefined)).eval(context);
                }
                else {
                    return v.value.eval(context);
                }
            }
        });
        if (variable) {
            this.evaluating = false;
            return variable;
        } else {
            throw { type: 'Name',
                message: `variable ${name} is undefined`,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }
    }

    /**
     * @param {Node[]} obj
     * @param {(frame: Node) => Node | undefined} fun
     * @returns {Node | null}
     */
    find(obj, fun) {
        for (let i = 0, r; i < obj.length; i++) {
            r = fun.call(obj, obj[i]);
            if (r) { return r; }
        }
        return null;
    }
}

export default Variable;
