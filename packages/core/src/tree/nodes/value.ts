import Node from '../node';

/**
 * A value is modelled after a declaration's value,
 * meaning that a value is actually a comma-separated list
 * of expressions.
 */
class Value extends Node {
}
Value.prototype.type = 'Value';
export default Value;
