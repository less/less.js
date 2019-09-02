
import { CstParser, EMPTY_ALT, TokenType, ICstVisitor } from 'chevrotain'
import { TokenMap } from './util'

/**
 *  A Note About CSS Syntax
 *
 *  CSS, as far as syntax is defined in https://www.w3.org/TR/css-syntax-3/,
 *  is somewhat confusing the first 50 times you read it.
 *
 *  CSS essentially is not one spec of syntax and grammar, but is, in fact,
 *  a collection of specs of syntax and grammar. In addition, CSS defines different
 *  parsing rules depending on _where_ you are in the grammar.
 * 
 *  For example, if you were to just parse: `foo:bar {}` without context as to where
 *  you were parsing it, the spec says there's no way to resolve it. This may either be
 *  a property of `foo` with a value of `bar {}` (any CSS value may contain a block)
 *  or it may be the selector `foo:bar` with a set of rules in `{}`.
 * 
 *  CSS resolves this ambiguity by stating that:
 *    1. Root level rules can only contain at-rules and qualified rules.
 *    2. The curly brace in a qualified rule (a selector list with {}) is interpreted to be
 *       a list of declarations or at-rules but NOT qualified rules.
 * 
 *  This means that any pre-processor like Less, Sass, or PostCSS, using nested syntax,
 *  can never be a 100% spec-compliant CSS parser. Nested rules and declarations are
 *  ambiguous.
 * 
 *  However, in this CSS parser and parsers that extend it, we can intelligently resolve
 *  this ambiguity with these principles:
 *    1. There are no element selectors that start with '--'
 *    2. There are no currently-defined CSS properties that have a {} block as a 
 *       possible value. (If this ever happens, every CSS parser is screwed.)
 *  So while the CSS 3 Syntax says `foo:bar {}` is ambiguous if parsed out of context,
 *  we can simplify parsing by always treating it as a selector (in the rare event
 *  it ever happens).
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
          this.OPTION(() => {
            this.SUBRULE(this._)
            this.CONSUME2(this.T.Colon, { LABEL: 'colon' })
          })
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
    this.CONSUME(this.T.RCurly)
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
          this.CONSUME(this.T.RParen)
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.LSquare)
          this.SUBRULE3(this.primary)
          this.CONSUME(this.T.RSquare)
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

    primary(ctx) {
      const generics = ctx.valueOrDeclarationList
      generics.forEach(({ children }) => {
        const hasSemi = !!children.SemiColon
        const hasCurly = !!children.curlyBlock
        const firstValue = children.firstValue[0].children
        const isDeclarationLike = !!(firstValue.ident && firstValue.colon)
        const isAmbiguousValue = !!(isDeclarationLike && firstValue.pseudoOrValue)
        this.$refineValue(children, hasCurly, hasSemi, isDeclarationLike, isAmbiguousValue)
      })
      this.visit(ctx.valueOrDeclarationList)
      this.visit(ctx.curlyBlock)
      return ctx
    }

    valueOrDeclarationList(ctx) {
      this.visit(ctx.anyValueOrDeclaration)
      this.visit(ctx.curlyBlock)
      return ctx
    }

    anyValueOrDeclaration(ctx) {
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


