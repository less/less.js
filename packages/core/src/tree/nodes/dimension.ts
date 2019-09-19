import Node from '../node';
import unitConversions from '../data/unit-conversions';
import Color from './color'
import Numeric from './numeric'
import Value from './value'
import { fround, operate } from '../util'
import { StrictUnitMode } from '../../constants'

/**
 * A number with a unit
 * 
 * e.g. props = { value: 1, nodes: [<Number>, <Value>] }
 */
class Dimension extends Node {
  value: number
  /** Second value is the unit */
  nodes: [Numeric, Value]

  // In an operation between two Dimensions,
  // we default to the first Dimension's unit,
  // so `1px + 2` will yield `3px`.
  operate(context, op: string, other: Node) {
    if (other instanceof Dimension) {
      const aUnit = this.nodes[1]
      const bUnit = other.nodes[1]

      if (aUnit.value !== bUnit.value) {
        if (context.strictUnits === StrictUnitMode.ERROR) {
          throw new Error(`Incompatible units. Change the units or use the unit function. ` + 
              `Bad units: '${aUnit.value}' and '${bUnit.value}'.`)
        } else if (context.strictUnits === StrictUnitMode.LOOSE) {
          const result = operate(op, this.value, other.value)
          return new Dimension({ value: result, nodes: [new Numeric(result), aUnit.clone()] })
        } else {
          /** @todo warning */
          /** Return the operation as-is */
          return this
        }
      } else {
        result = operate(op, a.value, b.value)
        if (op === '/') {
          return new Numeric(result)
        } else if (op === '*') {
          throw new Error(`Can't multiply a unit by a unit.`)
        }
        return new Dimension({ value: result, nodes: [new Numeric(result), aUnit.clone()] })
      }
    }

    const unit = this.values[1].clone()
    const result = operate(op, this.values[0].value, other.value)
    // let value = this._operate(context, op, this.value, other.value);

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
                throw new Error(`Incompatible units. Change the units or use the unit function. ` + 
                    `Bad units: '${unit.toString()}' and '${other.unit.toString()}'.`);
            }

            value = this._operate(context, op, this.value, other.value);
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
    return new Dimension(value, unit);
  }

  compare(other) {
      let a;
      let b;

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

      return Node.numericCompare(a.value, b.value);
  }

  unify() {
      return this.convertTo({ length: 'px', duration: 's', angle: 'rad' });
  }

  convertTo(conversions) {
      let value = this.value;
      const unit = this.unit.clone();
      let i;
      let groupName;
      let group;
      let targetUnit;
      let derivedConversions = {};
      let applyUnit;

      if (typeof conversions === 'string') {
          for (i in unitConversions) {
              if (unitConversions[i].hasOwnProperty(conversions)) {
                  derivedConversions = {};
                  derivedConversions[i] = conversions;
              }
          }
          conversions = derivedConversions;
      }
      applyUnit = (atomicUnit, denominator) => {
          /* jshint loopfunc:true */
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
              group = unitConversions[groupName];

              unit.map(applyUnit);
          }
      }

      unit.cancel();

      return new Dimension(value, unit);
  }
}

Dimension.prototype.type = 'Dimension';
export default Dimension;
