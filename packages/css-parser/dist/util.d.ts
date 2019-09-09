import { Lexer, ITokenConfig, TokenType, TokenPattern } from 'chevrotain';
export declare enum LexerType {
    NA = 0,
    SKIPPED = 1
}
export interface TokenMap {
    [key: string]: TokenType;
}
export interface rawTokenConfig extends Omit<ITokenConfig, 'longer_alt' | 'categories' | 'pattern' | 'group'> {
    pattern: TokenPattern | LexerType;
    group?: ITokenConfig['group'] | LexerType;
    longer_alt?: string;
    categories?: string[];
}
interface ILexer {
    T: TokenMap;
    lexer: Lexer;
    tokens: TokenType[];
}
export declare const createLexer: (rawFragments: string[][], rawTokens: rawTokenConfig[]) => ILexer;
export {};
