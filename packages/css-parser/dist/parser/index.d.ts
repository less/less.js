import { Lexer } from 'chevrotain';
import { CssStructureParser } from './cssStructureParser';
export declare class Parser {
    lexer: Lexer;
    parser: CssStructureParser;
    constructor();
    parse(text: string): {
        cst: import("chevrotain").CstNode;
        lexerResult: import("chevrotain").ILexingResult;
        parser: CssStructureParser;
    };
}
