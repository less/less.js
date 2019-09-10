import { IToken, Lexer } from 'chevrotain'
import { Tokens, Fragments } from './lessTokens'
import { CssStructureParser, createLexer, IParseResult } from '@less/css-parser'
import { LessRuleParser } from './lessRuleParser'

export class Parser {
  lexer: Lexer
  parser: CssStructureParser

  constructor(structureOnly: boolean = false) {
    const { lexer, tokens, T } = createLexer(Fragments, Tokens)
    this.lexer = lexer
    if (structureOnly) {
      this.parser = new CssStructureParser(tokens, T)
    } else {
      const ruleParser = new LessRuleParser(tokens, T)
      this.parser = new CssStructureParser(tokens, T, undefined, ruleParser)
    }
  }

  parse (text: string): IParseResult {
    const lexerResult = this.lexer.tokenize(text)
    const lexedTokens: IToken[] = lexerResult.tokens
    this.parser.input = lexedTokens
    const cst = this.parser.primary()
  
    return { cst, lexerResult, parser: this.parser }
  }
}

