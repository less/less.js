// @ts-check
/** @import { EvalContext, FileInfo } from './node.js' */
import Node from './node.js';
import Variable from './variable.js';
import Ruleset from './ruleset.js';
import Selector from './selector.js';

class NamespaceValue extends Node {
    get type() { return 'NamespaceValue'; }

    /**
     * @param {Node} ruleCall
     * @param {string[]} lookups
     * @param {number} index
     * @param {FileInfo} fileInfo
     */
    constructor(ruleCall, lookups, index, fileInfo) {
        super();
        this.value = ruleCall;
        this.lookups = lookups;
        this._index = index;
        this._fileInfo = fileInfo;
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        let i, name;
        /** @type {Ruleset | Node | Node[]} */
        let rules = this.value.eval(context);

        for (i = 0; i < this.lookups.length; i++) {
            name = this.lookups[i];

            if (Array.isArray(rules)) {
                rules = new Ruleset([new Selector()], rules);
            }

            const rs = /** @type {Ruleset} */ (rules);

            if (name === '') {
                rules = rs.lastDeclaration();
            }
            else if (name.charAt(0) === '@') {
                if (name.charAt(1) === '@') {
                    name = `@${new Variable(name.slice(1)).eval(context).value}`;
                }
                if (rs.variables) {
                    rules = rs.variable(name);
                }

                if (!rules) {
                    throw { type: 'Name',
                        message: `variable ${name} not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
            }
            else {
                if (name.substring(0, 2) === '$@') {
                    name = `$${new Variable(name.slice(1)).eval(context).value}`;
                }
                else {
                    name = name.charAt(0) === '$' ? name : `$${name}`;
                }
                if (rs.properties) {
                    rules = rs.property(name);
                }

                if (!rules) {
                    throw { type: 'Name',
                        message: `property "${name.slice(1)}" not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
                const rulesArr = /** @type {Node[]} */ (rules);
                rules = rulesArr[rulesArr.length - 1];
            }

            const current = /** @type {Node} */ (rules);
            if (current.value) {
                rules = /** @type {Node} */ (current.eval(context).value);
            }
            const currentNode = /** @type {Node & { ruleset?: Node }} */ (rules);
            if (currentNode.ruleset) {
                rules = currentNode.ruleset.eval(context);
            }
        }
        return /** @type {Node} */ (rules);
    }
}

export default NamespaceValue;
