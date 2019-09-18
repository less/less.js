import Node, { NodeArray } from '../node';
/**
 * Renamed from 'Value'
 *
 * This is a any comma-separated list
 */
declare class List<T = Node> extends Node {
    value: NodeArray<T & Node>;
}
export default List;
