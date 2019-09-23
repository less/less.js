import {
  Node,
  IProps,
  INodeOptions,
  ILocationInfo
} from '.'

export type NodeType<T> = T extends Node ? T : never
/**
 * Renamed from 'Value'
 * 
 * This is a any comma-separated list
 */
export class List<T = Node> extends Node {
  nodes: NodeType<T>[]

  constructor(props: Node[] | IProps, options?: INodeOptions, location?: ILocationInfo) {
    let newProps: IProps
    if (Array.isArray) {
      newProps = <IProps>{ nodes: props }
    } else {
      newProps = <IProps>props
    }
    super(newProps, options, location)
  }

  toString() {
    return this.nodes.join(',')
  }
}
List.prototype.type = 'List'
