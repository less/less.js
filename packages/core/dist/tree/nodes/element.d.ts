import Node, { IProps, INodeOptions, ILocationInfo } from '../node';
import Value from './value';
declare type IElementProps = [string, string] | IProps;
/**
 * An element's values list will be exactly two Values,
 * so that they can have normalized values for indexing / lookups
 */
declare class Element extends Node {
    children: {
        values: [Value, Value];
    };
    constructor(props: IElementProps, options?: INodeOptions, location?: ILocationInfo);
    /** Indexable value */
    valueOf(): string;
    toString(): string;
    toCSS(context?: {}): any;
}
export default Element;
