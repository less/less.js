import Node from '../node';

/**
 * Renamed from 'Value'
 * 
 * This is a any comma-separated list
 */
type NodeType<T> = T extends Node ? T : never
class List<T = Node> extends Node {
  nodes: NodeType<T>[]
}
List.prototype.type = 'List'
export default List
