import { Lexer, ITokenConfig, TokenType } from 'chevrotain';
import { EmbeddedActionsParser } from 'chevrotain';
export interface TokenMap {
    [key: string]: TokenType;
}
export interface rawTokenConfig extends Omit<ITokenConfig, 'longer_alt' | 'categories'> {
    longer_alt?: string;
    categories?: string[];
}
interface ILexer {
    T: TokenMap;
    lexer: Lexer;
    tokens: TokenType[];
}
export declare const createLexer: (rawFragments: string[][], rawTokens: rawTokenConfig[]) => ILexer;
interface IEmbeddedActionsParser extends EmbeddedActionsParser {
    primary(): void;
}
declare type CssParser = {
    new (tokens: TokenType[], T: TokenMap): IEmbeddedActionsParser;
};
export declare const createParser: (Parser: CssParser, rawFragments: string[][], rawTokens: rawTokenConfig[]) => {
    parser: IEmbeddedActionsParser;
    lexer: Lexer;
    tokens: TokenType[];
    T: TokenMap;
    parse(text: string): {
        value: void;
        lexErrors: import("chevrotain").ILexingError[];
        parseErrors: import("chevrotain").IRecognitionException[];
    };
};
export {};
