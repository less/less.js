import {
  EmbeddedActionsParser,
  TokenType,
  IToken,
  ConsumeMethodOpts,
  SubruleMethodOpts,
  CstElement
} from "chevrotain";

export interface ICaptureResult {
  tokens: IToken[]
  elements: CstElement[]
}

export class BaseParserClass extends EmbeddedActionsParser {
  protected CAPTURING: boolean = false
  protected CAPTURED_TOKENS: IToken[][] = []
  // protected CAPTURED_ELEMENTS: CstElement[][] = []

  public CAPTURE() {
    this.CAPTURING = true
    this.CAPTURED_TOKENS.push([])
    // this.CAPTURED_ELEMENTS.push([])
  }

  public END_CAPTURE(): IToken[] {
    const tokens = this.CAPTURED_TOKENS.pop()
    // const elements = this.CAPTURED_ELEMENTS.pop()
    if (this.CAPTURED_TOKENS.length === 0) {
      this.CAPTURING = false
    }
    return tokens
  }

  private processCapturedToken (token: IToken): IToken {
    if (!this.CAPTURING) {
      return token
    }
    // TODO: use start/end indices from token vector instead
    this.CAPTURED_TOKENS.forEach(groupArr => {
      groupArr.push(token)
    })
    // this.CAPTURED_ELEMENTS.forEach(groupArr => {
    //   groupArr.push(token)
    // })
    return token
  }

  // private processCapturedSubrule <T>(element: any): T {
  //   if (!this.CAPTURING) {
  //     return element
  //   }
  // }

  CONSUME(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME(tokType, options))
  }

  CONSUME1(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME1(tokType, options))
  }

  CONSUME2(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME2(tokType, options))
  }

  CONSUME3(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME3(tokType, options))
  }

  CONSUME4(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME4(tokType, options))
  }

  CONSUME5(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME5(tokType, options))
  }

  CONSUME6(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME6(tokType, options))
  }

  CONSUME7(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME7(tokType, options))
  }

  CONSUME8(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME8(tokType, options))
  }

  CONSUME9(
    tokType: TokenType,
    options?: ConsumeMethodOpts
  ): IToken {
    return this.processCapturedToken(super.CONSUME9(tokType, options))
  }

  /** Probably not needed */
  // SUBRULE<T>(
  //   ruleToCall: (idx: number) => T,
  //   options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE<T>(ruleToCall, options))
  // }

  // SUBRULE1<T>(
  //     ruleToCall: (idx: number) => T,
  //     options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE1<T>(ruleToCall, options))
  // }

  // SUBRULE2<T>(
  //     ruleToCall: (idx: number) => T,
  //     options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE2<T>(ruleToCall, options))
  // }

  // SUBRULE3<T>(
  //   ruleToCall: (idx: number) => T,
  //   options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE3<T>(ruleToCall, options))
  // }

  // SUBRULE4<T>(
  //   ruleToCall: (idx: number) => T,
  //   options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE4<T>(ruleToCall, options))
  // }

  // SUBRULE5<T>(
  //     ruleToCall: (idx: number) => T,
  //     options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE5<T>(ruleToCall, options))
  // }

  // SUBRULE6<T>(
  //     ruleToCall: (idx: number) => T,
  //     options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE6<T>(ruleToCall, options))
  // }

  // SUBRULE7<T>(
  //   ruleToCall: (idx: number) => T,
  //   options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE7<T>(ruleToCall, options))
  // }

  // SUBRULE8<T>(
  //   ruleToCall: (idx: number) => T,
  //   options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE8<T>(ruleToCall, options))
  // }

  // SUBRULE9<T>(
  //   ruleToCall: (idx: number) => T,
  //   options?: SubruleMethodOpts
  // ): T {
  //   return this.processCapturedSubrule<T>(super.SUBRULE9<T>(ruleToCall, options))
  // }
}