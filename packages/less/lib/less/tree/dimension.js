// @ts-check
/* eslint-disable no-prototype-builtins */
import Node from './node.js';
import unitConversions from '../data/unit-conversions.js';
import Unit from './unit.js';
import Color from './color.js';

/** @import { EvalContext, CSSOutput } from './node.js' */

//
// A number with a unit
//
class Dimension extends Node {
    get type() { return 'Dimension'; }

    /**
     * @param {number | string} value
     * @param {Unit | string} [unit]
     */
    constructor(value, unit) {
        super();
        /** @type {number} */
        this.value = parseFloat(/** @type {string} */ (value));
        if (isNaN(this.value)) {
            throw new Error('Dimension is not a number.');
        }
        /** @type {Unit} */
        this.unit = (unit && unit instanceof Unit) ? unit :
            new Unit(unit ? [/** @type {string} */ (unit)] : undefined);
        this.setParent(this.unit, this);
    }

    /**
     * @param {import('./node.js').TreeVisitor} visitor
     */
    accept(visitor) {
        this.unit = /** @type {Unit} */ (visitor.visit(this.unit));
    }

    // remove when Nodes have JSDoc types
    // eslint-disable-next-line no-unused-vars
    /** @param {EvalContext} context */
    eval(context) {
        return this;
    }

    toColor() {
        const v = /** @type {number} */ (this.value);
        return new Color([v, v, v]);
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        if ((context && context.strictUnits) && !this.unit.isSingular()) {
            throw new Error(`Multiple units in dimension. Correct the units or use the unit function. Bad unit: ${this.unit.toString()}`);
        }

        const value = this.fround(context, /** @type {number} */ (this.value));
        let strValue = String(value);

        if (value !== 0 && value < 0.000001 && value > -0.000001) {
            // would be output 1e-6 etc.
            strValue = value.toFixed(20).replace(/0+$/, '');
        }

        if (context && context.compress) {
            // Zero values doesn't need a unit
            if (value === 0 && this.unit.isLength()) {
                output.add(strValue);
                return;
            }

            // Float values doesn't need a leading zero
            if (value > 0 && value < 1) {
                strValue = (strValue).slice(1);
            }
        }

        output.add(strValue);
        this.unit.genCSS(context, output);
    }

    // In an operation between two Dimensions,
    // we default to the first Dimension's unit,
    // so `1px + 2` will yield `3px`.
    /**
     * @param {EvalContext} context
     * @param {string} op
     * @param {Dimension} other
     */
    operate(context, op, other) {
        /* jshint noempty:false */
        let value = this._operate(context, op, /** @type {number} */ (this.value), /** @type {number} */ (other.value));
        let unit = this.unit.clone();

        if (op === '+' || op === '-') {
            if (unit.numerator.length === 0 && unit.denominator.length === 0) {
                unit = other.unit.clone();
                if (this.unit.backupUnit) {
                    unit.backupUnit = this.unit.backupUnit;
                }
            } else if (other.unit.numerator.length === 0 && unit.denominator.length === 0) {
                // do nothing
            } else {
                other = other.convertTo(this.unit.usedUnits());

                if (context.strictUnits && other.unit.toString() !== unit.toString()) {
                    throw new Error('Incompatible units. Change the units or use the unit function. '
                        + `Bad units: '${unit.toString()}' and '${other.unit.toString()}'.`);
                }

                value = this._operate(context, op, /** @type {number} */ (this.value), /** @type {number} */ (other.value));
            }
        } else if (op === '*') {
            unit.numerator = unit.numerator.concat(other.unit.numerator).sort();
            unit.denominator = unit.denominator.concat(other.unit.denominator).sort();
            unit.cancel();
        } else if (op === '/') {
            unit.numerator = unit.numerator.concat(other.unit.denominator).sort();
            unit.denominator = unit.denominator.concat(other.unit.numerator).sort();
            unit.cancel();
        }
        return new Dimension(/** @type {number} */ (value), unit);
    }

    /**
     * @param {Node} other
     * @returns {number | undefined}
     */
    compare(other) {
        let a, b;

        if (!(other instanceof Dimension)) {
            return undefined;
        }

        if (this.unit.isEmpty() || other.unit.isEmpty()) {
            a = this;
            b = other;
        } else {
            a = this.unify();
            b = other.unify();
            if (a.unit.compare(b.unit) !== 0) {
                return undefined;
            }
        }

        return Node.numericCompare(/** @type {number} */ (a.value), /** @type {number} */ (b.value));
    }

    unify() {
        return this.convertTo({ length: 'px', duration: 's', angle: 'rad' });
    }

    /**
     * @param {string | { [groupName: string]: string }} conversions
     * @returns {Dimension}
     */
    convertTo(conversions) {
        let value = /** @type {number} */ (this.value);
        const unit = this.unit.clone();
        let i;
        /** @type {string} */
        let groupName;
        /** @type {{ [unitName: string]: number }} */
        let group;
        /** @type {string} */
        let targetUnit;
        /** @type {{ [groupName: string]: string }} */
        let derivedConversions = {};
        /** @type {(atomicUnit: string, denominator: boolean) => string} */
        let applyUnit;

        if (typeof conversions === 'string') {
            for (i in unitConversions) {
                if (unitConversions[/** @type {keyof typeof unitConversions} */ (i)].hasOwnProperty(conversions)) {
                    derivedConversions = {};
                    derivedConversions[i] = conversions;
                }
            }
            conversions = derivedConversions;
        }
        applyUnit = function (atomicUnit, denominator) {
            if (group.hasOwnProperty(atomicUnit)) {
                if (denominator) {
                    value = value / (group[atomicUnit] / group[targetUnit]);
                } else {
                    value = value * (group[atomicUnit] / group[targetUnit]);
                }

                return targetUnit;
            }

            return atomicUnit;
        };

        for (groupName in conversions) {
            if (conversions.hasOwnProperty(groupName)) {
                targetUnit = conversions[groupName];
                group = /** @type {{ [unitName: string]: number }} */ (unitConversions[/** @type {keyof typeof unitConversions} */ (groupName)]);

                unit.map(applyUnit);
            }
        }

        unit.cancel();

        return new Dimension(value, unit);
    }
}

export default Dimension;
