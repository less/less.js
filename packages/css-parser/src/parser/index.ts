import { IToken } from 'chevrotain'
import { Tokens, Fragments } from '../cssTokens'
import { CssStructureParser } from './cssStructureParser'
import { CssRuleParser } from './cssRuleParser'
import { CssStructureVisitor } from './cssStructureVisitor'
import { createParser } from '../util'

let { parser, lexer, tokens, T } = createParser(CssStructureParser, Fragments, Tokens)
// const cssVisitor = CssStructureVisitor(
//   parser.getBaseCstVisitorConstructorWithDefaults()
// )

export const parse = (text: string) => {
  const lexResult = lexer.tokenize(text)
  const lexedTokens: IToken[] = lexResult.tokens
  parser.input = lexedTokens
  const cst = parser.primary()

  if (parser.errors.length === 0) {
    // parser = new CssRuleParser(tokens, T)
    // const visitor = new cssVisitor(parser as CssRuleParser, lexedTokens)
    // visitor.visit(cst)
  }

  return { cst, parser }
}