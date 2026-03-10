import Node from './node.js';
import Variable from './variable.js';
import Ruleset from './ruleset.js';
import Selector from './selector.js';

class NamespaceValue extends Node {
    get type() { return 'NamespaceValue'; }

    constructor(ruleCall, lookups, index, fileInfo) {
        super();
        this.value = ruleCall;
        this.lookups = lookups;
        this._index = index;
        this._fileInfo = fileInfo;
    }

    eval(context) {
        let i, name, rules = this.value.eval(context);

        for (i = 0; i < this.lookups.length; i++) {
            name = this.lookups[i];

            if (Array.isArray(rules)) {
                rules = new Ruleset([new Selector()], rules);
            }

            if (name === '') {
                rules = rules.lastDeclaration();
            }
            else if (name.charAt(0) === '@') {
                if (name.charAt(1) === '@') {
                    name = `@${new Variable(name.slice(1)).eval(context).value}`;
                }
                if (rules.variables) {
                    rules = rules.variable(name);
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
                if (rules.properties) {
                    rules = rules.property(name);
                }

                if (!rules) {
                    throw { type: 'Name',
                        message: `property "${name.slice(1)}" not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
                rules = rules[rules.length - 1];
            }

            if (rules.value) {
                rules = rules.eval(context).value;
            }
            if (rules.ruleset) {
                rules = rules.ruleset.eval(context);
            }
        }
        return rules;
    }
}

export default NamespaceValue;
