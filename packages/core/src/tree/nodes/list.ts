import Node, { NodeArray } from '../node';

/**
 * Renamed from 'Value'
 * 
 * This is a any comma-separated list
 */
class List<T = Node> extends Node {
  value: NodeArray<T & Node>
}
List.prototype.type = 'List'
export default List
