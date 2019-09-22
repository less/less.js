import Node, { IProps } from '../node';
import NumericNode from '../numeric-node'
import unitConversions from '../data/unit-conversions';
import Color from './color'
import NumberValue from './number-value'
import Value from './value'
import { EvalContext } from '../../contexts'
import { fround, operate } from '../util'
import { StrictUnitMode } from '../../constants'

/**
 * A number with a unit
 * 
 * e.g. props = { value: 1, nodes: [<NumberValue>, <Value>] }
 */
class Dimension extends NumericNode {
  value: number
  /** Second value is the unit */
  nodes: [NumberValue, Value]

  // In an operation between two Dimensions,
  // we default to the first Dimension's unit,
  // so `1px + 2` will yield `3px`.
  operate(op: string, other: Node, context: EvalContext): Node {
    const strictUnits = context.options.strictUnits
    if (other instanceof Dimension) {
      const aUnit = this.nodes[1]
      const bUnit = other.nodes[1]

      if (aUnit.value !== bUnit.value) {
        if (strictUnits === StrictUnitMode.ERROR) {
          throw new Error(`Incompatible units. Change the units or use the unit function. ` + 
              `Bad units: '${aUnit.value}' and '${bUnit.value}'.`)
        } else if (strictUnits === StrictUnitMode.LOOSE) {
          const result = operate(op, this.value, other.value)
          return new Dimension(
            <IProps>{ value: result, nodes: [new NumberValue(result), aUnit.clone()] }
          ).inherit(this)
        } else {
          /** @todo warning */
          /** Return the operation as-is */
          return this
        }
      } else {
        const result = operate(op, this.value, other.value)
        /** Dividing 8px / 1px will yield 8 */
        if (op === '/') {
          return new NumberValue(result).inherit(this)
        } else if (op === '*') {
          throw new Error(`Can't multiply a unit by a unit.`)
        }
        return new Dimension(
          <IProps>{ value: result, nodes: [new NumberValue(result), aUnit.clone()] }
        ).inherit(this)
      }
    } else if (other instanceof NumberValue) {
      const unit = this.nodes[1].clone()
      const result = operate(op, this.nodes[0].value, other.value)
      return new Dimension(
        <IProps>{ value: result, nodes: [new NumberValue(result), aUnit.clone()] }
      ).inherit(this)
    }
    return this
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
