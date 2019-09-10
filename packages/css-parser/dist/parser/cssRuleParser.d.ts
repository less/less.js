import { TokenType, IParserConfig, IToken, EmbeddedActionsParser, CstNode, CstElement } from 'chevrotain';
import { TokenMap } from '../util';
/**
 * This class further parses general rules into known rules
 */
export declare class CssRuleParser extends EmbeddedActionsParser {
    T: TokenMap;
    constructor(tokens: TokenType[], T: TokenMap, config?: IParserConfig);
    _: (idxInCallingRule?: number, ...args: any[]) => IToken;
    /** A property is a collection of tokens in case we need to process segments */
    property: (idxInCallingRule?: number, ...args: any[]) => IToken[];
    expression: (idxInCallingRule?: number, ...args: any[]) => {
        name: string;
        children: {
            values: CstElement[];
        };
    };
    valueExpression: (idxInCallingRule?: number, ...args: any[]) => CstElement[];
    addition: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    multiplication: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    compare: (idxInCallingRule?: number, ...args: any[]) => any;
    value: (idxInCallingRule?: number, ...args: any[]) => any;
}
