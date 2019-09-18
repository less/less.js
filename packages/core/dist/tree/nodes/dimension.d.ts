import Node from '../node';
/**
 * A number with a unit
 *
 * e.g. props = { primitive: 1, value: [<Number>], unit: [<Value>] }
 */
declare class Dimension extends Node {
    value: number;
    operate(context: any, op: any, other: any): Dimension;
    compare(other: any): any;
    unify(): any;
    convertTo(conversions: any): any;
}
export default Dimension;
