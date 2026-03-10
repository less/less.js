import Variable from '../tree/variable.js';
import Anonymous from '../tree/anonymous.js';

/** @param {*[]} args */
const styleExpression = function (args) {
    args = Array.prototype.slice.call(args);
    if (args.length === 0) {
        throw { type: 'Argument', message: 'one or more arguments required' };
    }

    const entityList = [new Variable(args[0].value, this.index, this.currentFileInfo).eval(this.context)];

    const result = entityList.map(a => { return a.toCSS(this.context); }).join(this.context.compress ? ',' : ', ');

    return new Anonymous(`style(${result})`);
};

export default {
    /** @param {...*} args */
    style: function(...args) {
        try {
            return styleExpression.call(this, args);
        } catch (e) {
            // When style() is used as a CSS function (e.g. @container style(--responsive: true)),
            // arguments won't be valid Less variables. Return undefined to let the
            // parser fall through and treat it as plain CSS.
        }
    },
};
