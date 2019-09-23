import Node from '../node';

export type NodeType<T> = T extends Node ? T : never
/**
 * Renamed from 'Value'
 * 
 * This is a any comma-separated list
 */
class List<T = Node> extends Node {
  nodes: NodeType<T>[]

  toString() {
    return this.nodes.join(',')
  }
}
List.prototype.type = 'List'
export default List
