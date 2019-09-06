
import {
  EmbeddedActionsParser,
  EMPTY_ALT,
  TokenType,
  CstNode,
  CstElement,
  IParserConfig,
  IToken
} from 'chevrotain'
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

interface optionalValues {
  selector?: CstNode[]
  declaration?: CstNode[]
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
  currentSelectorStack: IToken[]
  currentSelectors: CstNode[] | boolean
  expectedSelectorTokens: TokenType[][]

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

  _processValues = (values: CstElement[]): optionalValues => {
    const optionals: optionalValues = {}

    if (values.length > 0) {
      const selector = this._selectorBuilder(values)
      if (selector) {
        optionals.selector = selector
      }
    }
    /**
     * At minimum, a declaration needs an ident, a colon, and a value (3).
     * Note: the last value may be whitespace
     */
    if (values.length > 3) {
       const declaration = this._declarationBuilder(values)
       if (declaration) {
         optionals.declaration = declaration
       }
    }

    return optionals
  }

  /**
   * Attempts to build selectors out of Cst elements
   */
  _selectorBuilder = (elements: CstElement[]): CstNode[] => {
    const selectorNodes: CstNode[] = []
    return selectorNodes
  }

  /**
   * Attempts to build declarations out of Cst elements
   */
  _declarationBuilder = (elements: CstElement[]): CstNode[] => {
    const declNodes: CstNode[] = []
    return declNodes
  }

  // Optional whitespace
  _ = this.RULE<IToken>('_', () => {
    return this.OPTION<IToken>(() => this.CONSUME(this.T.WS))
  })

  primary = this.RULE<CstNode>('primary', () => {
    const rules: CstElement[] = []
    this.MANY(() => {
      const rule = this.SUBRULE<CstNode>(this.rule)
      this.ACTION(() => rules.push(rule))
    })
    const post = [ this.SUBRULE<IToken>(this._) ]
    return {
      name: 'primary',
      children: {
        rules,
        post
      }
    }
  })

  rule = this.RULE<CstNode>('rule', () => {
    const pre = [ this.SUBRULE<IToken>(this._) ]
    const rule = [
      this.OR([
        { ALT: () => this.SUBRULE<CstNode>(this.atRule) },
        { ALT: () => this.SUBRULE<CstNode>(this.componentValues) },
        { ALT: () => this.SUBRULE<CstNode>(this.customPropertyRule) },
        { ALT: () => EMPTY_ALT }
      ])
    ]
    return {
      name: 'rule',
      children: {
        pre,
        rule
      }
    }
  })

  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  atRule = this.RULE<CstNode>('atRule', () => {
    const name = [ this.CONSUME(this.T.AtName) ]
    const prelude = this.SUBRULE<CstNode>(this.expressionList)
    const optionals: {
      body?: CstNode[]
      end?: IToken[]
    } = {}
    this.OR([
      {
        ALT: () => {
          optionals.body = [ this.SUBRULE<CstNode>(this.curlyBlock) ]
        }
      },
      {
        ALT: () => this.OPTION(() => {
          optionals.end = [ this.CONSUME(this.T.SemiColon) ]
        })
      }
    ])

    return {
      name: 'atRule',
      children: {
        name,
        prelude,
        ...optionals
      }
    }
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

  /** Values without space separators */
  valueGroup = this.RULE<CstNode>('valueGroup', () => {
    let isDeclarationLike: boolean
    const values: CstElement[] = []
    this.OPTION(() => {
      values.push(this.CONSUME(this.T.Colon))
      isDeclarationLike = false
    })
    this.AT_LEAST_ONE(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.block) },
        { ALT: () => this.CONSUME(this.T.Ident) },
        { ALT: () => this.CONSUME(this.T.NonIdent) }
      ])
    })
  })

  componentValues = this.RULE<CstNode>('componentValues', () => {
    const values: CstElement[] = []

    this.SUBRULE(this.property)
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

  /**
   *  An expression may return values, selectors, and/or a declaration
   *  
   *  It's important to note that the selectors and declarations are
   *  _duplicates_ of the value collection. Those latter collections just indicate
   *  that the values returned could be interpreted / represented as either selectors
   *  and / or a declaration
   */
  expression = this.RULE<CstNode>('expression', () => {
    let values: CstElement[]
    let optionals: optionalValues = {}
  
    this.ACTION(() => values = [])
    this.MANY(() => {
      const value = this.SUBRULE<CstElement>(this.value)
      this.ACTION(() => values.push(value))
    })

    this.ACTION(() => {
      optionals = this._processValues(values)
    })
    
    return {
      name: 'expression',
      children: {
        values,
        ...optionals
      }
    }
  })

  customExpression = this.RULE<CstNode>('customExpression', () => {
    let values: CstElement[]
    let optionals: optionalValues = {}

    this.MANY(() => {
      const val = this.OR([
        { ALT: () => this.SUBRULE(this.value) },
        { ALT: () => this.SUBRULE(this.curlyBlock) }
      ])
      this.ACTION(() => values.push(val))
    })

    this.ACTION(() => {
      optionals = this._processValues(values)
    })
    
    return {
      name: 'expression',
      children: {
        values,
        ...optionals
      }
    }
  })

  value = this.RULE<CstElement>('value', () => {
    return this.OR([
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
          this.SUBRULE2(this.customExpressionList)
          this.OPTION(() => this.CONSUME(this.T.RParen))
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.LSquare)
          this.SUBRULE3(this.customExpressionList)
          this.OPTION2(() => this.CONSUME(this.T.RSquare))
        }
      }
    ])
  })
}
