import Node, { ILocationInfo, INodeOptions } from '../node';
declare type IValueProps = string | {
    /** Normalized value */
    value: string;
    /** Actual text value */
    text: string;
};
/**
 * This is any generic (unquoted string fragment) value
 *   e.g. new Value('this is an unquoted value')
 *        new Value({ text: '[id=foo]', value: '[id="foo"]' }) */
declare class Value extends Node {
    text: string;
    value: string;
    constructor(props: IValueProps, options?: INodeOptions, location?: ILocationInfo);
}
export default Value;
