import { TokenType, CstNode, CstElement, IParserConfig, IToken } from 'chevrotain';
import { TokenMap } from '../util';
import { CssRuleParser } from './cssRuleParser';
import { BaseParserClass } from './baseParserClass';
/**
 *  Parsing is broken into 2 phases, so that we:
 *    1. Don't have to do any backtracking to refine rules (like @media).
 *    2. Don't have to have special parsing rules based on block context.
 *
 *  This actually matches the spec, which essentially says that preludes and
 *  at-rule bodies (in {}) can be almost anything, and the outer grammar should
 *  not care about what at-rules or declaration values contain.
 */
export declare class CssStructureParser extends BaseParserClass {
    T: TokenMap;
    ruleParser: CssRuleParser;
    constructor(tokens: TokenType[], T: TokenMap, config?: IParserConfig, 
    /** An optional instance to further refine rules */
    ruleParser?: CssRuleParser);
    /** If an expression ends up not being a declaration, merge initial values into expression */
    _mergeValues: (values: CstElement[], expr: CstNode) => void;
    /** Wrapper for secondary parsing by rule parser */
    _parseNode: (node: CstNode) => CstNode;
    /** Optional whitespace */
    _: (idxInCallingRule?: number, ...args: any[]) => IToken;
    primary: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /** Capture semi-colon fragment */
    semi: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    rule: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /**
     * Everything up to an (outer) ';' or '{' is the AtRule's prelude
     */
    atRule: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    propertyValue: (idxInCallingRule?: number, ...args: any[]) => CstElement;
    componentValues: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /**
     * Custom property values can consume everything, including curly blocks
     */
    customPropertyRule: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /** A comma-separated list of expressions */
    expressionList: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /** List of expression lists (or expression list if only 1) */
    expressionListGroup: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    customExpressionList: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /**
     *  An expression contains values and spaces
     */
    expression: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /** Immediately following a comma and optional whitespace */
    subExpression: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /**
     * This will detect a declaration-like expression within an expression,
     * but note that the declaration is essentially a duplicate of the entire expression.
     */
    customExpression: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /**
     * According to a reading of the spec, whitespace is a valid
     * value in a CSS list, e.g. in the custom properties spec,
     * `--custom: ;` has a value of ' '
     *
     * However, a property's grammar may discard whitespace between values.
     * e.g. for `color: black`, the value in the browser will resolve to `black`
     * and not ` black`. The CSS spec is rather hand-wavy about whitespace,
     * sometimes mentioning it specifically, sometimes not representing it
     * in grammar even though it's expected to be present.
     *
     * Strictly speaking, though, a property's value begins _immediately_
     * following a ':' and ends at ';' (or until automatically closed by
     * '}', ']', ')' or the end of a file).
     */
    value: (idxInCallingRule?: number, ...args: any[]) => CstElement;
    curlyBlock: (idxInCallingRule?: number, ...args: any[]) => CstNode;
    /**
     * Everything in `[]` or `()` we evaluate as raw expression lists,
     * or groups of expression lists (divided by semi-colons).
     *
     * The CSS spec suggests that `[]`, `()`, `{}` should be treated equally,
     * as generic blocks, so I'm not sure of this, but in the language
     * _so far_, there's some distinction between these block types.
     * AFAIK, `[]` is only used formally in CSS grid and with attribute
     * identifiers, and `()` is used for functions and at-rule expressions.
     *
     * It would be great if CSS formalized this distinction, but for now,
     * this seems safe.
     */
    block: (idxInCallingRule?: number, ...args: any[]) => CstNode;
}
