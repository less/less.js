import Call from '../tree/call';
import CustomProperty from '../tree/custom-property';
import Dimension from '../tree/dimension';

const MathHelper = (fn, unit, n) => {
    if (n instanceof Call && n.name === 'var') {
        if (n.args && n.args.length >= 1) {
            return new Call(fn.name, [new CustomProperty(n.args[0].toCSS(), n.args[1] ? n.args[1].toCSS() : null, n._index, n._fileInfo)], n._index, n._fileInfo);
        } else {
            throw { type: 'Argument', message: 'var must contain one expression' };
        }
    }
    if (!(n instanceof Dimension)) {
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