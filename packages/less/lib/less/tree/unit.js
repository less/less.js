// @ts-check
import Node from './node.js';
import unitConversions from '../data/unit-conversions.js';
import * as utils from '../utils.js';

/** @import { EvalContext, CSSOutput } from './node.js' */

class Unit extends Node {
    get type() { return 'Unit'; }

    /**
     * @param {string[]} [numerator]
     * @param {string[]} [denominator]
     * @param {string} [backupUnit]
     */
    constructor(numerator, denominator, backupUnit) {
        super();
        /** @type {string[]} */
        this.numerator = numerator ? utils.copyArray(numerator).sort() : [];
        /** @type {string[]} */
        this.denominator = denominator ? utils.copyArray(denominator).sort() : [];
        if (backupUnit) {
            /** @type {string | undefined} */
            this.backupUnit = backupUnit;
        } else if (numerator && numerator.length) {
            this.backupUnit = numerator[0];
        }
    }

    clone() {
        return new Unit(utils.copyArray(this.numerator), utils.copyArray(this.denominator), this.backupUnit);
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        // Dimension checks the unit is singular and throws an error if in strict math mode.
        const strictUnits = context && context.strictUnits;
        if (this.numerator.length === 1) {
            output.add(this.numerator[0]); // the ideal situation
        } else if (!strictUnits && this.backupUnit) {
            output.add(this.backupUnit);
        } else if (!strictUnits && this.denominator.length) {
            output.add(this.denominator[0]);
        }
    }

    toString() {
        let i, returnStr = this.numerator.join('*');
        for (i = 0; i < this.denominator.length; i++) {
            returnStr += `/${this.denominator[i]}`;
        }
        return returnStr;
    }

    /**
     * @param {Unit} other
     * @returns {0 | undefined}
     */
    compare(other) {
        return this.is(other.toString()) ? 0 : undefined;
    }

    /** @param {string} unitString */
    is(unitString) {
        return this.toString().toUpperCase() === unitString.toUpperCase();
    }

    isLength() {
        return RegExp('^(px|em|ex|ch|rem|in|cm|mm|pc|pt|ex|vw|vh|vmin|vmax)$', 'gi').test(this.toCSS(/** @type {import('./node.js').EvalContext} */ ({})));
    }

    isEmpty() {
        return this.numerator.length === 0 && this.denominator.length === 0;
    }

    isSingular() {
        return this.numerator.length <= 1 && this.denominator.length === 0;
    }

    /** @param {(atomicUnit: string, denominator: boolean) => string} callback */
    map(callback) {
        let i;

        for (i = 0; i < this.numerator.length; i++) {
            this.numerator[i] = callback(this.numerator[i], false);
        }

        for (i = 0; i < this.denominator.length; i++) {
            this.denominator[i] = callback(this.denominator[i], true);
        }
    }

    /** @returns {{ [groupName: string]: string }} */
    usedUnits() {
        /** @type {{ [unitName: string]: number }} */
        let group;
        /** @type {{ [groupName: string]: string }} */
        const result = {};
        /** @type {(atomicUnit: string) => string} */
        let mapUnit;
        /** @type {string} */
        let groupName;

        mapUnit = function (atomicUnit) {
            // eslint-disable-next-line no-prototype-builtins
            if (group.hasOwnProperty(atomicUnit) && !result[groupName]) {
                result[groupName] = atomicUnit;
            }

            return atomicUnit;
        };

        for (groupName in unitConversions) {
            // eslint-disable-next-line no-prototype-builtins
            if (unitConversions.hasOwnProperty(groupName)) {
                group = /** @type {{ [unitName: string]: number }} */ (unitConversions[/** @type {keyof typeof unitConversions} */ (groupName)]);

                this.map(mapUnit);
            }
        }

        return result;
    }

    cancel() {
        /** @type {{ [unit: string]: number }} */
        const counter = {};
        /** @type {string} */
        let atomicUnit;
        let i;

        for (i = 0; i < this.numerator.length; i++) {
            atomicUnit = this.numerator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) + 1;
        }

        for (i = 0; i < this.denominator.length; i++) {
            atomicUnit = this.denominator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) - 1;
        }

        this.numerator = [];
        this.denominator = [];

        for (atomicUnit in counter) {
            // eslint-disable-next-line no-prototype-builtins
            if (counter.hasOwnProperty(atomicUnit)) {
                const count = counter[atomicUnit];

                if (count > 0) {
                    for (i = 0; i < count; i++) {
                        this.numerator.push(atomicUnit);
                    }
                } else if (count < 0) {
                    for (i = 0; i < -count; i++) {
                        this.denominator.push(atomicUnit);
                    }
                }
            }
        }

        this.numerator.sort();
        this.denominator.sort();
    }
}

export default Unit;
