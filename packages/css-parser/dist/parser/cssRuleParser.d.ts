import { TokenType, EmbeddedActionsParser, IParserConfig } from 'chevrotain';
import { TokenMap } from '../util';
/**
 * This class further parses general rules into known rules
 */
export declare class CssRuleParser extends EmbeddedActionsParser {
    T: TokenMap;
    constructor(tokens: TokenType[], T: TokenMap, config?: IParserConfig);
    property: (idxInCallingRule?: number, ...args: any[]) => void;
    expression: (idxInCallingRule?: number, ...args: any[]) => void;
    valueExpression: (idxInCallingRule?: number, ...args: any[]) => void;
    addition: (idxInCallingRule?: number, ...args: any[]) => void;
    multiplication: (idxInCallingRule?: number, ...args: any[]) => void;
    compare: (idxInCallingRule?: number, ...args: any[]) => void;
    value: (idxInCallingRule?: number, ...args: any[]) => void;
    compoundSelectorList: (idxInCallingRule?: number, ...args: any[]) => void;
    /**
     * e.g. div.foo[bar] + p
     */
    compoundSelector: (idxInCallingRule?: number, ...args: any[]) => void;
    selector: (idxInCallingRule?: number, ...args: any[]) => void;
    selectorElement: (idxInCallingRule?: number, ...args: any[]) => void;
    selectorSuffix: (idxInCallingRule?: number, ...args: any[]) => void;
    selectorCombinator: (idxInCallingRule?: number, ...args: any[]) => void;
    selectorAttribute: (idxInCallingRule?: number, ...args: any[]) => void;
    pseudoSelector: (idxInCallingRule?: number, ...args: any[]) => void;
    pseudoFunction: (idxInCallingRule?: number, ...args: any[]) => void;
}
