import { Lexer, CstNode, ILexingResult } from 'chevrotain';
import { CssStructureParser } from './cssStructureParser';
export interface IParseResult {
    cst: CstNode;
    lexerResult: ILexingResult;
    parser: CssStructureParser;
}
export declare class Parser {
    lexer: Lexer;
    parser: CssStructureParser;
    constructor(structureOnly?: boolean);
    parse(text: string): IParseResult;
}
