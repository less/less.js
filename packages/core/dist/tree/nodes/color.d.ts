import Node from '../node';
/**
 * Can be a string?
 */
declare class Color extends Node {
    constructor(rgb: any, a: any, originalForm: any);
    luma(): number;
    genCSS(context: any, output: any): void;
    toCSS(context: any, doNotCompress: any): any;
    operate(context: any, op: any, other: any): any;
    toRGB(): string;
    toHSL(): {
        h: number;
        s: any;
        l: number;
        a: any;
    };
    toHSV(): {
        h: number;
        s: any;
        v: number;
        a: any;
    };
    toARGB(): string;
    compare(x: any): number;
}
export default Color;
