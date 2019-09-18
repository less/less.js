
import { CstParser, EMPTY_ALT, EOF, TokenType } from 'chevrotain'
import { Tokens, Fragments } from './lessTokens'
// @ts-ignore
import { createLexer } from './util'

const { lexer, tokens, T } = createLexer(Fragments, Tokens)

class LessParser extends CstParser {
  constructor() {
    super(tokens, {
      maxLookahead: 3
    })
    this.performSelfAnalysis()
  }

  inSelector: boolean
  inCompareBlock: boolean
  inPseudo: boolean
  inAtRule: boolean
  inGuard: boolean

  // https://sap.github.io/chevrotain/documentation/6_1_0/classes/baseparser.html#reset
  reset() {
    super.reset()
    this.inSelector = false
    this.inCompareBlock = false
    this.inPseudo = false
    this.inAtRule = false
    this.inGuard = false
  }

  // Optional whitespace
  _ = this.RULE('_', () => {
    this.OPTION(() => this.CONSUME(T.WS))
  })

  /** Gobble semis if present */
  semi = this.RULE('semi', () => {
    this.OPTION(() => this.CONSUME(T.SemiColon))
  })

  // Mandatory whitespace
  // __ = this.RULE('__', () => {
  //   this.CONSUME(T.WS)
  // })

   /** Searches outer space (not within matching blocks) for tokens */
   _searchUntil = (tokens: TokenType[]): TokenType => {
    let done = false
    let foundToken: TokenType
    const blockStack = []
    let i = 0

    while (!done) {
      i++;
      const blockLength = blockStack.length
      const nextToken = this.LA(i)
      const tokenType = nextToken.tokenType

      if (blockLength === 0 && tokens.indexOf(tokenType) !== -1) {
        done = true;
        foundToken = tokenType;
        break;
      } else {
        switch (tokenType) {
          case T.LParen:
          case T.LCurly:
          case T.LSquare:
            blockStack.unshift(T.RSquare)
            break;
          case T.RParen:
          case T.RCurly:
          case T.RParen:
            if (blockStack[0] === tokenType) {
              blockStack.shift();
            }
            break;
          case EOF:
            done = true;
            break;
        }
      }
    }
    return foundToken;
  }

  /** simplify later, verbose for debugging */
  _declarationGuard() {
    const foundToken = this._searchUntil([T.LCurly, T.RCurly, T.SemiColon]);
    const pass = this.inSelector && (foundToken !== T.LCurly)
    return pass;
  }

  primary = this.RULE('primary', () => {
    this.MANY(() => {
      this.SUBRULE(this._)
      this.OR([
        { ALT: () => this.SUBRULE(this.atrule) },
        { ALT: () => this.SUBRULE(this.variableAssign) },
        { ALT: () => {
          this.SUBRULE(this.functionCall)
          this.SUBRULE(this.semi)
        }},
        
        { 
          GATE: this._declarationGuard.bind(this), 
          ALT: () => {
            this.SUBRULE(this.declaration)
          }
        },
        // this combines mixincall, mixinDefinition and rule set
        // because of common prefix
        { ALT: () => this.SUBRULE(this.rulesetOrMixin) },
        // { ALT: () => this.SUBRULE(this.entitiesCall) },
      ])
      this.SUBRULE2(this._)
    })
  })

  // The original extend had two variants "extend" and "extendRule"
  // implemented in the same function, we will have two separate functions
  // for readability and clarity.
  extendRule = this.RULE('extendRule', () => {
    this.CONSUME(T.Extend)
    this.SUBRULE(this._)
    this.MANY_SEP({
      SEP: T.Comma,
      DEF: () => {
        // TODO: a GATE is needed here because the following All
        this.SUBRULE(this.selector)

        // TODO: this probably has to be post processed
        // because "ALL" may be a normal ending part of a selector
        // this.OPTION(() => {
        //     this.CONSUME(T.All)
        // })
      }
    })
    this.SUBRULE2(this._)
    this.CONSUME(T.RParen)
  })

  declaration = this.RULE('declaration', (inBlock: boolean = false) => {
    this.OR([
      { ALT: () => this.CONSUME(T.Ident) },
      { ALT: () => this.CONSUME(T.InterpolatedIdent) }
    ])
    this.SUBRULE(this._)
    this.OR2([
      { ALT: () => this.CONSUME(T.Colon) },
      { 
        GATE: () => !inBlock,
        ALT: () => this.CONSUME(T.PlusAssign)
      },
      {
        GATE: () => !inBlock,
        ALT: () => this.CONSUME(T.UnderscoreAssign)
      }
    ])
    this.SUBRULE2(this._)
    this.SUBRULE(this.expressionList)
    this.SUBRULE3(this._)
    this.OPTION({
      GATE: () => !inBlock,
      DEF: () => this.SUBRULE(this.semi)
    })
  })


  // Technically this is all selectors after an initial selector match
  // e.g.  ", div.class, p"
  selectorList = this.RULE('selectorList', (canExtend: boolean = false) => {
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this._)
      this.CONSUME(T.Comma)
      this.SUBRULE2(this._)
      this.SUBRULE2(this.selector)
      this.OPTION({
        GATE: () => canExtend,
        DEF: () => this.SUBRULE(this.extendRule)
      })
    })
  })

  rulesetOrMixin = this.RULE('rulesetOrMixin', () => {
    this.SUBRULE(this.selector)
    this.OPTION(() => this.SUBRULE(this.extendRule))
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.selectorList, { ARGS: [true] })
        }
      },
      {
        ALT: () => {
          this.OPTION2(() => {
            this.SUBRULE(this._)
            this.SUBRULE(this.mixinArgs)
          })
          this.OPTION3(() => {
            this.SUBRULE2(this._)
            this.SUBRULE(this.guard)
          })
          this.OPTION4(() => {
            this.SUBRULE3(this._)
            this.CONSUME(T.Important)
          })
        }
      }
    ])
    
    this.SUBRULE4(this._)
    this.OR2([
      {
        ALT: () => {
          this.SUBRULE(this.curlyBlock)
        }
      },
      {
        ALT: () => {
          this.OPTION5(() => this.CONSUME(T.SemiColon))
        }
      }
    ])
  })

  variableAssign = this.RULE('variableAssign', () => {
    this.CONSUME(T.AtKeyword)
    this.SUBRULE(this._)
    this.CONSUME(T.Colon)
    this.SUBRULE2(this._)
    this.SUBRULE(this.expressionList)
    this.SUBRULE3(this._)
    this.SUBRULE(this.semi)
  })

  // Used for mixin / function args
  // Can have a semi-colon separator
  args = this.RULE('args', (inMixin: true) => {
    this.OR([
      {
        GATE: () => this._searchUntil([T.RParen, T.SemiColon]) === T.SemiColon,
        ALT: () => {
          this.SUBRULE(this.semiColonList, { ARGS: [inMixin] })
          this.OPTION(() => {
            this.SUBRULE(this._)
            this.CONSUME(T.SemiColon)
          })
        }
      },
      {
        ALT: () => this.SUBRULE(this.expressionList, { ARGS: [inMixin] })
      }
    ])
  })

  semiArg = this.RULE('semiArg', (inMixin: boolean = false) => {
    this.OR([
      {
        GATE: () => inMixin,
        ALT: () => {
          this.CONSUME(T.AtKeyword)
          this.SUBRULE(this._)
          this.CONSUME(T.Colon)
          this.SUBRULE2(this._)
          this.SUBRULE(this.expressionList)
        }
      },
      {
        ALT: () => this.SUBRULE2(this.expressionList)
      }
    ])
  })

  commaArg = this.RULE('commaArg', (inMixin: boolean = false) => {
    this.OR([
      {
        GATE: () => inMixin,
        ALT: () => {
          this.CONSUME(T.AtKeyword)
          this.SUBRULE(this._)
          this.CONSUME(T.Colon)
          this.SUBRULE2(this._)
          this.SUBRULE(this.expression)
        }
      },
      {
        ALT: () => this.SUBRULE2(this.expression)
      }
    ])
  })

  semiColonList = this.RULE('semiColonList', (inMixin: boolean = false) => {
    this.SUBRULE(this.semiArg, { ARGS: [inMixin] })
    this.MANY(() => {
      this.SUBRULE(this._)
      this.CONSUME(T.SemiColon)
      this.SUBRULE2(this._)
      this.SUBRULE2(this.semiArg, { ARGS: [inMixin] })
    })
  })

  /** These should be optional wherever they appear */
  expressionList = this.RULE('expressionList', (inMixin: boolean = false) => {
    this.OPTION(() => {
      this.SUBRULE(this.commaArg, { ARGS: [inMixin] })
      this.MANY(() => {
        this.SUBRULE(this._)
        this.CONSUME(T.Comma)
        this.SUBRULE2(this._)
        this.SUBRULE2(this.commaArg, { ARGS: [inMixin] })
      })
    })
  })

  expression = this.RULE('expression', () => {
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this.additionExpression)
    })
    // this.SUBRULE3(this._)
  })

  additionExpression = this.RULE('additionExpression', () => {
    // using labels can make the CST processing easier
    this.SUBRULE(this.multiplicationExpression, { LABEL: "lhs" })
    this.MANY(() => {
      // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
      this.CONSUME(T.AdditionOperator)
      this.SUBRULE2(this._)
      //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
      this.SUBRULE2(this.multiplicationExpression, { LABEL: "rhs" })
    })
    this.SUBRULE3(this._)
  })

  multiplicationExpression = this.RULE("multiplicationExpression", () => {
    this.SUBRULE(this.compareExpression, { LABEL: "lhs" })
    this.MANY(() => {
      this.CONSUME(T.MultiplicationOperator)
      this.SUBRULE(this._)
      //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
      this.SUBRULE2(this.compareExpression, { LABEL: "rhs" })
      // this.SUBRULE2(this._)
    })
    this.SUBRULE2(this._)
  })

  compareExpression = this.RULE('compareExpression', () => {
    // using labels can make the CST processing easier
    this.SUBRULE(this.atomicExpression, { LABEL: "lhs" })
    this.MANY({
      GATE: () => this.inCompareBlock,
      DEF: () => {
        // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
        this.SUBRULE(this._)
        this.CONSUME(T.CompareOperator)
        this.SUBRULE2(this._)
        //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
        this.SUBRULE2(this.atomicExpression, { LABEL: "rhs" })
      }
    })
    this.SUBRULE3(this._)
  })     

  atomicExpression = this.RULE('atomicExpression', () => {
    this.OR([
        { ALT: () => this.SUBRULE(this.parenBlock) },
        { ALT: () => this.SUBRULE(this.functionCall) },
        { ALT: () => this.CONSUME(T.VarOrProp) },
        { ALT: () => this.CONSUME(T.Unit) },
        { ALT: () => this.CONSUME(T.Ident) },
        { ALT: () => this.CONSUME(T.StringLiteral) },
        { ALT: () => this.CONSUME(T.Uri) },
        { ALT: () => this.CONSUME(T.Color) },
        { ALT: () => this.CONSUME(T.UnicodeRange) },
        {
          ALT: () => {
            this.CONSUME(T.LSquare)
            this.SUBRULE(this.atomicExpression)
            this.CONSUME(T.RSquare)
          }
        }
    ])
  })

  parenBlock = this.RULE('parenBlock', () => {
    this.CONSUME(T.LParen)
    this.SUBRULE(this._)
    this.OR([
      {
        GATE: () => {
          if (!this.inAtRule) {
            return false
          }
          return this._searchUntil([T.Colon, T.RParen]) === T.Colon
        },
        ALT: () => this.SUBRULE(this.declaration)
      },
      { ALT: () => this.SUBRULE(this.additionExpression) }
    ])
    this.SUBRULE2(this._)
    this.CONSUME(T.RParen);
  })

  functionCall = this.RULE('functionCall', () => {
    this.CONSUME(T.Function);
    this.SUBRULE(this._)
    this.SUBRULE(this.args);
    this.SUBRULE2(this._)
    this.CONSUME(T.RParen);
  })

  variableCall = this.RULE('variableCall', () => {
    // this.OR([
    //     { ALT: () => this.CONSUME(T.VariableCall) },
    //     { ALT: () => this.CONSUME(T.VariableName) }
    // ])

    this.OPTION(() => {
      this.SUBRULE(this.mixinRuleLookup)
    })
    this.SUBRULE(this._)

    this.OPTION2(() => {
      this.CONSUME(T.Important)
    })
  })

  entitiesCall = this.RULE('entitiesCall', () => {
      // TODO: TBD
  })

  atrule = this.RULE('atrule', () => {
    this.inAtRule = true
    this.OR([
      { ALT: () => this.SUBRULE(this.importAtRule) },
      { ALT: () => this.SUBRULE(this.pluginAtRule) },
      { ALT: () => this.SUBRULE(this.mediaAtRule) },
      { ALT: () => this.SUBRULE(this.generalAtRule) }
    ])
    this.inAtRule = false
  })

  generalAtRule = this.RULE('generalAtRule', () => {
    this.CONSUME(T.AtKeyword)
    this.SUBRULE(this._)
    this.OPTION(() => {
      this.SUBRULE(this.expression)
      this.SUBRULE2(this._)
    })
    this.OR([
        { ALT: () => this.CONSUME(T.SemiColon) },
        { ALT: () => this.SUBRULE(this.curlyBlock) }
    ]);
  })

  importAtRule = this.RULE('importAtRule', () => {
    this.CONSUME(T.AtImport)
    this.SUBRULE(this._)
    this.OPTION(() => {
      this.CONSUME(T.LParen)
      this.SUBRULE2(this._)
      this.CONSUME(T.Ident)
      this.MANY(() => {
        this.SUBRULE3(this._)
        this.CONSUME(T.Comma),
        this.SUBRULE4(this._)
        this.CONSUME2(T.Ident)
      })
      this.SUBRULE5(this._)
      this.CONSUME(T.RParen)
    })

    this.SUBRULE6(this._)
    this.OR([
      { ALT: () => this.CONSUME(T.StringLiteral) },
      { ALT: () => this.CONSUME(T.Uri) }
    ])
    this.SUBRULE7(this._)

    this.OPTION2(() => {
      this.SUBRULE(this.mediaQueryList)
    })
    this.SUBRULE8(this._)

    this.CONSUME(T.SemiColon)
  })

  pluginAtRule = this.RULE('pluginAtRule', () => {
    this.CONSUME(T.AtPlugin)
    this.OPTION(() => {
      this.SUBRULE(this.pluginArgs)
    })

    this.OR([
      { ALT: () => this.CONSUME(T.StringLiteral) },
      // TODO: is the LESS URI different?
      { ALT: () => this.CONSUME(T.Uri) }
    ])
  })

  pluginArgs = this.RULE('pluginArgs', () => {
    this.CONSUME(T.LParen)
    // TODO: what is this? it seems like a "permissive token".
    this.CONSUME(T.RParen)
  })

  // TODO: this is css 2.1, css 3 has an expression language here
  mediaAtRule = this.RULE('mediaAtRule', () => {
    this.CONSUME(T.AtMedia)
    this.SUBRULE(this._)
    this.SUBRULE(this.mediaQueryList)
    this.SUBRULE(this.curlyBlock)
  })

  /**
   * https://www.w3.org/TR/mediaqueries-4/#mq-syntax
   */
  mediaQueryList = this.RULE('mediaQueryList', () => {
    this.MANY_SEP({
      SEP: T.Comma,
      DEF: () => this.SUBRULE(this.mediaQuery)
    })
  })

  mediaQuery = this.RULE('mediaQuery', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.mediaCondition) },
      {
        ALT: () => {
          this.OPTION(() => {
            this.OR2([
              { ALT: () => this.CONSUME(T.Not) },
              { ALT: () => this.CONSUME(T.Only) }
            ])
            this.SUBRULE(this._)
          })
          this.CONSUME(T.Ident)
          this.OPTION2(() => {
            this.SUBRULE2(this._)
            this.CONSUME(T.And)
            this.SUBRULE3(this._)
            this.SUBRULE(this.mediaConditionWithoutOr)
          })
        }
      },
    ])
  })

  mediaCondition = this.RULE('mediaCondition', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.mediaNot) },
      { ALT: () => {
          this.SUBRULE(this.mediaInParens)
          this.OR2([
            { ALT: () => this.MANY(() => this.SUBRULE(this.mediaAnd)) },
            { ALT: () => this.MANY2(() => this.SUBRULE(this.mediaOr)) }
          ])
        }
      }
    ])
  })

  mediaConditionWithoutOr = this.RULE('mediaConditionWithoutOr', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.mediaNot) },
      {
        ALT: () => {
          this.SUBRULE(this.mediaInParens)
          this.SUBRULE(this.mediaAnd)
        }
      }
    ])
  })

  mediaNot = this.RULE('mediaNot', () => {
    this.CONSUME(T.Not)
    this.SUBRULE(this._)
    this.SUBRULE(this.mediaInParens)
  })

  mediaAnd = this.RULE('mediaAnd', () => {
    this.CONSUME(T.And)
    this.SUBRULE(this._)
    this.SUBRULE(this.mediaInParens)    
  })

  mediaOr = this.RULE('mediaOr', () => {
    this.CONSUME(T.Or)
    this.SUBRULE(this._)
    this.SUBRULE(this.mediaInParens)    
  })

  mediaInParens = this.RULE('mediaInParens', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(T.LParen)
          this.SUBRULE(this.mediaCondition)
          this.CONSUME(T.RParen)
        }
      },
      { ALT: () => this.SUBRULE(this.mediaFeature) },
      { ALT: () => this.SUBRULE(this.generalEnclosed) }
    ])
  })

  /** Media feature value */
  mfValue = this.RULE('mfValue', () => {
    this.CONSUME(T.Ident)
  })

  /** Media feature plain - declaration-like value */
  mfPlain = this.RULE('mfPlain', () => {
    this.CONSUME(T.Ident)
  })

  mfBoolean = this.RULE('mfBoolean', () => {
    this.SUBRULE(this.mfName)
  })

  mfName = this.RULE('mfName', () => {
    this.CONSUME(T.Ident)
  })

  mfRange = this.RULE('mfRange', () => {
    this.SUBRULE(this.mfName)
    this.SUBRULE(this._)
    this.OPTION(() => {
      this.OR([
        {ALT: () => this.CONSUME(T.Gt) },
        {ALT: () => this.CONSUME(T.Lt) }
      ])
    })
    this.OPTION2(() => this.CONSUME(T.Eq))
    this.SUBRULE2(this._)
    this.SUBRULE(this.mfValue)
  })

  mediaFeature = this.RULE('mediaFeature', () => {
    this.CONSUME(T.LParen)
    this.SUBRULE(this._)
    this.OR([
      { ALT: () => this.SUBRULE(this.mfPlain) },
      { ALT: () => this.SUBRULE(this.mfBoolean) },
      { ALT: () => this.SUBRULE(this.mfRange) }
    ])
    this.SUBRULE2(this._)
    this.CONSUME(T.RParen)
  })

  generalEnclosed = this.RULE('generalEnclosed', () => {
    this.CONSUME(T.LParen)
    /** @todo add sub-blocks */
    this.MANY(() => this.CONSUME(T.Value))
    this.CONSUME(T.RParen)
  })

  attrib = this.RULE('attrib', () => {
      this.CONSUME(T.LSquare)
      this.CONSUME(T.Ident)

      this.OPTION(() => {
        this.CONSUME(T.AttrMatchOperator);
        this.OR([
          { ALT: () => this.CONSUME2(T.Ident) },
          { ALT: () => this.CONSUME(T.StringLiteral) }
        ])
      })
      this.OPTION2(() => {
        this.CONSUME(T.AttrFlag);
      });
      this.CONSUME(T.RSquare)
  })

  variableCurly = this.RULE('variableCurly', () => {
      // TODO: TBD
  })

  /**
   * e.g. div.foo[bar] + p
   */
  selector = this.RULE('selector', () => {
    this.SUBRULE(this.simple_selector)
    this.MANY(() => {
      let hasSpace = false
      this.OPTION(() => {
        this.CONSUME(T.WS)
        hasSpace = true
      })
      this.OR([
        {
          GATE: () => hasSpace,
          ALT: () => {
            this.SUBRULE(this.selector)
          }
        },
        {
          ALT: () => {
            this.SUBRULE(this.combinator)
            this.SUBRULE(this._)
            this.SUBRULE2(this.selector)
          }
        }
      ])
    })
    this.SUBRULE2(this._)
  })

  // TODO: 'variableCurly' can appear here?
  simple_selector = this.RULE('simple_selector', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.element_name)
          this.MANY(() => {
            this.SUBRULE(this.simple_selector_suffix)
          })
        }
      },
      {
        ALT: () => {
          this.AT_LEAST_ONE(() => {
            this.SUBRULE2(this.simple_selector_suffix)
          })
        }
      }
    ])
  })

  combinator = this.RULE('combinator', () => {
    this.OR([
      { ALT: () => this.CONSUME(T.Plus) },
      { ALT: () => this.CONSUME(T.Gt) },
      { ALT: () => this.CONSUME(T.Tilde) },
      { ALT: () => this.CONSUME(T.Pipe) }
    ])
  })

  // helper grammar rule to avoid repetition
  // [ HASH | class | attrib | pseudo ]+
  simple_selector_suffix = this.RULE('simple_selector_suffix', () => {
    this.OR([
      { ALT: () => this.CONSUME(T.ClassOrId) },
      { ALT: () => this.SUBRULE(this.attrib) },
      { ALT: () => this.SUBRULE(this.pseudo) },
      { ALT: () => this.CONSUME(T.Ampersand) }
    ])
  })

  // IDENT | '*'
  element_name = this.RULE('element_name', () => {
    this.OR([
      { ALT: () => this.CONSUME(T.Ident) },
      { ALT: () => this.CONSUME(T.Star) },
      { ALT: () => this.CONSUME(T.Unit) }
    ])
    this.OPTION({
      GATE: () => this.inPseudo,
      DEF: () => this.CONSUME2(T.Unit)
    })
  })

  pseudoFunction = this.RULE('pseudoFunction', () => {
    this.CONSUME(T.Colon)
    this.CONSUME(T.Function)
    this.inPseudo = true
    this.SUBRULE(this._)
    this.SUBRULE(this.selector)
    this.OPTION(() => this.SUBRULE(this.selectorList))
    this.SUBRULE2(this._)
    this.inPseudo = false
    this.CONSUME(T.RParen);
  });

  // ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
  pseudo = this.RULE('pseudo', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.pseudoFunction) },
      { ALT: () => {
        this.CONSUME(T.Colon)
        this.OPTION(() => this.CONSUME2(T.Colon))
        this.CONSUME(T.Ident)
      }}
      // {
      //   // GATE: () => {
      //   //   let i = 0
      //   //   let isClass = false
      //   //   let done = false
      //   //   while (!done) {
      //   //     i++;
      //   //     const nextToken = this.LA(i)
      //   //     switch (nextToken.tokenType) {
      //   //       case T.LCurly:
      //   //         isClass = true;
      //   //       case T.SemiColon:
      //   //       case T.RCurly:
      //   //       case EOF:
      //   //         done = true;
      //   //     }
      //   //   }

      //   //   return isClass
      //   // },
      //   ALT: () => this.CONSUME(T.PseudoClass)
      // }
    ]);
  })

  curlyBlock = this.RULE('curlyBlock', () => {
      this.CONSUME(T.LCurly);
      this.SUBRULE(this._)
      this.inSelector = true;
      this.SUBRULE(this.primary);
      this.SUBRULE2(this._)
      this.CONSUME(T.RCurly)
      this.inSelector = false;
  })

  mixinRuleLookup = this.RULE('mixinRuleLookup', () => {
    this.CONSUME(T.LSquare)
    this.SUBRULE(this._)
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this.lookupValue)
    })
    this.SUBRULE2(this._)
    this.CONSUME(T.RSquare)
  })

  lookupValue = this.RULE('lookupValue', () => {
      this.OR([
          { ALT: () => this.CONSUME(T.Ident) },
          // { ALT: () => this.CONSUME(T.VariableName) },
          // { ALT: () => this.CONSUME(T.NestedVariableName) },
        //   { ALT: () => this.CONSUME(T.PropertyVariable) },
        //   { ALT: () => this.CONSUME(T.NestedPropertyVariable) },
          { ALT: () => EMPTY_ALT }
      ])
  })

  mixinArgs = this.RULE('mixinArgs', () => {
    this.CONSUME(T.LParen)
    this.SUBRULE(this._)
    this.SUBRULE(this.args, { ARGS: [true] });
    this.SUBRULE2(this._)
    this.CONSUME(T.RParen)
  })

  guard = this.RULE('guard', () => {
    this.CONSUME(T.When)
    this.SUBRULE(this._)
    this.SUBRULE(this.mediaQueryList)
  })

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

// ----------------- wrapping it all together -----------------

// reuse the same parser instance.
const parser = new LessParser()

const parse = (text: string) => {
  const lexResult = lexer.tokenize(text)
  // setting a new input will RESET the parser instance's state.
  parser.input = lexResult.tokens
  // any top level rule may be used as an entry point
  const value = parser.primary()

  return {
      // This is a pure grammar, the value will be undefined until we add embedded actions
      // or enable automatic CST creation.
      value: value,
      lexErrors: lexResult.errors,
      parseErrors: parser.errors
  }
};

export { LessParser, parse };
