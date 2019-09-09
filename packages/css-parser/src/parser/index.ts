import { IToken, Lexer } from 'chevrotain'
import { Tokens, Fragments } from '../cssTokens'
import { CssStructureParser } from './cssStructureParser'
import { CssRuleParser } from './cssRuleParser'
import { CssStructureVisitor } from './cssStructureVisitor'
import { createLexer } from '../util'

// let { parser, lexer, tokens, T } = createParser(CssStructureParser, Fragments, Tokens)
// const cssVisitor = CssStructureVisitor(
//   parser.getBaseCstVisitorConstructorWithDefaults()
// )

export class Parser {
  lexer: Lexer
  parser: CssStructureParser

  constructor() {
    const { lexer, tokens, T } = createLexer(Fragments, Tokens)
    this.lexer = lexer
    this.parser = new CssStructureParser(tokens, T)
  }

  parse (text: string) {
    const lexerResult = this.lexer.tokenize(text)
    const lexedTokens: IToken[] = lexerResult.tokens
    this.parser.input = lexedTokens
    const cst = this.parser.primary()
  
    return { cst, lexerResult, parser: this.parser }
  }
}
