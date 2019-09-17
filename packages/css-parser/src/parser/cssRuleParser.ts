import {
  TokenType,
  IParserConfig,
  IToken,
  EmbeddedActionsParser,
  CstNode,
  CstElement
} from 'chevrotain'
import { TokenMap } from '../util'

/**
 * This class further parses general rules into known rules
 */
export class CssRuleParser extends EmbeddedActionsParser {
  T: TokenMap

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = { maxLookahead: 1 }
  ) {
    super(tokens, config)
    this.T = T
    if (this.constructor === CssRuleParser) {
      this.performSelfAnalysis()
    }
  }

  WS(idx:number = 0) {
    // +10 to avoid conflicts with other OPTION in the calling rule.
    return this.option(idx+10, () => {
      const  wsToken = this.consume(idx, this.T.WS)
      return wsToken
    })
  }

  /** A property is a collection of tokens in case we need to process segments */
  property = this.RULE<IToken[]>('property', () => {
    return [ this.CONSUME(this.T.PropertyName) ]
  })

  expression = this.RULE('expression', () => {
    let values: CstElement[] = []
    this.AT_LEAST_ONE(() => {
      const tmpValues = this.SUBRULE(this.valueExpression)
      this.ACTION(() => {
        values = values.concat(tmpValues)
      })
    })
    return {
      name: 'expression',
      children: { values }
    }
  })

  valueExpression = this.RULE<CstElement[]>('valueExpression', () => {
    let values: CstElement[] = []
    let val: CstElement
    val = this.WS()
    this.ACTION(() => val && values.push(val))

    this.OPTION(() => {
      val = this.SUBRULE(this.addition)
      this.ACTION(() => val && values.push(val))
    })
    
    return values
  })

  addition = this.RULE<CstNode>('addition', () => {
    let rhs: CstElement[]
    this.ACTION(() => rhs = [])
    let val: CstElement
    let op: IToken
    let ws: IToken
    const lhs = this.SUBRULE(this.multiplication)
    this.MANY(() => {
      op = this.CONSUME(this.T.AdditionOperator)
      ws = this.WS()
      val = this.SUBRULE2(this.multiplication)
      this.ACTION(() => {
        rhs.push({
          name: 'rhs',
          children: {
            op: [op],
            ...(ws ? { ws: [ws] }: {}),
            expression: [val]
          }
        })
      })
    })
    const post = this.WS(1)
    if (rhs && rhs.length > 0) {
      return {
        name: 'addition',
        children: {
          lhs: [lhs],
          rhs,
          ...(post ? { post: [post] }: {})
        }
      }
    } else {
      return lhs
    }
  })

  multiplication = this.RULE<CstNode>('multiplication', () => {
    let rhs: CstElement[]
    this.ACTION(() => rhs = [])
    let val: CstElement
    let op: IToken
    let ws: IToken
    const lhs = this.SUBRULE(this.compare)
    this.MANY(() => {
      op = this.CONSUME(this.T.MultiplicationOperator)
      ws = this.WS()
      val = this.SUBRULE2(this.compare)
      this.ACTION(() => {
        rhs.push({
          name: 'rhs',
          children: {
            op: [op],
            ...(ws ? { ws: [ws] }: {}),
            expression: [val]
          }
        })
      })
    })
    const post = this.WS(1)
    if (rhs && rhs.length > 0) {
      return {
        name: 'multiplication',
        children: {
          lhs: [lhs],
          rhs,
          ...(post ? { post: [post] }: {})
        }
      }
    } else {
      return lhs
    }
  })

  compare = this.RULE('compare', () => {
    let rhs: CstElement[]
    this.ACTION(() => rhs = [])
    let val: CstElement
    let op: IToken
    let ws: IToken
    const lhs = this.SUBRULE(this.value)
    this.MANY(() => {
      op = this.CONSUME(this.T.CompareOperator)
      ws = this.WS()
      val = this.SUBRULE2(this.value)
      this.ACTION(() => {
        rhs.push({
          name: 'rhs',
          children: {
            op: [op],
            ...(ws ? { ws: [ws] }: {}),
            expression: [val]
          }
        })
      })
    })
    const post = this.WS(2)
    if (rhs && rhs.length > 0) {
      return {
        name: 'compare',
        children: {
          lhs: [lhs],
          rhs,
          ...(post ? { post: [post] }: {})
        }
      }
    } else {
      return lhs
    }
  })

  value = this.RULE('value', () => {
    return this.OR([
      // { ALT: () => this.SUBRULE(this.block) },
      { ALT: () => this.CONSUME(this.T.Unit) },
      { ALT: () => this.CONSUME(this.T.Ident) },
      { ALT: () => this.CONSUME(this.T.StringLiteral) },
      { ALT: () => this.CONSUME(this.T.Uri) },
      { ALT: () => this.CONSUME(this.T.Color) },
      { ALT: () => this.CONSUME(this.T.UnicodeRange) }
    ])
  })

  // value = this.OVERRIDE_RULE('value', () => {
  //   this.OR([
  //     { ALT: () => this.SUBRULE(this.block) },
  //     { ALT: () => this.CONSUME(this.T.Unit) },
  //     { ALT: () => this.CONSUME(this.T.Ident) },
  //     { ALT: () => this.CONSUME(this.T.StringLiteral) },
  //     { ALT: () => this.CONSUME(this.T.Uri) },
  //     { ALT: () => this.CONSUME(this.T.Color) },
  //     { ALT: () => this.CONSUME(this.T.UnicodeRange) },
  //     { ALT: () => this.CONSUME(this.T.WS) }
  //   ])
  // })

  // compoundSelectorList = this.RULE('compoundSelectorList', () => {
  //   this.SUBRULE(this.compoundSelector)
  //   this.MANY(() => {
  //     this.WS()
  //     this.CONSUME(this.T.Comma)
  //     this.SUBRULE2(this._)
  //     this.SUBRULE2(this.compoundSelector)
  //   })
  // })

  // /**
  //  * e.g. div.foo[bar] + p
  //  */
  // compoundSelector = this.RULE('compoundSelector', () => {
  //   this.SUBRULE(this.selector)
  //   this.MANY(() => {
  //     this.OPTION(() => this.CONSUME(this.T.WS, { LABEL: 'ws' }))
  //     this.OPTION2(() => {
  //       this.SUBRULE(this.selectorCombinator)
  //       this.WS()
  //     })
  //     this.SUBRULE(this.compoundSelector)
  //   })
  //   this.SUBRULE2(this._)
  // })

  // selector = this.RULE('selector', () => {
  //   this.OR([
  //     {
  //       ALT: () => {
  //         this.SUBRULE(this.selectorElement)
  //         this.MANY(() => {
  //           this.SUBRULE(this.selectorSuffix)
  //         })
  //       }
  //     },
  //     {
  //       ALT: () => {
  //         this.AT_LEAST_ONE(() => {
  //           this.SUBRULE2(this.selectorSuffix)
  //         })
  //       }
  //     }
  //   ])
  // })

  // // IDENT | '*'
  // selectorElement = this.RULE('selectorElement', () => {
  //   this.OR([
  //     { ALT: () => this.CONSUME(this.T.Ident) },
  //     { ALT: () => this.CONSUME(this.T.Star) },
  //     { ALT: () => this.CONSUME(this.T.DimensionInt) }
  //   ])
  // })

  //   // helper grammar rule to avoid repetition
  // // [ HASH | class | attrib | pseudo ]+
  // selectorSuffix = this.RULE('selectorSuffix', () => {
  //   this.OR([
  //     { ALT: () => this.CONSUME(this.T.ClassOrId) },
  //     { ALT: () => this.SUBRULE(this.selectorAttribute) },
  //     { ALT: () => this.SUBRULE(this.pseudoSelector) }
  //   ])
  // })

  // selectorCombinator = this.RULE('selectorCombinator', () => {
  //   this.OR([
  //     { ALT: () => this.CONSUME(this.T.Plus) },
  //     { ALT: () => this.CONSUME(this.T.Gt) },
  //     { ALT: () => this.CONSUME(this.T.Tilde) },
  //     { ALT: () => this.CONSUME(this.T.Pipe) }
  //   ])
  // })

  // selectorAttribute = this.RULE('selectorAttribute', () => {
  //   this.CONSUME(this.T.LSquare)
  //   this.CONSUME(this.T.Ident)

  //   this.OPTION(() => {
  //     this.CONSUME(this.T.AttrMatchOperator)
  //     this.OR([
  //       { ALT: () => this.CONSUME2(this.T.Ident) },
  //       { ALT: () => this.CONSUME(this.T.StringLiteral) }
  //     ])
  //   })
  //   this.OPTION2(() => {
  //     this.CONSUME(this.T.AttrFlag)
  //   });
  //   this.CONSUME(this.T.RSquare)
  // })

  // // ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
  // pseudoSelector = this.RULE('pseudoSelector', () => {
  //   this.OR([
  //     { ALT: () => this.SUBRULE(this.pseudoFunction) },
  //     { ALT: () => {
  //       this.CONSUME(this.T.Colon, { LABEL: 'colon1' })
  //       this.OPTION(() => this.CONSUME2(this.T.Colon, { LABEL: 'colon2' }))
  //       this.CONSUME(this.T.Ident)
  //     }}
  //   ])
  // })

  // pseudoFunction = this.RULE('pseudoFunction', () => {
  //   this.OR([
  //     {
  //       ALT: () => {
  //         this.CONSUME(this.T.PseudoNotNthFunc)
  //         this.WS()
  //         this.SUBRULE(this.compoundSelectorList)
  //         this.SUBRULE2(this._)
  //         this.CONSUME(this.T.RParen)
  //       }
  //     },
  //     {
  //       /**
  //        * :nth* pseudo-function
  //        * @reference https://www.w3.org/TR/css-syntax-3/#anb-microsyntax
  //        */
  //       ALT: () => {
  //         this.CONSUME(this.T.PseudoNthFunc)
  //         this.SUBRULE3(this._)
  //         this.OR2([
  //           { ALT: () => this.CONSUME(this.T.NthIdent) },
  //           {
  //             ALT: () => {
  //               /**
  //                * @todo implement a GATE to check for 'n'
  //                */
  //               this.CONSUME(this.T.DimensionInt)
  //               this.SUBRULE4(this._)
  //               this.OPTION(() => {
  //                 this.OR3([
  //                   {
  //                     ALT: () => {
  //                       this.OR4([
  //                         { ALT: () => this.CONSUME(this.T.Plus) },
  //                         { ALT: () => this.CONSUME(this.T.Minus) }
  //                       ])
  //                       this.CONSUME(this.T.WS)
  //                       this.CONSUME(this.T.UnsignedInt)
  //                     }
  //                   },
  //                   {
  //                     /**
  //                      * A signed int is a single token, so this allows
  //                      * 'n+1', which is [<Ident: 'n'>, <SignedInt: '+1'>]
  //                     */
  //                     ALT: () => this.CONSUME(this.T.SignedInt)
  //                   }
  //                 ])
  //               })
  //             }
  //           }
  //         ])
  //         this.SUBRULE5(this._)
  //         this.OPTION2(() => {
  //           this.CONSUME(this.T.Of)
  //           this.SUBRULE6(this._)
  //           this.SUBRULE2(this.compoundSelectorList)
  //           this.SUBRULE7(this._)
  //         })
  //         this.CONSUME2(this.T.RParen)
  //       }
  //     }
  //   ])
  // })
}