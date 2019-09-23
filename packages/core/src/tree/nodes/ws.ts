import { Node } from '.'

/**
 * A white-space node
 * Used to normalize expressions and values for equality testing
 * and list indexing
 */
export class WS extends Node {}
WS.prototype.type = 'WS'
