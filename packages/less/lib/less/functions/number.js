import Dimension from '../tree/dimension.js';
import Anonymous from '../tree/anonymous.js';
import mathHelper from './math-helper.js';

const minMax = function (isMin, args) {
    args = Array.prototype.slice.call(args);
    switch (args.length) {
        case 0: throw { type: 'Argument', message: 'one or more arguments required' };
    }
    let i; // key is the unit.toString() for unified Dimension values,
    let j;
    let current;
    let currentUnified;
    let referenceUnified;
    let unit;
    let unitStatic;
    let unitClone;

    const // elems only contains original argument values.
        order  = [];

    const values = {};
    // value is the index into the order array.
    for (i = 0; i < args.length; i++) {
        current = args[i];
        if (!(current instanceof Dimension)) {
            if (Array.isArray(args[i].value)) {
                Array.prototype.push.apply(args, Array.prototype.slice.call(args[i].value));
                continue;
            } else {
                throw { type: 'Argument', message: 'incompatible types' };
            }
        }
        currentUnified = current.unit.toString() === '' && unitClone !== undefined ? new Dimension(current.value, unitClone).unify() : current.unify();
        unit = currentUnified.unit.toString() === '' && unitStatic !== undefined ? unitStatic : currentUnified.unit.toString();
        unitStatic = unit !== '' && unitStatic === undefined || unit !== '' && order[0].unify().unit.toString() === '' ? unit : unitStatic;
        unitClone = unit !== '' && unitClone === undefined ? current.unit.toString() : unitClone;
        j = values[''] !== undefined && unit !== '' && unit === unitStatic ? values[''] : values[unit];
        if (j === undefined) {
            if (unitStatic !== undefined && unit !== unitStatic) {
                throw { type: 'Argument', message: 'incompatible types' };
            }
            values[unit] = order.length;
            order.push(current);
            continue;
        }
        referenceUnified = order[j].unit.toString() === '' && unitClone !== undefined ? new Dimension(order[j].value, unitClone).unify() : order[j].unify();
        if ( isMin && currentUnified.value < referenceUnified.value ||
            !isMin && currentUnified.value > referenceUnified.value) {
            order[j] = current;
        }
    }
    if (order.length == 1) {
        return order[0];
    }
    args = order.map(a => { return a.toCSS(this.context); }).join(this.context.compress ? ',' : ', ');
    return new Anonymous(`${isMin ? 'min' : 'max'}(${args})`);
};

/**
 * Evaluate min/max arguments lazily. When an argument contains CSS-native
 * constructs (e.g. var()) that cannot participate in Less math, re-evaluate
 * it in calc context so Less variables resolve while operations pass through,
 * and emit the CSS min()/max() call (#3777).
 */
function minMaxLazy(context, isMin, args) {
    const evaluated = [];
    for (let i = 0; i < args.length; i++) {
        try {
            evaluated.push(args[i].eval(context));
        } catch (e) {
            if (e && e.type === 'Operation') {
                const prevMathOn = context.mathOn;
                context.mathOn = false;
                try {
                    evaluated.push(args[i].eval(context));
                } finally {
                    context.mathOn = prevMathOn;
                }
            } else {
                throw e;
            }
        }
    }
    try {
        return minMax.call({ context }, isMin, evaluated);
    } catch (e) {
        if (e && e.type === 'Argument' && e.message === 'incompatible types') {
            const rendered = evaluated.map(a => a.toCSS(context)).join(context.compress ? ',' : ', ');
            return new Anonymous(`${isMin ? 'min' : 'max'}(${rendered})`);
        }
        throw e;
    }
}

function min(context, ...args) {
    return minMaxLazy(context, true, args);
}
min.evalArgs = false;

function max(context, ...args) {
    return minMaxLazy(context, false, args);
}
max.evalArgs = false;

export default {
    min,
    max,
    convert: function (val, unit) {
        return val.convertTo(unit.value);
    },
    pi: function () {
        return new Dimension(Math.PI);
    },
    mod: function(a, b) {
        return new Dimension(a.value % b.value, a.unit);
    },
    pow: function(x, y) {
        if (typeof x === 'number' && typeof y === 'number') {
            x = new Dimension(x);
            y = new Dimension(y);
        } else if (!(x instanceof Dimension) || !(y instanceof Dimension)) {
            throw { type: 'Argument', message: 'arguments must be numbers' };
        }

        return new Dimension(Math.pow(x.value, y.value), x.unit);
    },
    percentage: function (n) {
        const result = mathHelper(num => num * 100, '%', false, n);

        return result;
    }
};
