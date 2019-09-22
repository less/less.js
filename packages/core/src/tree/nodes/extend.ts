import Node, { IProps, INodeOptions, ILocationInfo } from '../node'
import Selector from './selector'
import List from './list'

export enum ExtendOption {
  ALL
}

export type IExtendProps = {
  option: ExtendOption,
  selectors: Selector[]
}

/**
 * @todo - the extend visitor should run after tree flattening
 */
class Extend extends Node {
  option: ExtendOption
  constructor(props: IExtendProps, options: INodeOptions, location: ILocationInfo) {
    const newProps: IProps = {}
    const { option, selectors } = props
    if (selectors.length !== 1) {
      newProps.selectors = [new List(selectors)]
    }
    super(newProps, options, location)
    this.option = option
  }
}

Extend.prototype.type = 'Extend'
export default Extend
