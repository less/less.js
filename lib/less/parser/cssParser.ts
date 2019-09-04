import { Tokens, Fragments } from './cssTokens'
import { CssStructureParser, CssStructureVisitor } from './cssBase'
import { createParser } from './util'

const { parser, lexer, tokens, T } = createParser(CssStructureParser, Fragments, Tokens)
const cssVisitor = CssStructureVisitor(
  parser.getBaseCstVisitorConstructorWithDefaults()
)

export const parse = (text: string) => {
  const lexResult = lexer.tokenize(text)
  parser.input = lexResult.tokens
  const cst = parser.primary()
  if (parser.errors.length === 0) {
    const visitor = new cssVisitor(tokens, T)
    visitor.visit(cst)
    return cst
  } else {
    return parser
  }
}