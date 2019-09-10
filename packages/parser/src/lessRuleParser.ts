import {
  TokenType,
  IParserConfig,
  IToken,
  CstNode,
  CstElement
} from 'chevrotain'
import {
  TokenMap,
  CssRuleParser
} from '@less/css-parser'

export class LessRuleParser extends CssRuleParser {
  T: TokenMap

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = { maxLookahead: 1 }
  ) {
    super(tokens, T, config)
    this.T = T
    if (this.constructor === LessRuleParser) {
      this.performSelfAnalysis()
    }
  }
}
