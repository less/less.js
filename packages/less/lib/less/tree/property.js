// @ts-check
/** @import { EvalContext, FileInfo } from './node.js' */
import Node from './node.js';
import Declaration from './declaration.js';
import Ruleset from './ruleset.js';

class Property extends Node {
    get type() { return 'Property'; }

    /**
     * @param {string} name
     * @param {number} index
     * @param {FileInfo} currentFileInfo
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
        let property;
        const name = this.name;
        // TODO: shorten this reference
        const mergeRules = /** @type {{ less: { visitors: { ToCSSVisitor: { prototype: { _mergeRules: (rules: Declaration[]) => void } } } } }} */ (context.pluginManager).less.visitors.ToCSSVisitor.prototype._mergeRules;

        if (this.evaluating) {
            throw { type: 'Name',
                message: `Recursive property reference for ${name}`,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }

        this.evaluating = true;

        property = this.find(context.frames, function (/** @type {Node} */ frame) {
            let v;
            const vArr = /** @type {Ruleset} */ (frame).property(name);
            if (vArr) {
                for (let i = 0; i < vArr.length; i++) {
                    v = vArr[i];

                    vArr[i] = new Declaration(v.name,
                        v.value,
                        v.important,
                        v.merge,
                        v.index,
                        v.currentFileInfo,
                        v.inline,
                        v.variable
                    );
                }
                mergeRules(vArr);

                v = vArr[vArr.length - 1];
                if (v.important) {
                    const importantScope = context.importantScope[context.importantScope.length - 1];
                    importantScope.important = v.important;
                }
                v = v.value.eval(context);
                return v;
            }
        });
        if (property) {
            this.evaluating = false;
            return property;
        } else {
            throw { type: 'Name',
                message: `Property '${name}' is undefined`,
                filename: this.currentFileInfo.filename,
                index: this.index };
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

export default Property;
