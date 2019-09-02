
import { CstParser, EMPTY_ALT, TokenType, ICstVisitor } from 'chevrotain'
import { TokenMap } from './util'

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
 *  stylesheet parser should return warnings, but
 */

/**
 *  Parsing is broken into 2 phases, so that we:
 *    1. Don't have to do any backtracking to refine rules (like @media).
 *    2. Don't have to have special parsing rules based on block context.
 * 
 *  This actually matches the spec, which essentially says that preludes and
 *  at-rule bodies (in {}) can be almost anything, and the outer grammar should
 *  not care about what at-rules or declaration values contain.
 */
export class CssStructureParser extends CstParser {
  T: TokenMap

  constructor(tokens: TokenType[], T: TokenMap) {
    super(tokens, {
      maxLookahead: 1
    })
    this.T = T
    this.performSelfAnalysis()
  }

  // Optional whitespace
  _ = this.RULE('_', () => {
    this.OPTION(() => this.CONSUME(this.T.WS))
  })

  primary = this.RULE('primary', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(this.T.WS) },
        { ALT: () => this.SUBRULE(this.atRule) },
        { ALT: () => this.SUBRULE(this.genericRule) },
        { ALT: () => this.SUBRULE(this.customPropertyRule) },
        { ALT: () => EMPTY_ALT }
      ])
    })
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

  genericRule = this.RULE('genericRule', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.block) },
      { ALT: () => this.CONSUME(this.T.Colon) },
      {
        /** This may be a declaration; it depends on having a curly */
        ALT: () => {
          this.CONSUME(this.T.Ident, { LABEL: 'ident' })
          this.SUBRULE(this._)
          this.OPTION(() => this.CONSUME2(this.T.Colon, { LABEL: 'colon' }))
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.NonIdent)
        }
      }
    ])
    /** Consume any remaining values */
    this.SUBRULE(this.expression)
    this.OPTION2(() => {
      this.CONSUME(this.T.Comma)
      this.SUBRULE(this.expressionList)
    })
    this.OR2([
      { ALT: () => this.SUBRULE(this.curlyBlock) },
      { ALT: () => this.OPTION3(() => this.CONSUME(this.T.SemiColon)) }
    ])
  })

  /**
   * Custom property values can consume everything, including curly blocks 
   */
  customPropertyRule = this.RULE('customPropertyRule', () => {
    this.CONSUME(this.T.CustomProperty)
    this.SUBRULE(this._)
    this.CONSUME(this.T.Colon)
    this.SUBRULE(this.expressionList, { ARGS: [true] })
  })

  /** A comma-separated list of expressions */
  expressionList = this.RULE('expressionList', (isCustomPropertyValue: boolean = false) => {
    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => this.SUBRULE(this.expression, { ARGS: [isCustomPropertyValue] })
    })
  })

  /** A list of values and white space */
  expression = this.RULE('expression', (isCustomPropertyValue: boolean = false) => {
    this.MANY(() => this.SUBRULE(this.value, { ARGS: [isCustomPropertyValue] }))
  })

  value = this.RULE('value', (isCustomPropertyValue: boolean = false) => {
    this.OR([
      {
        GATE: () => isCustomPropertyValue,
        ALT: () => this.SUBRULE(this.curlyBlock)
      },
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
            { ALT: () => this.CONSUME(this.T.PseudoFunction) }
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

export class CssParser extends CstParser {
  T: TokenMap
  constructor(tokens: TokenType[] = [], T: TokenMap = {}) {
    super(tokens, {
      maxLookahead: 1
    })
    this.T = T;
  }

  _ = this.RULE('_', () => {
    this.OPTION(() => this.CONSUME(this.T.WS))
  })

  primary = this.RULE('primary', () => {
    this.CONSUME(this.T.Value)
  })

  declaration = this.RULE('declaration', () => {
    this.CONSUME(this.T.Ident)
    this.SUBRULE(this._)
    this.CONSUME(this.T.Colon)
    this.SUBRULE(this.expression)
  })

  expression = this.RULE('expression', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(this.T.WS) },
        { ALT: () => this.SUBRULE(this.value) }
      ])
    })
  })

  value = this.RULE('value', () => {
    this.CONSUME(this.T.Value)
    // this.OR([
    //   { ALT: () => this.CONSUME() },

    // ])
  })
}

export interface CstVisitorInstance {
  new (...args: any[]): ICstVisitor<any, any>
}

export const CssStructureVisitor = (baseConstructor: CstVisitorInstance) => {
  return class extends baseConstructor {
    cssParser: CssParser
    constructor(tokens: TokenType[], T: TokenMap) {
      super()
      this.cssParser = new CssParser(tokens, T)
      this.validateVisitor()
    }

    $refineValue(ctx, hasCurly: boolean, hasSemi: boolean, isDeclarationLike: boolean, isAmbiguousValue: boolean) {
      if (isDeclarationLike) {

      }
    }

    genericRule(ctx) {
      const generics = ctx.genericRule
      generics.forEach(({ children }) => {
        const hasSemi = !!children.SemiColon
        const hasCurly = !!children.curlyBlock
        const firstValue = children.firstValue[0].children
        const isDeclarationLike = !!(firstValue.ident && firstValue.colon)
        const isAmbiguousValue = !!(isDeclarationLike && firstValue.pseudoOrValue)
        this.$refineValue(children, hasCurly, hasSemi, isDeclarationLike, isAmbiguousValue)
      })
      this.visit(ctx.genericRule)
      this.visit(ctx.curlyBlock)
      return ctx
    }

    expressionList(ctx) {
      return ctx
    }

    curlyBlock(ctx) {
      this.visit(ctx.primary)
      return ctx
    }
  }
}

/**
 * @todo pseudo-code, parse loosely first, then more specifically for atrules / values
 */
// const mediaRuleParser = new MediaRuleParser();

// fuzzyDirective(ctx) {
//     const subVector = ctx.NotSemiColon
//     mediaRuleParser.input = subVector;
//     const structuredMediaRuleCst = mediaRuleParser.wellDefinedMediaRule();
//     if (mediaRuleParser.errors === 0) {
//         delete ctx.NotSemiColon
//         ctx.children[structuredMediaRuleCst.name] = [structuredMediaRuleCst]
//     // Are these errors in fact warnings to user?
//     } else {
//        ctx.unstructuredMediaRule = ctx.NotSemiColon
//        delete ctx.NotSemiColon
//     }
// }


