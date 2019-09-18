import { CstNodeLocation } from 'chevrotain';
import { IOptions } from '../options';
import { EvalContext } from '../contexts';
export declare type SimpleValue = string | number | boolean | number[] | string[];
export declare type ISimpleProps = {
    /**
     * Primitive or simple representation of value.
     * This is used in valueOf() for math operations,
     * and also in indexing and lookups for some nodes
     */
    value?: SimpleValue;
    /**
     * The reason this exists in addition to value is that this is the
     * ACTUAL text representation of value
     *   e.g. 1) a color may have a value of [0, 0, 0, 1], but a text value of 'black'
     *        2) an element's simple selector may have a value of '[foo="bar"]',
     *           but a text value of '[foo=bar]' (for normalization)
     */
    text?: string;
};
/**
 * The result of an eval can be one of these types
 */
export declare type EvalReturn = Node[] | Node | false;
export interface IChildren {
    /**
     * Used when the value of a node can be represented by a single list of Nodes
     */
    values?: Node[];
    [key: string]: Node[];
}
export declare type ProcessFunction = (node: Node) => EvalReturn;
export declare type IProps = Node[] | (ISimpleProps & IChildren);
export interface ILocationInfo extends CstNodeLocation {
}
/**
 * In practice, this will probably be inherited through the prototype chain
 * during creation.
 *
 * So the "own properties" should be CstNodeLocation info, but should do an
 * Object.create() from the location info of the stylesheet root location info
 */
export interface IFileInfo {
    filename: string;
    currentDirectory: string;
    entryPath: string;
}
export declare type IRootOptions = {
    /** Passed in for every file root node */
    fileInfo?: IFileInfo;
    /** Only one node, the root node, should pass this in */
    options?: IOptions;
};
export declare type INodeOptions = IRootOptions & {
    [key: string]: boolean | number;
};
export declare abstract class Node {
    /** This will always be present as an array, even if it is empty */
    values: Node[];
    children: IChildren;
    childKeys: string[];
    /** Used if string does not equal normalized primitive */
    value: SimpleValue;
    text: string;
    options: INodeOptions;
    evalOptions: IOptions;
    fileInfo: IFileInfo;
    /**
     * This will be the start values from the first token and the end
     * values from the last token, as well as file info
     */
    location: ILocationInfo;
    parent: Node;
    root: Node;
    fileRoot: Node;
    visibilityBlocks: number;
    isVisible: boolean;
    type: string;
    evaluated: boolean;
    constructor(props: IProps, opts?: INodeOptions, location?: ILocationInfo);
    protected setParent(): void;
    protected normalizeValues(values: Node | Node[]): Node[];
    accept(visitor: any): void;
    valueOf(): SimpleValue;
    toString(): string;
    /**
     * Derived nodes can pass in context to eval and clone at the same time
     */
    clone(context?: EvalContext): any;
    protected getFileInfo(): IFileInfo;
    /**
     * This is an in-place mutation of a node array
     *
     * Unresolved Q: would a new array be more performant than array mutation?
     * The reason we do this is because the array may not mutate at all depending
     * on the result of processing
     *
     * This also allows `this.value` to retain a pointer to `this.children.value`
     */
    protected processNodeArray(nodeArray: Node[], processFunc: ProcessFunction): Node[];
    protected processChildren(node: Node, processFunc: ProcessFunction): void;
    /**
     * By default, nodes will just evaluate nested values
     * However, some nodes after evaluating will of course override
     * this to produce different node types or primitive values
     */
    eval(context?: EvalContext): any;
    /**
     * Output is a kind of string builder?
     * @todo - All genCSS and toCSS will get moved out of the AST and
     *         into visitor processing.
    */
    genCSS(output: any, context?: EvalContext): void;
    copyVisibilityInfo(info: {
        isVisible: boolean;
        visibilityBlocks: number;
    }): void;
}
export default Node;
