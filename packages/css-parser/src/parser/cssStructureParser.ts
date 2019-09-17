
import {
  EMPTY_ALT,
  TokenType,
  CstNode,
  CstElement,
  IParserConfig,
  IToken
} from 'chevrotain'
import { TokenMap } from '../util'
import { CssRuleParser } from './cssRuleParser'
import { BaseParserClass } from './baseParserClass'

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
 *  CSS resolves syntactic ambiguity by specifying that blocks should have different
 *  parsing strategies based on context. Blocks can either parse a list of rules,
 *  or can parse a list of declarations (at-rules are considered declarations),
 *  but not both.
 * 
 *  Here's the rub: blocks are generic, can be wrapped in `()`, `[]`, or `{}`, 
 *  and which type they consume is not defined globally; it's defined by that
 *  particular declaration's own grammar. In addition, if one assumes that `{}`
 *  is always a list of declarations, that's not the case. Custom properties
 *  can contain curly blocks that contain anything.
 * 
 *  Making a context-switching CSS parser is possible, but not useful, both for
 *  custom properties that define a rule-like block, and for generalizing
 *  parsing for pre-processors like Less. Unfortunately, any pre-processor with
 *  nested syntax is inherently ambiguous for the above reasons, meaning any
 *  pre-processor like Less, Sass, or PostCSS, using nested syntax, can never be
 *  a 100% spec-compliant CSS parser.
 * 
 *  However, in this CSS parser and parsers that extend it, we can intelligently
 *  resolve ambiguities with these principles:
 *    1. There are no element selectors that start with '--'
 *    2. There are no currently-defined CSS properties that have a {} block as a 
 *       possible value. (If this ever happens, CSS parsing libraries are screwed.)
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
export class CssStructureParser extends BaseParserClass {
  T: TokenMap
  ruleParser: CssRuleParser

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = {
      maxLookahead: 1
      /*, traceInitPerf:2 */
    },
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
  _mergeValues = (values: CstElement[], expr?: CstNode): CstNode => {
    if (!expr) {
      /** Create new expression list */
      expr = {
        name: 'expressionList',
        children: {
          expression: [{
            name: 'expression',
            children: {
              values: []
            }
          }]
        }
      }
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
    return expr
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


  WS(idx:number = 0) {
    // +10 to avoid conflicts with other OPTION in the calling rule.
    return this.option(idx+10, () => {
      const  wsToken = this.consume(idx, this.T.WS)
      return wsToken
    })
  }
  // /** Optional whitespace */
  // _ = this.RULE<IToken | undefined>('_', () => {
  //   let token: IToken
  //   this.OPTION(() => token = this.CONSUME(this.T.WS))
  //   return token
  // })

  primary = this.RULE<CstNode>('primary', () => {
    const rules: CstElement[] = []
    this.MANY(() => {
      const rule = this.SUBRULE(this.rule)
      rule && rules.push(rule)
    })
    let post: spaceToken = {}
    const ws = this.WS()
      if (ws) {
        post = { post: [ ws ] }
      }
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
    const ws = this.WS()
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
    const expr = this.SUBRULE(this.expressionList)
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
        ...(expr ? { prelude: [expr] }: {}),
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
    let expressionTokens: IToken[]
    let propertyTokens: IToken[]
    let valueTokens: IToken[]
    const parser = this.ruleParser

    this.CAPTURE()

    this.OR([
      {
        /** Grab initial colon (or 2), in case this is a selector list */
        ALT: () => {
          val = this.CONSUME(this.T.Colon)
          values.push(val)
          this.OPTION(() => {
            val = this.CONSUME2(this.T.Colon)
            values.push(val)
          })
        }
      },
      {
        /** Grab curly if it's the first member of an expression */
        ALT: () => {
          val = this.SUBRULE(this.curlyBlock)
          values.push(val)
        }
      },
      {
        ALT: () => {
          this.CAPTURE()
          this.AT_LEAST_ONE(() => {
            val = this.SUBRULE(this.propertyValue)
            values.push(val)
          })
          propertyTokens = this.END_CAPTURE()
          ws = this.WS()
          this.OPTION2(() => {
            colon = this.CONSUME(this.T.Assign)
          })
        }
      }
    ])
    
    /** Consume any remaining values */
    this.CAPTURE()
    expr = this.SUBRULE(this.expressionList)
    let curly: CstNode, semi: IToken

    valueTokens = this.END_CAPTURE()
    expressionTokens = this.END_CAPTURE()

    this.OR2([
      { ALT: () => curly = this.SUBRULE2(this.curlyBlock) },
      { ALT: () => semi = this.CONSUME(this.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
    if (curly) {
      /** Treat as qualified rule */
        if (ws) {
          values.push(ws)
        }
        if (colon) {
          values.push(colon)
        }
        if (values.length > 0) {
          this.ACTION(() => {
            expr = this._mergeValues(values, expr)
          })
        }

      return {
        name: 'qualifiedRule',
        children: {
          expressionList: [expr],
          body: [curly]
        }
      }
    } else if (colon) {
      /** Treat as declaration */
      let property: CstElement[]
      let value: CstNode[]
      this.ACTION(() => {
        if (this.ruleParser) {
          parser.input = propertyTokens
          property = parser.property()
          parser.input = valueTokens
          expr = parser.expression()
        } else {
          property = values
        }
        value = [expr]
      })
      return {
        name: 'declaration',
        children: {
          property,
          ...(ws ? { ws: [ws] } : {}),
          Colon: [colon],
          value,
          ...(semi ? { SemiColon: [semi] } : {}),
        }
      }
    }
    /**
     * Treat as a plain expression list
     * @todo - Any error flagging to do here?
     */
    if (ws) {
      values.push(ws)
    }
    if (colon) {
      values.push(colon)
    }
    if (values.length > 0) {
      expr = this._mergeValues(values, expr)
    }
    return expr
  })

  /**
   * Custom property values can consume everything, including curly blocks 
   */
  customPropertyRule = this.RULE<CstNode>('customPropertyRule', () => {
    const name = this.CONSUME(this.T.CustomProperty)
    const ws = this.WS()
    let colon: IToken = this.CONSUME(this.T.Assign)
    
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
        Colon: [colon],
        value: [value],
        ...(semi ? { SemiColon: [semi] } : {}),
      }
    }
  })

  /** A comma-separated list of expressions */
  expressionList = this.RULE<CstNode | undefined>('expressionList', () => {
    let expressions: CstNode[]
    let Comma: IToken[]
    let expr: CstNode
    
    this.OPTION(() => {
      expr = this.SUBRULE(this.expression)
      if (expr) {
        expressions = [ expr ]
      } else {
        expressions = []
      }
      Comma = []
      this.MANY(() => {
        const comma = this.CONSUME(this.T.Comma)
        Comma.push(comma)
        expr = this.SUBRULE(this.subExpression)
        expressions.push(expr)
      })
    })

    if (expr) {
      return {
        name: 'expressionList',
        children: {
          ...(Comma && Comma.length > 0 ? { Comma } : {}),
          ...(expressions ? { expression: expressions } : {})
        }
      }
    }
  })

  /** List of expression lists (or expression list if only 1) */
  expressionListGroup = this.RULE<CstNode | undefined>('expressionListGroup', () => {
    let isGroup = false
    let SemiColon: IToken[]
    let expressionList: CstNode[]
    let list: CstNode = this.SUBRULE(this.customExpressionList)
    let semi: IToken

    this.OPTION(() => {
      semi = this.CONSUME(this.T.SemiColon)
      isGroup = true
      expressionList = [list]
      SemiColon = [semi]
      this.MANY(() => {
        list = this.SUBRULE2(this.customExpressionList)
        expressionList.push(list)
        SemiColon = [semi]
        this.OPTION2(() => {
          semi = this.CONSUME2(this.T.SemiColon)
          SemiColon.push(semi)
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
    } else if (list) {
      return list
    }
  })

  customExpressionList = this.RULE<CstNode | undefined>('customExpressionList', () => {
    let expressions: CstNode[]
    let expr: CstNode
    let Comma: IToken[]

    this.OPTION(() => {
      expr = this.SUBRULE(this.customExpression)
      if (expr) {
        expressions = [ expr ]
      } else {
        expressions = []
      }
      Comma = []
      this.MANY(()=> {
        let comma = this.CONSUME(this.T.Comma)
        Comma.push(comma)
        expr = this.SUBRULE2(this.customExpression)
        expressions.push(expr)
      })
    })

    if (expr) {
      return {
        name: 'expressionList',
        children: {
          ...(Comma && Comma.length > 0 ? { Comma } : {}),
          ...(expressions ? { expression: expressions } : {})
        }
      }
    }
  })

  /**
   *  An expression contains values and spaces
   */
  expression = this.RULE<CstNode | undefined>('expression', () => {
    let values: CstElement[] = []
    let val: CstElement

    this.MANY(() => {
      val = this.SUBRULE(this.value)
      values.push(val)
    })

    if (val) {
      return {
        name: 'expression',
        children: { values }
      }
    }
  })

  /**
   * Immediately following a comma and optional whitespace
   * This allows a curly block of rules to be a single value in an expression
   */
  subExpression = this.RULE<CstNode | undefined>('subExpression', () => {
    let values: CstElement[] = []
    let val: CstElement

    this.OPTION(() => {
      val = this.CONSUME(this.T.WS)
      values.push(val)
    })

    this.OPTION2(() => {
      val = this.SUBRULE(this.curlyBlock)
      values.push(val)
    })
  
    this.MANY(() => {
      val = this.SUBRULE(this.value)
      values.push(val)
    })
    if (val) {
      return {
        name: 'expression',
        children: { values }
      }
    }
  })

  /**
   * This will detect a declaration-like expression within an expression,
   * but note that the declaration is essentially a duplicate of the entire expression. 
   */
  customExpression = this.RULE<CstNode | undefined>('customExpression', () => {
    let exprValues: CstElement[] = []
    let propertyValues: CstElement[] = []
    let values: CstElement[] = []

    let val: CstElement
    let ws: IToken
    let pre: IToken
    let colon: IToken

    /** Similar to componentValues, except a propertyvalue is not required */
    pre = this.WS()
    pre && values.push(pre)

    this.MANY(() => {
      val = this.SUBRULE(this.propertyValue)
      propertyValues.push(val)
      values.push(val)
    })
    ws = this.WS(1)
    ws && values.push(ws)

    this.OPTION2(() => {
      colon = this.CONSUME(this.T.Assign)
      values.push(colon)
    })
  
    this.MANY2(() => {
      const value = this.OR([
        { ALT: () => this.SUBRULE(this.value) },
        { ALT: () => this.SUBRULE(this.curlyBlock) }
      ])
      exprValues.push(value)
      values.push(value)
    })

    let decl: CstNode
    if (colon && propertyValues && propertyValues.length > 0) {
      decl = {
        name: 'declaration',
        children: {
          ...(pre ? { pre: [pre] } : {}),
          property: propertyValues,
          ...(ws ? { ws: [ws] } : {}),
          Colon: [colon],
          value: [{
            name: 'expression',
            children: {
              values: exprValues
            }
          }]
        }
      }
    }

    if (values && values.length > 0) {
      return {
        name: 'expression',
        children: {
          values,
          ...(decl ? { declaration: [decl] } : {})
        }
      }
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

    children = { L: [L], blockBody: [blockBody] }

    /** @todo - Add a parsing error if this is missing */
    this.OPTION(() => {
      const R = this.CONSUME(this.T.RCurly)
      children.R = [R]
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
          /** @todo - Add a parsing error if this is missing */
          this.OPTION(() => R = this.CONSUME(this.T.RParen))
        }
      },
      {
        ALT: () => {
          L = this.CONSUME(this.T.LSquare)
          blockBody = this.SUBRULE2(this.expressionListGroup)
          /** @todo - Add a parsing error if this is missing */
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
