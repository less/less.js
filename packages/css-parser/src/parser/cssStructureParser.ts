
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
import { CssRuleParser } from './cssRuleParser'

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

interface spaceToken {
  pre?: IToken[]
  post?: IToken[]
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
  ruleParser: typeof CssRuleParser

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = { maxLookahead: 1 },
    /** An optional instance to further refine rules */
    ruleParser?: typeof CssRuleParser
  ) {
    super(tokens, config)
    this.T = T
    if (ruleParser) {
      this.ruleParser = ruleParser
    }
    if (this.constructor === CssStructureParser) {
      this.performSelfAnalysis()
    }
  }

  /** Optional whitespace */
  _ = this.RULE<IToken | undefined>('_', () => {
    let token
    this.OPTION(() => token = this.CONSUME(this.T.WS))
    return token
  })

  primary = this.RULE<CstNode>('primary', () => {
    const rules: CstElement[] = []
    this.MANY(() => {
      const rule = this.SUBRULE(this.rule)
      this.ACTION(() => rule && rules.push(rule))
    })
    let post: spaceToken = {}
    const ws = this.SUBRULE(this._)
    this.ACTION(() => {
      if (ws) {
        post = { post: [ ws ] }
      }
    })
    return {
      name: 'primary',
      children: {
        rules,
        ...post
      }
    }
  })

  rule = this.RULE<CstNode | undefined>('rule', () => {
    const ws = this.SUBRULE(this._)
    const rule: CstNode = this.OR([
      { ALT: () => this.SUBRULE(this.atRule) },
      { ALT: () => this.SUBRULE(this.componentValues) },
      { ALT: () => this.SUBRULE(this.customPropertyRule) },
      { ALT: () => EMPTY_ALT }
    ])

    if (rule.children) {
      if (ws) {
        rule.children.pre = [ws]
      }
      return rule
    }
    else if (ws) {
      return {
        name: 'ws',
        children: {
          value: [ws]
        }
      }
    }
  })

  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  atRule = this.RULE<CstNode>('atRule', () => {
    const name = [ this.CONSUME(this.T.AtName) ]
    const prelude = [ this.SUBRULE(this.expressionList) ]
    const optionals: {
      body?: CstNode[]
      semi?: IToken[]
    } = {}
    this.OR([
      {
        ALT: () => {
          optionals.body = [ this.SUBRULE(this.curlyBlock) ]
        }
      },
      {
        ALT: () => this.OPTION(() => {
          optionals.semi = [ this.CONSUME(this.T.SemiColon) ]
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

  propertyValue = this.RULE<CstElement>('propertyValue', () => {
    return this.OR([
      { ALT: () => this.SUBRULE(this.block) },
      { ALT: () => this.CONSUME(this.T.Value) }
    ])
  })

  componentValues = this.RULE<CstNode>('componentValues', () => {
    const values: CstElement[] = []
    let val: CstElement
    let ws: IToken
    let colon: IToken
    let expr: CstNode

    /** Grab initial colon, in case this is a selector list */
    this.OPTION(() => {
      val = this.CONSUME(this.T.Colon)
      this.ACTION(() => {
        values.push(val)
      })
    })

    this.AT_LEAST_ONE(() => {
      val = this.SUBRULE(this.propertyValue)
      this.ACTION(() => {
        values.push(val)
      })
    })
    ws = this.SUBRULE(this._)
    this.OPTION2(() => {
      colon = this.CONSUME2(this.T.Colon)
    })

    const mergeValues = () => {
      this.ACTION(() => {
        if (ws) {
          values.push(ws)
        }
        if (colon) {
          values.push(colon)
        }
        const listChildren = expr.children
        const expressions: CstNode[] = listChildren.expression as CstNode[]
        if (expressions) {
          const firstExpression = expressions[0].children
          const firstValues = firstExpression.values
          firstExpression.values = values.concat(firstValues)
        } else {
          listChildren.expression = values
        }
      })
    }
    
    /** Consume any remaining values */
    expr = this.SUBRULE(this.expressionList)
    let curly: CstNode, semi: IToken
    this.OR2([
      { ALT: () => curly = this.SUBRULE(this.curlyBlock) },
      { ALT: () => semi = this.CONSUME(this.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
    if (curly) {
      /** Treat as qualified rule */
      mergeValues()
      return {
        name: 'qualifiedRule',
        children: {
          selectorList: [expr],
          ruleBody: [curly]
        }
      }
    } else if (colon) {
      /** Treat as declaration */
      return {
        name: 'declaration',
        children: {
          property: values,
          ...(ws ? { ws: [ws] } : {}),
          colon: [colon],
          value: [expr],
          ...(semi ? { semi: [semi] } : {}),
        }
      }
    } else {
      /** Treat as a plain expression list */
      mergeValues()
      return expr
    }
  })

  /**
   * Custom property values can consume everything, including curly blocks 
   */
  customPropertyRule = this.RULE<CstNode>('customPropertyRule', () => {
    const name = this.CONSUME(this.T.CustomProperty)
    const ws = this.SUBRULE(this._)
    const colon = this.CONSUME(this.T.Colon)
    const value = this.SUBRULE(this.customExpressionList)
    let semi: IToken
    this.OPTION(() => {
      semi = this.CONSUME(this.T.SemiColon)
    })
    return {
      name: 'declaration',
      children: {
        property: [name],
        ...(ws ? { ws: [ws] } : {}),
        colon: [colon],
        value: [value],
        ...(semi ? { semi: [semi] } : {}),
      }
    }
  })

  /** A comma-separated list of expressions */
  expressionList = this.RULE<CstNode>('expressionList', () => {
    let expressions: CstNode[]

    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => {
        const expr = this.SUBRULE(this.expression)
        this.ACTION(() => {
          if (expressions) {
            expressions.push(expr)
          } else {
            expressions = [ expr ]
          }
        })
      }
    })

    // this.ACTION(this._addDeclarationExpressions(expressions, optionals))

    return {
      name: 'expressionList',
      children: {
        ...(expressions ? { expression: expressions } : {})
      }
    }
  })

  /** List of expression lists (or expression list if only 1) */
  expressionListGroup = this.RULE<CstNode>('expressionListGroup', () => {
    let isGroup = false
    let SemiColon: IToken[]
    let expressionList: CstNode[]
    let list: CstNode = this.SUBRULE(this.customExpressionList)
    let semi: IToken

    this.OPTION(() => {
      semi = this.CONSUME(this.T.SemiColon)
      isGroup = true
      this.ACTION(() => {
        expressionList = [list]
        SemiColon = [semi]
      })
      this.MANY(() => {
        list = this.SUBRULE2(this.customExpressionList)
        this.ACTION(() => {
          expressionList.push(list)
          SemiColon = [semi]
        })
        this.OPTION2(() => {
          semi = this.CONSUME2(this.T.SemiColon)
          this.ACTION(() => {
            SemiColon.push(semi)
          })
        })
      })
    })
    if (isGroup) {
      return {
        name: 'expressionListGroup',
        children: {
          SemiColon,
          expressionList
        }
      }
    }
    return list
  })

  customExpressionList = this.RULE<CstNode>('customExpressionList', () => {
    let expressions: CstNode[]

    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => {
        const expr = this.SUBRULE(this.customExpression)
        this.ACTION(() => {
          if (expressions) {
            expressions.push(expr)
          } else {
            expressions = [ expr ]
          }
        })
      }
    })

    // this.ACTION(this._addDeclarationExpressions(expressions, optionals))

    return {
      name: 'expressionList',
      children: {
        ...(expressions ? { expression: expressions } : {})
      }
    }
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
  
    this.ACTION(() => values = [])
  
    this.MANY(() => {
      const value = this.SUBRULE(this.value)
      this.ACTION(() => values.push(value))
    })
    
    return {
      name: 'expression',
      children: { values }
    }
  })

  customExpression = this.RULE<CstNode>('customExpression', () => {
    let values: CstElement[]
  
    this.ACTION(() => values = [])
  
    this.MANY(() => {
      const value = this.OR([
        { ALT: () => this.SUBRULE(this.value) },
        { ALT: () => this.SUBRULE(this.curlyBlock) }
      ])
      this.ACTION(() => values.push(value))
    })
    
    return {
      name: 'expression',
      children: { values }
    }
  })

  value = this.RULE<CstElement>('value', () => {
    return this.OR([
      { ALT: () => this.SUBRULE(this.block) },
      { ALT: () => this.CONSUME(this.T.Value) },
      { ALT: () => this.CONSUME(this.T.AtName) },
      { ALT: () => this.CONSUME(this.T.CustomProperty) },
      { ALT: () => this.CONSUME(this.T.Colon) },
      { ALT: () => this.CONSUME(this.T.WS) }
    ])
  })

  curlyBlock = this.RULE<CstNode>('curlyBlock', () => {
    let children: {[key: string]: CstElement[] }

    const L = this.CONSUME(this.T.LCurly)
    const blockBody = this.SUBRULE(this.primary)

    this.ACTION(() => {
      children = { L: [L], blockBody: [blockBody] }
    })

    this.OPTION(() => {
      const R = this.CONSUME(this.T.RCurly)
      this.ACTION(() => children.R = [R])
    })
    
    return {
      name: 'curlyBlock',
      children
    }
  })

  block = this.RULE<CstNode>('block', () => {
    let L: IToken
    let R: IToken
    let Function: IToken
    let blockBody: CstNode
    let block: CstNode

    this.OR([
      {
        ALT: () => {
          this.OR2([
            { ALT: () => L = this.CONSUME(this.T.LParen) },
            { ALT: () => Function = this.CONSUME(this.T.Function) }
          ])
          blockBody = this.SUBRULE(this.expressionListGroup)
          this.OPTION(() => R = this.CONSUME(this.T.RParen))
        }
      },
      {
        ALT: () => {
          L = this.CONSUME(this.T.LSquare)
          blockBody = this.SUBRULE2(this.expressionListGroup)
          this.OPTION2(() => R = this.CONSUME(this.T.RSquare))
        }
      }
    ])
    return block || {
      name: 'block',
      children: {
        ...(L ? { L: [L]} : {}),
        ...(Function ? { Function: [Function]}: {}),
        ...(blockBody ? { blockBody: [blockBody]}: {}),
        ...(R ? { R: [R]} : {}),
      }
    }
  })

  // attrSelectorValue = this.RULE<IToken[]>('attrSelectorValue', () => {
  //   let token: IToken
  //   const tokens: IToken[] = []

  //   token = this.CONSUME(this.T.Ident)
  //   this.ACTION(() => tokens.push(token))
  //   this.OPTION(() => {
  //     token = this.CONSUME(this.T.AttrMatchOperator)
  //     this.ACTION(() => tokens.push(token))

  //     token = this.OR([
  //       { ALT: () => this.CONSUME(this.T.StringLiteral) },
  //       { ALT: () => this.CONSUME2(this.T.Ident) }
  //     ])
  //     this.ACTION(() => tokens.push(token))

  //     this.OPTION2(() => {
  //       token = this.CONSUME(this.T.WS)
  //       this.ACTION(() => tokens.push(token))
  //     })

  //     this.OPTION3(() => {
  //       token = this.CONSUME(this.T.AttrFlag)
  //       this.ACTION(() => tokens.push(token))
  //     })
  //   })
  //   token = this.CONSUME(this.T.RSquare)
  //   this.ACTION(() => tokens.push(token))

  //   return tokens
  // })
}
