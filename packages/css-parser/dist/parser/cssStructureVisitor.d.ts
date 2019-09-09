import { ICstVisitor, IToken, IRecognitionException } from 'chevrotain';
import { CssRuleParser } from './cssRuleParser';
export interface CstVisitorInstance {
    new (...args: any[]): ICstVisitor<any, any>;
}
export declare const CssStructureVisitor: (baseConstructor: CstVisitorInstance) => {
    new (cssParser: CssRuleParser, lexedTokens: IToken[]): {
        cssParser: CssRuleParser;
        lexedTokens: IToken[];
        errors: IRecognitionException[];
        primary(ctx: any): void;
        rule(ctx: any): any;
        atRule(ctx: any): any;
        componentValues(ctx: any): any;
        customPropertyRule(ctx: any): any;
        expressionList(ctx: any): any;
        expression(ctx: any): any;
        curlyBlock(ctx: any): any;
        visit(cstNode: import("chevrotain").CstNode | import("chevrotain").CstNode[], param?: any): any;
        validateVisitor(): void;
    };
};
/**
 * @todo pseudo-code, parse loosely first, then more specifically for atrules / values
 */
