import Expression from './expression.js';
import Value from './value.js';

/**
 * Merges declarations with merge flags (+ or ,) into combined values.
 * Used by both the ToCSSVisitor and AtRule eval.
 */
export default function mergeRules(rules) {
    if (!rules) {
        return;
    }

    const groups    = {};
    const groupsArr = [];

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule.merge) {
            const key = rule.name;
            groups[key] ? rules.splice(i--, 1) :
                groupsArr.push(groups[key] = []);
            groups[key].push(rule);
        }
    }

    groupsArr.forEach(group => {
        if (group.length > 0) {
            const result = group[0];
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
