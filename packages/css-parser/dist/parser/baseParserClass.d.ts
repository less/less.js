import { EmbeddedActionsParser, TokenType, IToken, ConsumeMethodOpts, CstElement } from "chevrotain";
export interface ICaptureResult {
    tokens: IToken[];
    elements: CstElement[];
}
export declare class BaseParserClass extends EmbeddedActionsParser {
    protected CAPTURING: boolean;
    protected CAPTURED_TOKENS: IToken[][];
    CAPTURE(): void;
    END_CAPTURE(): IToken[];
    private processCapturedToken;
    CONSUME(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME1(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME2(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME3(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME4(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME5(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME6(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME7(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME8(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
    CONSUME9(tokType: TokenType, options?: ConsumeMethodOpts): IToken;
}
