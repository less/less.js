import Dimension from '../tree/dimension.js';

const MathHelper = (fn, unit, cssEvaluable, n) => {
    if (!(n instanceof Dimension)) {
        // A runtime CSS value such as var()/env() stays an unevaluated call and
        // cannot be resolved to a number at compile time. Only functions with a
        // CSS equivalent may be left for the browser; the rest (percentage, ceil,
        // floor, round) have no CSS form and keep erroring on such input.
        if (cssEvaluable && n && n.type === 'Call') {
            return undefined;
        }
        throw { type: 'Argument', message: 'argument must be a number' };
    }
    if (unit === null) {
        unit = n.unit;
    } else {
        n = n.unify();
    }
    return new Dimension(fn(parseFloat(n.value)), unit);
};

export default MathHelper;