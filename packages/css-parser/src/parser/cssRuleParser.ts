import {
  TokenType,
  EmbeddedActionsParser,
  IParserConfig,
  IToken
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

  _ = this.RULE<IToken | undefined>('_', () => {
    let token
    this.OPTION(() => token = this.CONSUME(this.T.WS))
    return token
  })

  preExpression = this.RULE<CstElement[] | CstNode>('preExpression', () => {
    let val: CstElement
    let pre: CstElement
    let ws: IToken
    let colon: IToken
    let propertyValues: CstElement[]
    let allValues: CstElement[]

    this.ACTION(() => {
      propertyValues = []
      allValues = []
    })

    /** Grab initial colon, in case this is a selector list */
    this.OPTION(() => {
      pre = this.CONSUME(this.T.Colon)
      this.ACTION(() => {
        propertyValues.push(pre)
        allValues.push(pre)
      })
    })

    this.MANY(() => {
      val = this.SUBRULE(this.propertyValue)
      this.ACTION(() => {
        propertyValues.push(val)
        allValues.push(val)
      })
    })
    ws = this.SUBRULE(this._)
    this.ACTION(() => {
      allValues.push(ws)
    })
    this.OPTION2(() => {
      colon = this.CONSUME2(this.T.Colon)
      this.ACTION(() => {
        allValues.push(colon)
      })
    })
    if (pre && colon) {
      return {
        name: 'declaration',
        children: {
          property: propertyValues,
          ...(ws ? { ws: [ws] } : {}),
          Colon: [colon],
          allValues
        }
      }
    }
    return allValues
  })

  property = this.OVERRIDE_RULE('property', () => {
    this.CONSUME(this.T.Ident)
  })

  expression = this.OVERRIDE_RULE('expression', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.valueExpression))
  })

  valueExpression = this.RULE('valueExpression', () => {
    this.SUBRULE(this._)
    this.SUBRULE(this.addition)
  })

  addition = this.RULE('addition', () => {
    // using labels can make the CST processing easier
    this.SUBRULE(this.multiplication, { LABEL: "lhs" })
    this.MANY(() => {
      // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
      this.CONSUME(this.T.AdditionOperator)
      this.SUBRULE2(this._)
      //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
      this.SUBRULE2(this.multiplication, { LABEL: "rhs" })
    })
    this.SUBRULE3(this._)
  })

  multiplication = this.RULE('multiplication', () => {
    this.SUBRULE(this.compare, { LABEL: "lhs" })
    this.MANY(() => {
      this.CONSUME(this.T.MultiplicationOperator)
      this.SUBRULE(this._)
      this.SUBRULE2(this.compare, { LABEL: "rhs" })
    })
    this.SUBRULE2(this._)
  })

  compare = this.RULE('compare', () => {
    // using labels can make the CST processing easier
    this.SUBRULE(this.value, { LABEL: "lhs" })
    this.MANY(() => {
      this.CONSUME(this.T.CompareOperator)
      this.SUBRULE(this._)
      this.SUBRULE2(this.value, { LABEL: "rhs" })
    })
    this.SUBRULE2(this._)
  })     

  value = this.OVERRIDE_RULE('value', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.block) },
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

  compoundSelectorList = this.RULE('compoundSelectorList', () => {
    this.SUBRULE(this.compoundSelector)
    this.MANY(() => {
      this.SUBRULE(this._)
      this.CONSUME(this.T.Comma)
      this.SUBRULE2(this._)
      this.SUBRULE2(this.compoundSelector)
    })
  })

  /**
   * e.g. div.foo[bar] + p
   */
  compoundSelector = this.RULE('compoundSelector', () => {
    this.SUBRULE(this.selector)
    this.MANY(() => {
      this.OPTION(() => this.CONSUME(this.T.WS, { LABEL: 'ws' }))
      this.OPTION2(() => {
        this.SUBRULE(this.selectorCombinator)
        this.SUBRULE(this._)
      })
      this.SUBRULE(this.compoundSelector)
    })
    this.SUBRULE2(this._)
  })

  selector = this.RULE('selector', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.selectorElement)
          this.MANY(() => {
            this.SUBRULE(this.selectorSuffix)
          })
        }
      },
      {
        ALT: () => {
          this.AT_LEAST_ONE(() => {
            this.SUBRULE2(this.selectorSuffix)
          })
        }
      }
    ])
  })

  // IDENT | '*'
  selectorElement = this.RULE('selectorElement', () => {
    this.OR([
      { ALT: () => this.CONSUME(this.T.Ident) },
      { ALT: () => this.CONSUME(this.T.Star) },
      { ALT: () => this.CONSUME(this.T.DimensionInt) }
    ])
  })

    // helper grammar rule to avoid repetition
  // [ HASH | class | attrib | pseudo ]+
  selectorSuffix = this.RULE('selectorSuffix', () => {
    this.OR([
      { ALT: () => this.CONSUME(this.T.ClassOrId) },
      { ALT: () => this.SUBRULE(this.selectorAttribute) },
      { ALT: () => this.SUBRULE(this.pseudoSelector) }
    ])
  })

  selectorCombinator = this.RULE('selectorCombinator', () => {
    this.OR([
      { ALT: () => this.CONSUME(this.T.Plus) },
      { ALT: () => this.CONSUME(this.T.Gt) },
      { ALT: () => this.CONSUME(this.T.Tilde) },
      { ALT: () => this.CONSUME(this.T.Pipe) }
    ])
  })

  selectorAttribute = this.RULE('selectorAttribute', () => {
    this.CONSUME(this.T.LSquare)
    this.CONSUME(this.T.Ident)

    this.OPTION(() => {
      this.CONSUME(this.T.AttrMatchOperator)
      this.OR([
        { ALT: () => this.CONSUME2(this.T.Ident) },
        { ALT: () => this.CONSUME(this.T.StringLiteral) }
      ])
    })
    this.OPTION2(() => {
      this.CONSUME(this.T.AttrFlag)
    });
    this.CONSUME(this.T.RSquare)
  })

  // ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
  pseudoSelector = this.RULE('pseudoSelector', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.pseudoFunction) },
      { ALT: () => {
        this.CONSUME(this.T.Colon, { LABEL: 'colon1' })
        this.OPTION(() => this.CONSUME2(this.T.Colon, { LABEL: 'colon2' }))
        this.CONSUME(this.T.Ident)
      }}
    ])
  })

  pseudoFunction = this.RULE('pseudoFunction', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(this.T.PseudoNotNthFunc)
          this.SUBRULE(this._)
          this.SUBRULE(this.compoundSelectorList)
          this.SUBRULE2(this._)
          this.CONSUME(this.T.RParen)
        }
      },
      {
        /**
         * :nth* pseudo-function
         * @reference https://www.w3.org/TR/css-syntax-3/#anb-microsyntax
         */
        ALT: () => {
          this.CONSUME(this.T.PseudoNthFunc)
          this.SUBRULE3(this._)
          this.OR2([
            { ALT: () => this.CONSUME(this.T.NthIdent) },
            {
              ALT: () => {
                /**
                 * @todo implement a GATE to check for 'n'
                 */
                this.CONSUME(this.T.DimensionInt)
                this.SUBRULE4(this._)
                this.OPTION(() => {
                  this.OR3([
                    {
                      ALT: () => {
                        this.OR4([
                          { ALT: () => this.CONSUME(this.T.Plus) },
                          { ALT: () => this.CONSUME(this.T.Minus) }
                        ])
                        this.CONSUME(this.T.WS)
                        this.CONSUME(this.T.UnsignedInt)
                      }
                    },
                    {
                      /**
                       * A signed int is a single token, so this allows
                       * 'n+1', which is [<Ident: 'n'>, <SignedInt: '+1'>]
                      */
                      ALT: () => this.CONSUME(this.T.SignedInt)
                    }
                  ])
                })
              }
            }
          ])
          this.SUBRULE5(this._)
          this.OPTION2(() => {
            this.CONSUME(this.T.Of)
            this.SUBRULE6(this._)
            this.SUBRULE2(this.compoundSelectorList)
            this.SUBRULE7(this._)
          })
          this.CONSUME2(this.T.RParen)
        }
      }
    ])
  })
}