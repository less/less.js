
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
 *  _can_, but preserve almost anything it doesn't explicitly define. (There are
 *  a few exceptions, such as a closing block symbol e.g. ']' without a corresponding
 *  opening block, and other such cases where the CSS spec explicitly expresses
 *  should be a parse error.)
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
  ruleParser: CssRuleParser
  /** private Chevrotain property */
  currIdx: number

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = { maxLookahead: 1 },
    /** An optional instance to further refine rules */
    ruleParser?: CssRuleParser
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

  /** If an expression ends up not being a declaration, merge initial values into expression */
  _mergeValues = (values: CstElement[], expr: CstNode) => {
    const listChildren = expr.children
    const expressions: CstNode[] = listChildren.expression as CstNode[]
    if (expressions) {
      const firstExpression = expressions[0].children
      const firstValues = firstExpression.values
      firstExpression.values = values.concat(firstValues)
    } else {
      listChildren.expression = values
    }
  }

  /** Wrapper for secondary parsing by rule parser */
  _parseNode = (node: CstNode): CstNode => {
    return node
    // if (!this.ruleParser || this.RECORDING_PHASE) {
    //   return node
    // }
    // this.ACTION(() => {
    //   this.ruleParser.input
    // })
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

  /** Capture semi-colon fragment */
  semi = this.RULE<CstNode>('semi', () => {
    const semi = this.CONSUME(this.T.SemiColon)
    return {
      name: 'isolatedSemiColon',
      children: { semi: [semi] }
    }
  })

  rule = this.RULE<CstNode | undefined>('rule', () => {
    const ws = this.SUBRULE(this._)
    const rule: CstNode = this.OR([
      { ALT: () => this.SUBRULE(this.atRule) },
      { ALT: () => this.SUBRULE(this.componentValues) },
      { ALT: () => this.SUBRULE(this.customPropertyRule) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => this.SUBRULE(this.semi) },
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
      SemiColon?: IToken[]
    } = {}
    this.OR([
      {
        ALT: () => {
          optionals.body = [ this.SUBRULE(this.curlyBlock) ]
        }
      },
      {
        ALT: () => this.OPTION(() => {
          optionals.SemiColon = [ this.CONSUME(this.T.SemiColon) ]
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
    const start = this.currIdx
    let val: CstElement
    let ws: IToken
    let colon: IToken
    let expr: CstNode

    this.OR([
      {
        /** Grab initial colon (or 2), in case this is a selector list */
        ALT: () => {
          val = this.CONSUME(this.T.Colon)
          this.ACTION(() => {
            values.push(val)
          })
          this.OPTION(() => {
            val = this.CONSUME2(this.T.Colon)
            this.ACTION(() => {
              values.push(val)
            })
          })
        }
      },
      {
        /** Grab curly if it's the first member of an expression */
        ALT: () => {
          val = this.SUBRULE(this.curlyBlock)
          this.ACTION(() => {
            values.push(val)
          })
        }
      },
      {
        ALT: () => {
          this.AT_LEAST_ONE(() => {
            val = this.SUBRULE(this.propertyValue)
            this.ACTION(() => {
              values.push(val)
            })
          })
          ws = this.SUBRULE(this._)
          this.OPTION2(() => {
            colon = this.CONSUME(this.T.Assign)
          })
        }
      }
    ])
    
    /** Consume any remaining values */
    expr = this.SUBRULE(this.expressionList)
    let curly: CstNode, semi: IToken
    const end = this.currIdx
    this.OR2([
      { ALT: () => curly = this.SUBRULE2(this.curlyBlock) },
      { ALT: () => semi = this.CONSUME(this.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
    if (curly) {
      /** Treat as qualified rule */
      this.ACTION(() => {
        if (ws) {
          values.push(ws)
        }
        if (colon) {
          values.push(colon)
        }
        this._mergeValues(values, expr)
      })
      return this._parseNode({
        name: 'qualifiedRule',
        children: {
          expressionList: [expr],
          ruleBody: [curly]
        }
      })
    } else if (colon) {
      /** Treat as declaration */
      return {
        name: 'declaration',
        children: {
          property: values,
          ...(ws ? { ws: [ws] } : {}),
          Colon: [colon],
          value: [expr],
          ...(semi ? { SemiColon: [semi] } : {}),
        }
      }
    } else {
      /** Treat as a plain expression list */
      if (ws) {
        values.push(ws)
      }
      if (colon) {
        values.push(colon)
      }
      this._mergeValues(values, expr)
      return expr
    }
  })

  /**
   * Custom property values can consume everything, including curly blocks 
   */
  customPropertyRule = this.RULE<CstNode>('customPropertyRule', () => {
    let values: CstElement[]
    this.ACTION(() => values = [])

    const name = this.CONSUME(this.T.CustomProperty)
    const ws = this.SUBRULE(this._)
    let colon: IToken
    this.OPTION(() => {
      colon = this.CONSUME(this.T.Assign)
    })
    
    const value = this.SUBRULE(this.customExpressionList)
    let semi: IToken
    this.OPTION2(() => {
      semi = this.CONSUME(this.T.SemiColon)
    })
    if (!colon) {
      this.ACTION(() => {
        if (ws) {
          values.push(ws)
          this._mergeValues(values, value)
        }
      })
      return value
    }
    return {
      name: 'declaration',
      children: {
        property: [name],
        ...(ws ? { ws: [ws] } : {}),
        Colon: [colon],
        value: [value],
        ...(semi ? { SemiColon: [semi] } : {}),
      }
    }
  })

  /** A comma-separated list of expressions */
  expressionList = this.RULE<CstNode>('expressionList', () => {
    let expressions: CstNode[]
    let Comma: IToken[]
    let expr: CstNode
    
    this.OPTION(() => {
      expr = this.SUBRULE(this.expression)
      this.ACTION(() => {
        expressions = [ expr ]
        Comma = []
      })
      this.MANY(() => {
        const comma = this.CONSUME(this.T.Comma)
        this.ACTION(() => {
          Comma.push(comma)
        })
        expr = this.SUBRULE(this.subExpression)
        this.ACTION(() => {
          expressions.push(expr)
        })
      })
    })

    // this.ACTION(this._addDeclarationExpressions(expressions, optionals))

    return {
      name: 'expressionList',
      children: {
        ...(Comma && Comma.length > 0 ? { Comma } : {}),
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
    let expr: CstNode
    let Comma: IToken[]

    this.OPTION(() => {
      expr = this.SUBRULE(this.customExpression)
      this.ACTION(() => {
        expressions = [ expr ]
        Comma = []
      })
      this.MANY(()=> {
        let comma = this.CONSUME(this.T.Comma)
        this.ACTION(() => {
          Comma.push(comma)
        })
        expr = this.SUBRULE2(this.customExpression)
        this.ACTION(() => {
          expressions.push(expr)
        })
      })
    })

    // this.ACTION(this._addDeclarationExpressions(expressions, optionals))

    return {
      name: 'expressionList',
      children: {
        ...(Comma && Comma.length > 0 ? { Comma } : {}),
        ...(expressions ? { expression: expressions } : {})
      }
    }
  })

  /**
   *  An expression contains values and spaces
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

  /** Immediately following a comma and optional whitespace */
  subExpression = this.RULE<CstNode>('subExpression', () => {
    let values: CstElement[]
    let val: CstElement

    this.ACTION(() => values = [])

    this.OPTION(() => {
      val = this.CONSUME(this.T.WS)
      this.ACTION(() => values.push(val))
    })

    this.OPTION2(() => {
      val = this.SUBRULE(this.curlyBlock)
      this.ACTION(() => values.push(val))
    })
  
    this.MANY(() => {
      val = this.SUBRULE(this.value)
      this.ACTION(() => values.push(val))
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

  /**
   * According to a reading of the spec, whitespace is a valid
   * value in a CSS list, e.g. in the custom properties spec,
   * `--custom: ;` has a value of ' '
   *
   * However, a property's grammar may discard whitespace between values.
   * e.g. for `color: black`, the value in the browser will resolve to `black`
   * and not ` black`. The CSS spec is rather hand-wavy about whitespace,
   * sometimes mentioning it specifically, sometimes not representing it
   * in grammar even though it's expected to be present.
   *
   * Strictly speaking, though, a property's value begins _immediately_
   * following a ':' and ends at ';' (or until automatically closed by
   * '}', ']', ')' or the end of a file).
   */
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

  /**
   * Everything in `[]` or `()` we evaluate as raw expression lists,
   * or groups of expression lists (divided by semi-colons).
   * 
   * The CSS spec suggests that `[]`, `()`, `{}` should be treated equally,
   * as generic blocks, so I'm not sure of this, but in the language
   * _so far_, there's some distinction between these block types.
   * AFAIK, `[]` is only used formally in CSS grid and with attribute
   * identifiers, and `()` is used for functions and at-rule expressions.
   * 
   * It would be great if CSS formalized this distinction, but for now,
   * this seems safe.
   */
  block = this.RULE<CstNode>('block', () => {
    let L: IToken
    let R: IToken
    let Function: IToken
    let blockBody: CstNode

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
    return {
      name: 'block',
      children: {
        ...(L ? { L: [L]} : {}),
        ...(Function ? { Function: [Function]}: {}),
        ...(blockBody ? { blockBody: [blockBody]}: {}),
        ...(R ? { R: [R]} : {}),
      }
    }
  })
}