import Dimension from '../tree/dimension';
import * as utils from '../utils';

const MathHelper = (fn, unit, n) => {
    if (!(n instanceof Dimension)) {
        throw { type: 'Argument', message: 'argument must be a number' };
    }
    if (utils.isNullOrUndefined(unit)) {
        unit = n.unit;
    } else {
        n = n.unify();
    }
    return new Dimension(fn(parseFloat(n.value)), unit);
};

export default MathHelper;