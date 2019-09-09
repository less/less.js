import { IToken, Lexer } from 'chevrotain'
import { Tokens, Fragments } from './lessTokens'
import { CssStructureParser, createLexer } from '@less/css-parser'

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

