"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("../node");
var unit_conversions_1 = require("../data/unit-conversions");
/**
 * A number with a unit
 *
 * e.g. props = { primitive: 1, value: [<Number>], unit: [<Value>] }
 */
var Dimension = /** @class */ (function (_super) {
    __extends(Dimension, _super);
    function Dimension() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    //   genCSS(context, output) {
    //     if ((context && context.strictUnits) && !this.unit.isSingular()) {
    //       throw new Error(`Multiple units in dimension. Correct the units or use the unit function. Bad unit: ${this.unit.toString()}`);
    //     }
    //     const value = fround(context, this.value[0])
    //     let strValue = String(value);
    //     if (value !== 0 && value < 0.000001 && value > -0.000001) {
    //         // would be output 1e-6 etc.
    //         strValue = value.toFixed(20).replace(/0+$/, '');
    //     }
    //     output.add(strValue);
    //     this.unit.genCSS(context, output);
    //   }
    // In an operation between two Dimensions,
    // we default to the first Dimension's unit,
    // so `1px + 2` will yield `3px`.
    Dimension.prototype.operate = function (context, op, other) {
        /* jshint noempty:false */
        var value = this._operate(context, op, this.value, other.value);
        var unit = this.unit.clone();
        if (op === '+' || op === '-') {
            if (unit.numerator.length === 0 && unit.denominator.length === 0) {
                unit = other.unit.clone();
                if (this.unit.backupUnit) {
                    unit.backupUnit = this.unit.backupUnit;
                }
            }
            else if (other.unit.numerator.length === 0 && unit.denominator.length === 0) {
                // do nothing
            }
            else {
                other = other.convertTo(this.unit.usedUnits());
                if (context.strictUnits && other.unit.toString() !== unit.toString()) {
                    throw new Error("Incompatible units. Change the units or use the unit function. " +
                        ("Bad units: '" + unit.toString() + "' and '" + other.unit.toString() + "'."));
                }
                value = this._operate(context, op, this.value, other.value);
            }
        }
        else if (op === '*') {
            unit.numerator = unit.numerator.concat(other.unit.numerator).sort();
            unit.denominator = unit.denominator.concat(other.unit.denominator).sort();
            unit.cancel();
        }
        else if (op === '/') {
            unit.numerator = unit.numerator.concat(other.unit.denominator).sort();
            unit.denominator = unit.denominator.concat(other.unit.numerator).sort();
            unit.cancel();
        }
        return new Dimension(value, unit);
    };
    Dimension.prototype.compare = function (other) {
        var a;
        var b;
        if (!(other instanceof Dimension)) {
            return undefined;
        }
        if (this.unit.isEmpty() || other.unit.isEmpty()) {
            a = this;
            b = other;
        }
        else {
            a = this.unify();
            b = other.unify();
            if (a.unit.compare(b.unit) !== 0) {
                return undefined;
            }
        }
        return node_1.default.numericCompare(a.value, b.value);
    };
    Dimension.prototype.unify = function () {
        return this.convertTo({ length: 'px', duration: 's', angle: 'rad' });
    };
    Dimension.prototype.convertTo = function (conversions) {
        var value = this.value;
        var unit = this.unit.clone();
        var i;
        var groupName;
        var group;
        var targetUnit;
        var derivedConversions = {};
        var applyUnit;
        if (typeof conversions === 'string') {
            for (i in unit_conversions_1.default) {
                if (unit_conversions_1.default[i].hasOwnProperty(conversions)) {
                    derivedConversions = {};
                    derivedConversions[i] = conversions;
                }
            }
            conversions = derivedConversions;
        }
        applyUnit = function (atomicUnit, denominator) {
            /* jshint loopfunc:true */
            if (group.hasOwnProperty(atomicUnit)) {
                if (denominator) {
                    value = value / (group[atomicUnit] / group[targetUnit]);
                }
                else {
                    value = value * (group[atomicUnit] / group[targetUnit]);
                }
                return targetUnit;
            }
            return atomicUnit;
        };
        for (groupName in conversions) {
            if (conversions.hasOwnProperty(groupName)) {
                targetUnit = conversions[groupName];
                group = unit_conversions_1.default[groupName];
                unit.map(applyUnit);
            }
        }
        unit.cancel();
        return new Dimension(value, unit);
    };
    return Dimension;
}(node_1.default));
Dimension.prototype.type = 'Dimension';
exports.default = Dimension;
//# sourceMappingURL=dimension.js.map