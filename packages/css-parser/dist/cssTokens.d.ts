import { rawTokenConfig } from './util';
/**
 * references:
 * https://github.com/antlr/grammars-v4/blob/master/css3/css3.g4
 * https://www.lifewire.com/css2-vs-css3-3466978
 * https://www.w3.org/TR/css-syntax-3/
 *
 * Fragments and Tokens must be defined in order
 * ({{references}} must follow definitions)
 */
export declare const Fragments: string[][];
/**
 * Anything that is not 'BlockMarker' will be parsed as a generic 'Value'
 */
export declare const Tokens: rawTokenConfig[];
