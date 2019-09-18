import Node, { ILocationInfo, IProps, INodeOptions } from '../node';
declare type INumericProps = number | IProps;
/**
 * Numeric is any number (dimension without a unit)
 *   e.g. new Numeric(2, ...)
 *
 * @todo - does this need to store the text representation?
 *   e.g. a CSS number can be '+1', the plus would be lost in conversion
 */
declare class Numeric extends Node {
    constructor(props: INumericProps, options?: INodeOptions, location?: ILocationInfo);
}
export default Numeric;
