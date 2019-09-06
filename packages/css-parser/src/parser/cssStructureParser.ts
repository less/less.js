
import { EmbeddedActionsParser, EMPTY_ALT, TokenType, CstNode, IParserConfig } from 'chevrotain'
import { TokenMap } from '../util'

/**
 *  A Note About CSS Syntax
 *
 *  CSS, as far as syntax is defined in https://www.w3.org/TR/css-syntax-3/,
 *  is somewhat confusing the first 50 times you read it, probably because
 *  it contains some ambiguities and inherent self-contradictions due to
 *  it's legacy nature. It also has no specific "spec" to draw from.
 *
 *  CSS essentially is not one spec of syntax and grammar, but is, in fact,
 *  a collection of specs of syntax and grammar, some of which can mean that
 *  parsing rules are potentially contradictory.
 * 
 *  For example, if you were to just parse: `foo:bar {}`, if you just went by
 *  the syntax spec alone, there's no way to resolve this. Property values
 *  (according to spec), may have `{}` as a value, and pseudo-selectors may start
 *  with a colon. So this may be a property of `foo` with a value of `bar {}`
 *  or it may be the selector `foo:bar` with a set of rules in `{}`.
 * 
 *  Another example: qualified rules are supposed to gulp everything up to `{}`,
 *  including a semi-colon. Meaning `foo:bar; {}` is valid. It's an invalid
 *  _selector_, but it's not a parsing error. Or is it a valid declaration
 *  followed by an empty curly block (which is also valid)? ¯\_(ツ)_/¯
 * 
 *  This means that any pre-processor like Less, Sass, or PostCSS, using nested
 *  syntax, can never be a 100% spec-compliant CSS parser. AFAICT, there is no
 *  such thing.
 * 
 *  However, in this CSS parser and parsers that extend it, we can intelligently
 *  resolve this ambiguity with these principles:
 *    1. There are no element selectors that start with '--'
 *    2. There are no currently-defined CSS properties that have a {} block as a 
 *       possible value. (If this ever happens, every CSS parser is screwed.)
 *  This is essentially what browsers do: that is, they choose parts of the CSS
 *  grammar they can "understand". It's _browsers_ (and convention) and not the
 *  spec that allows declarations in certain places. So, currently, declarations
 *  at the root don't _mean_ anything, but if they did someday, it would not be
 *  a violation of current grammar.
 * 
 *  CSS grammar is extremely permissive to allow modularity of the syntax and
 *  future expansion. Basically, anything "unknown", including unknown tokens,
 *  does not necessarily mean a parsing error of the stylesheet itself. For
 *  example, the contents of an at-rule body (defined in a "{}") has no explicit
 *  definition, but is instead left up to the spec for that particular at rule.
 *  That means you could end up with some future at-rule like:
 *     `@future {!!:foo > ; > ?bar}`
 *  A case like that is _unlikely_, but the point is any CSS parser that lives
 *  outside of the browser, in order to be maintainable, must parse what it
 *  _can_, but preserve anything it doesn't explicitly define. A non-browser
 *  stylesheet parser should return warnings, but should recover all errors.
 */

export type CstNodeTokenVector = CstNode & {
  tokenRange: {
    start: number
    propertyEnd: number
    expressionEnd: number
    ruleEnd: number
  }
} 

/**
 *  Parsing is broken into 2 phases, so that we:
 *    1. Don't have to do any backtracking to refine rules (like @media).
 *    2. Don't have to have special parsing rules based on block context.
 * 
 *  This actually matches the spec, which essentially says that preludes and
 *  at-rule bodies (in {}) can be almost anything, and the outer grammar should
 *  not care about what at-rules or declaration values contain.
 */
export class CssStructureParser extends EmbeddedActionsParser {
  T: TokenMap
  /**
   * Defines private properties for Chevrotain
   */
  currIdx: number
  CST_STACK: CstNodeTokenVector[]

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = { maxLookahead: 1 }
  ) {
    super(tokens, config)
    this.T = T
    if (this.constructor === CssStructureParser) {
      this.performSelfAnalysis()
    }
  }

  // Optional whitespace
  _ = this.RULE('_', () => {
    this.OPTION(() => this.CONSUME(this.T.WS))
  })

  primary = this.RULE('primary', () => {
    const many = this.MANY(() => this.SUBRULE(this.rule))
    this.SUBRULE(this._)
    console.log(many)
    return many
  })

  rule = this.RULE('rule', () => {
    this.SUBRULE(this._)
    const tOR = this.OR([
      { ALT: () => this.SUBRULE(this.atRule) },
      { ALT: () => this.SUBRULE(this.componentValues) },
      { ALT: () => this.SUBRULE(this.customPropertyRule) },
      { ALT: () => EMPTY_ALT }
    ])
    console.log(tOR)
    return tOR
  })

  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  atRule = this.RULE('atRule', () => {
    this.CONSUME(this.T.AtName)
    this.SUBRULE(this.expressionList)
    this.OR([
      { ALT: () => this.SUBRULE(this.curlyBlock) },
      { ALT: () => this.OPTION(() => this.CONSUME(this.T.SemiColon)) }
    ])
  })

  property = this.RULE('property', () => {
    /** A start colon is obviously invalid, but we're just collecting for post-processing */
    this.OPTION(() => this.CONSUME(this.T.Colon))
    this.AT_LEAST_ONE(() => this.SUBRULE(this.propertyValue))
  })

  propertyValue = this.RULE('propertyValue', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.block) },
      { ALT: () => this.CONSUME(this.T.Ident) },
      { ALT: () => this.CONSUME(this.T.NonIdent) }
    ])
  })

  componentValues = this.RULE('componentValues', () => {
    const start = this.currIdx + 1
    this.SUBRULE(this.property)
    const propertyEnd = this.currIdx + 1
    /** This may be a declaration or declaration-like, we'll see */
    this.SUBRULE(this._)
    this.OPTION(() => this.CONSUME(this.T.Colon, { LABEL: 'colon' }))
    
    /** Consume any remaining values */
    this.SUBRULE(this.expressionList)
    const expressionEnd = this.currIdx + 1
    this.OR2([
      { ALT: () => this.SUBRULE(this.curlyBlock) },
      { ALT: () => this.CONSUME(this.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
    const ruleEnd = this.currIdx + 1
    // if (!this.RECORDING_PHASE) {
    //   this.CST_STACK[this.CST_STACK.length - 1].tokenRange = {
    //     start, propertyEnd, expressionEnd, ruleEnd
    //   }
    // }
  })

  /**
   * Custom property values can consume everything, including curly blocks 
   */
  customPropertyRule = this.RULE('customPropertyRule', () => {
    this.CONSUME(this.T.CustomProperty)
    this.SUBRULE(this._)
    /** This may be a custom prop reference, not a declaration */
    this.OPTION(() => this.CONSUME(this.T.Colon))
    this.SUBRULE(this.customExpressionList)
  })

  /** A comma-separated list of expressions */
  expressionList = this.RULE('expressionList', () => {
    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => this.SUBRULE(this.expression)
    })
  })

  customExpressionList = this.RULE('customExpressionList', () => {
    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => this.SUBRULE(this.customExpression)
    })
  })

  /** A list of values and white space */
  expression = this.RULE('expression', () => {
    this.MANY(() => this.SUBRULE(this.value))
  })

  customExpression = this.RULE('customExpression', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.value) },
        { ALT: () => this.SUBRULE(this.curlyBlock) }
      ])
    })
  })

  value = this.RULE('value', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.block) },
      { ALT: () => this.CONSUME(this.T.Value) },
      { ALT: () => this.CONSUME(this.T.Colon) },
      { ALT: () => this.CONSUME(this.T.AtName) },
      { ALT: () => this.CONSUME(this.T.CustomProperty) },
      { ALT: () => this.CONSUME(this.T.WS) }
    ])
  })

  curlyBlock = this.RULE('curlyBlock', () => {
    this.CONSUME(this.T.LCurly)
    this.SUBRULE(this.primary)
    this.OPTION(() => this.CONSUME(this.T.RCurly))
  })

  block = this.RULE('block', () => {
    this.OR([
      {
        ALT: () => {
          this.OR2([
            { ALT: () => this.CONSUME(this.T.LParen) },
            { ALT: () => this.CONSUME(this.T.Function) },
          ])
          this.SUBRULE2(this.primary)
          this.OPTION(() => this.CONSUME(this.T.RParen))
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.LSquare)
          this.SUBRULE3(this.primary)
          this.OPTION2(() => this.CONSUME(this.T.RSquare))
        }
      }
    ])
  })
}
