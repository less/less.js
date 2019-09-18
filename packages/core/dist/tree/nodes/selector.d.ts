import Node from '../node';
import Element from './element';
declare class Selector extends Node {
    values: Element[];
    options: {
        mediaEmpty: boolean;
    };
    getElements(els: Element[]): Element[];
    createEmptySelectors(): Selector[];
    /**
     * @todo - what's the type of 'other'?
     */
    match(other: any): number;
    mixinElements(): any;
    isJustParentSelector(): boolean;
    eval(context: any): any;
    genCSS(context: any, output: any): void;
    getIsOutput(): any;
}
export default Selector;
