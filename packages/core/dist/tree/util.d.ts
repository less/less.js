/**
 * Node utilities
 */
import { Node } from './node';
/**
 * Generalized list-merging utility, used for selectors and values
 *   e.g.
 *     .a, .b, .c {
 *        .d&.e {}
 *     }
 *   [.d, [.a, .b, .c], .e]
 */
export declare const mergeList: (arr: any[]) => any[][];
/**
 * Math for node expressions
 */
export declare const add: (a: number, b: number) => number;
export declare const subtract: (a: number, b: number) => number;
export declare const multiply: (a: number, b: number) => number;
export declare const divide: (a: number, b: number) => number;
export declare const fround: (context: any, value: number) => number;
export declare const compare: (a: Node, b: Node) => any;
export declare const numericCompare: (a: string | number, b: string | number) => 1 | 0 | -1;
