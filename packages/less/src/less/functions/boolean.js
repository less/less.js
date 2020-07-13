import Anonymous from '../tree/anonymous';
import Keyword from '../tree/keyword';

function boolean(condition) {
    return condition ? Keyword.True : Keyword.False;
}

/**
 * Functions with evalArgs set to false are sent context
 * as the first argument.
 */
function If(context, condition, trueValue, falseValue) {
    return condition.eval(context) ? trueValue.eval(context)
        : (falseValue ? falseValue.eval(context) : new Anonymous);
}
If.evalArgs = false

export default { boolean, 'if': If };
