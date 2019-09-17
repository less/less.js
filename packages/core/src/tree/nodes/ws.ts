import Node from '../node';

/**
 * A white-space node
 * Used to normalize expressions and values for equality testing
 * and list indexing
 */
class WS extends Node {}
WS.prototype.type = 'WS'
export default WS
