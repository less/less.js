// @ts-check
import Expression from './expression.js';
import Value from './value.js';
import Node from './node.js';

/**
 * Merges declarations with merge flags (+ or ,) into combined values.
 * Used by both the ToCSSVisitor and AtRule eval.
 * @param {Node[]} rules
 */
export default function mergeRules(rules) {
    if (!rules) {
        return;
    }

    /** @type {Record<string, Array<Node & { merge: string, name: string, value: Node, important: string }>>} */
    const groups    = {};
    /** @type {Array<Array<Node & { merge: string, name: string, value: Node, important: string }>>} */
    const groupsArr = [];

    for (let i = 0; i < rules.length; i++) {
        const rule = /** @type {Node & { merge: string, name: string }} */ (rules[i]);
        if (rule.merge) {
            const key = rule.name;
            groups[key] ? rules.splice(i--, 1) :
                groupsArr.push(groups[key] = []);
            groups[key].push(/** @type {Node & { merge: string, name: string, value: Node, important: string }} */ (rule));
        }
    }

    groupsArr.forEach(group => {
        if (group.length > 0) {
            const result = group[0];
            /** @type {Node[]} */
            let space  = [];
            const comma  = [new Expression(space)];
            group.forEach(rule => {
                if ((rule.merge === '+') && (space.length > 0)) {
                    comma.push(new Expression(space = []));
                }
                space.push(rule.value);
                result.important = result.important || rule.important;
            });
            result.value = new Value(comma);
        }
    });
}
