
import { CstParser, EMPTY_ALT, EOF} from 'chevrotain'
import { lessTokens, LessLexer, T } from './tokens'

class LessParser extends CstParser {
  constructor() {
    super(lessTokens, {
      maxLookahead: 3,
      ignoredIssues: {
        selector: { OR: true },
        args: { OR: true }
      }
    })
    this.performSelfAnalysis()
  }

  inSelector: boolean = false
  inCompareBlock: boolean = false

  primary = this.RULE('primary', () => {
    this.MANY(() => {
      this.OR([
        // { ALT: () => this.SUBRULE(this.variableCall) },
        { GATE: () => this.inSelector, ALT: () => this.SUBRULE(this.declaration) },
        { ALT: () => this.SUBRULE(this.atrule) },
        { ALT: () => this.SUBRULE(this.variableAssign) },
        // { ALT: () => this.SUBRULE(this.entitiesCall) },

        // this combines mixincall, mixinDefinition and rule set
        // because of common prefix
        { ALT: () => this.SUBRULE(this.rulesetOrMixin) }
      ])
    })
  })

  // The original extend had two variants "extend" and "extendRule"
  // implemented in the same function, we will have two separate functions
  // for readability and clarity.
  extendRule = this.RULE('extendRule', () => {
    this.CONSUME(T.Extend)
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
    this.CONSUME(T.RParen)
  })

  declaration = this.RULE('declaration', () => {
      this.OR([
        { ALT: () => this.CONSUME(T.Ident) },
        { ALT: () => this.CONSUME(T.InterpolatedIdent) }
      ])
      this.OR2([
        { ALT: () => this.CONSUME(T.Colon) },
        { ALT: () => this.CONSUME(T.PlusAssign) },
        { ALT: () => this.CONSUME(T.UnderscoreAssign) }
      ]);
      this.SUBRULE(this.expressionList);
      this.OPTION(() => this.CONSUME(T.SemiColon));
  })

  rulesetOrMixin = this.RULE('rulesetOrMixin', () => {
    let extend = false;
      this.AT_LEAST_ONE_SEP({
          SEP: T.Comma,
          DEF: () => {
              this.SUBRULE(this.selector)
              this.OPTION(() => {
                this.SUBRULE(this.extendRule);
                extend = true;
              })
          }
      })

      this.OR([
          {
            GATE: () => extend,
            ALT: () => this.CONSUME(T.SemiColon)
          },
          {
              ALT: () => {
                  // TODO: variable argument list syntax inside args indicates a definition
                  this.SUBRULE(this.mixinArgs)
                  this.OR2([
                      {
                          // a guard or block indicates a mixin definition
                          ALT: () => {
                              this.OPTION2(() => {
                                  this.SUBRULE(this.guard)
                              })
                              this.SUBRULE(this.curlyBlock)
                          }
                      },

                      // can there also be a lookup ("") here?
                      // a SemiColon or "!important" indicates a mixin call
                      {
                          ALT: () => {
                              this.OPTION3(() => {
                                  this.CONSUME(T.Important)
                              })
                              this.CONSUME2(T.SemiColon)
                          }
                      }
                  ])
              }
          },
          {
              // Block indicates a ruleset
              ALT: () => {
                  this.SUBRULE2(this.curlyBlock)
              }
          }
      ])
  })

  variableAssign = this.RULE('variableAssign', () => {
    this.CONSUME(T.VariableAssignment);
    this.SUBRULE(this.expressionList);
    this.OPTION(() => this.CONSUME(T.SemiColon));
  })

  // Used for mixin / function args
  // Can have a semi-colon separator
  args = this.RULE('args', (inMixin: true) => {
    let semiColonFound = false;
    let closingParenFound = false
    let blockStack = []
    let i = 0

    // extract this to a helper method
    while (!semiColonFound && !closingParenFound) {
      i++;
      const blockLength = blockStack.length
      const nextToken = this.LA(i)
      const tokenType = nextToken.tokenType

      switch (tokenType) {
        case T.LParen:
          blockStack.unshift(T.RParen)
          break;
        case T.LCurly:
          blockStack.unshift(T.RCurly)
          break;
        case T.SemiColon:
          semiColonFound = true;
          break;
        case T.RCurly:
        case T.RParen:
          if (blockLength > 0 && blockStack[0] === tokenType) {
            blockStack.shift()
            if (blockLength === 1 && tokenType === T.RParen) {
              closingParenFound = true
            }
          }
          break;
        case EOF:
          closingParenFound = true
      }
    }
    
    this.OR([
      {
        GATE: () => semiColonFound,
        ALT: () => this.SUBRULE(this.semiColonList, { ARGS: [inMixin] })
      },
      {
        ALT: () => this.SUBRULE(this.expressionList, { ARGS: [inMixin] })
      }
    ])
  })

  semiColonList = this.RULE('semiColonList', (inMixin: boolean = false) => {
    this.MANY_SEP({
      SEP: T.SemiColon,
      DEF: () => {
        this.OR([
          {
            GATE: () => inMixin,
            ALT: () => {
              this.CONSUME(T.VariableAssignment)
              this.SUBRULE(this.expression)
            }
          },
          {
            ALT: () => this.SUBRULE2(this.expression)
          }
        ])
      }
    })
  })

  expressionList = this.RULE('expressionList', (inMixin: boolean = false) => {
    this.MANY_SEP({
      SEP: T.Comma,
      DEF: () => {
        this.OR([
          {
            GATE: () => inMixin,
            ALT: () => {
              this.CONSUME(T.VariableAssignment)
              this.SUBRULE(this.expression)
            }
          },
          {
            ALT: () => this.SUBRULE2(this.expression)
          }
        ])
      }
    })
  })

  expression = this.RULE('expression', () => {
    this.MANY(() => {
      this.SUBRULE(this.additionExpression)
    })
  })

  additionExpression = this.RULE('additionExpression', () => {
    // using labels can make the CST processing easier
    this.SUBRULE(this.multiplicationExpression, { LABEL: "lhs" })
    this.MANY(() => {
      // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
      this.CONSUME(T.AdditionOperator)
      //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
      this.SUBRULE2(this.multiplicationExpression, { LABEL: "rhs" })
    })
  })

  multiplicationExpression = this.RULE("multiplicationExpression", () => {
    this.SUBRULE(this.compareExpression, { LABEL: "lhs" })
    this.MANY(() => {
        this.CONSUME(T.MultiplicationOperator)
        //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
        this.SUBRULE2(this.compareExpression, { LABEL: "rhs" })
    })
  })

  compareExpression = this.RULE('compareExpression', () => {
    // using labels can make the CST processing easier
    this.SUBRULE(this.atomicExpression, { LABEL: "lhs" })
    this.MANY({
      GATE: () => this.inCompareBlock,
      DEF: () => {
        // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
        this.CONSUME(T.CompareOperator)
        //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
        this.SUBRULE2(this.atomicExpression, { LABEL: "rhs" })
      }
    })
  })     

  atomicExpression = this.RULE('atomicExpression', () => {
    this.OR([
        // parenthesisExpression has the highest precedence and thus it appears
        // in the "lowest" leaf in the expression ParseTree.
        { ALT: () => this.SUBRULE(this.parenBlock) },
        { ALT: () => this.SUBRULE(this.functionCall) },
        { ALT: () => this.CONSUME(T.AtName) },
        { ALT: () => this.CONSUME(T.Unit) },
        { ALT: () => this.CONSUME(T.Ident) },
        { ALT: () => this.CONSUME(T.StringLiteral) },
        { ALT: () => this.CONSUME(T.Uri) },
        { ALT: () => this.CONSUME(T.Color) }
    ])
  })

  parenBlock = this.RULE('parenBlock', () => {
    this.CONSUME(T.LParen);
    this.OR([
      { ALT: () => this.SUBRULE(this.declaration) },
      { ALT: () => this.SUBRULE(this.additionExpression) }
    ])
    this.CONSUME(T.RParen);
  })

  functionCall = this.RULE('functionCall', () => {
    this.CONSUME(T.Func);
    this.SUBRULE(this.args);
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

      this.OPTION2(() => {
          this.CONSUME(T.Important)
      })
  })

  entitiesCall = this.RULE('entitiesCall', () => {
      // TODO: TBD
  })

  atrule = this.RULE('atrule', () => {
      this.OR([
          { ALT: () => this.SUBRULE(this.importAtRule) },
          { ALT: () => this.SUBRULE(this.pluginAtRule) },
          { ALT: () => this.SUBRULE(this.mediaAtRule) },
          { ALT: () => this.SUBRULE(this.generalAtRule) }
      ]);
  })

  generalAtRule = this.RULE('generalAtRule', () => {
    this.CONSUME(T.AtName)
    this.SUBRULE(this.expression)
    this.OR([
        { ALT: () => this.CONSUME(T.SemiColon) },
        { ALT: () => this.SUBRULE(this.curlyBlock) }
    ]);
  })

  // TODO: this is the original CSS import is the LESS import different?
  importAtRule = this.RULE('importAtRule', () => {
    this.CONSUME(T.AtImport)

    this.OR([
      { ALT: () => this.CONSUME(T.StringLiteral) },
      // TODO: is the LESS URI different than CSS?
      { ALT: () => this.CONSUME(T.Uri) }
    ])

    this.OPTION(() => {
      this.SUBRULE(this.mediaList)
    })

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
    this.SUBRULE(this.mediaList)
    this.SUBRULE(this.curlyBlock)
  })

  mediaList = this.RULE('mediaList', () => {
    this.OPTION(() => this.CONSUME(T.Only))
    this.MANY_SEP({
      SEP: T.Comma,
      DEF: () => {
        this.SUBRULE(this.mediaParam)
      }
    })
  })

  mediaParam = this.RULE('mediaParam', () => {
    this.MANY_SEP({
      SEP: T.And,
      DEF: () => {
        this.OPTION(() => this.CONSUME(T.Not))
        this.OR([
          { ALT: () => this.CONSUME(T.Ident) },
          { ALT: () => {
            this.CONSUME(T.LParen)
            this.SUBRULE(this.mediaParam)
            this.CONSUME(T.RParen)
          }},
          { ALT: () => this.SUBRULE(this.mediaQuery) }
        ])
      }
    })
  })

  mediaQuery = this.RULE('mediaQuery', () => {
    this.CONSUME(T.LParen)
    this.CONSUME(T.InterpolatedIdent)
    this.CONSUME(T.Colon)
    this.SUBRULE(this.additionExpression)
    this.CONSUME(T.RParen)
  })

  // TODO: misaligned with CSS: Missing case insensitive attribute flag
  // https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors
  attrib = this.RULE('attrib', () => {
      this.CONSUME(T.LSquare)
      this.CONSUME(T.Ident)

      this.OPTION(() => {
        this.CONSUME(T.AttrMatch);

          // REVIEW: misaligned with LESS: LESS allowed % number here, but
          // that is not valid CSS
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

  selector = this.RULE('selector', () => {
      this.SUBRULE(this.simple_selector)
      this.OPTION(() => {
          this.OR([
              {
                  GATE: () => {
                      const prevToken = this.LA(0)
                      const nextToken = this.LA(1)
                      //  This is the only place in CSS where the grammar is whitespace sensitive.
                      return nextToken.startOffset > prevToken.endOffset
                  },
                  ALT: () => {
                      this.OPTION2(() => {
                          this.SUBRULE(this.combinator)
                      })
                      this.SUBRULE(this.selector)
                  }
              },
              {
                  ALT: () => {
                      this.SUBRULE2(this.combinator)
                      this.SUBRULE2(this.selector)
                  }
              }
          ])
      })
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
      { ALT: () => this.CONSUME(T.Tilde) }
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
  })

  pseudoFunction = this.RULE('pseudoFunction', () => {
    this.CONSUME(T.PseudoFunction);
    this.SUBRULE(this.expression);
    this.CONSUME(T.RParen);
  });

  // ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
  pseudo = this.RULE('pseudo', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.pseudoFunction) },
      { ALT: () => this.CONSUME(T.PseudoClass) }
    ]);
  })

  curlyBlock = this.RULE('curlyBlock', () => {
      this.CONSUME(T.LCurly);
      this.inSelector = true;
      this.SUBRULE(this.primary);
      this.CONSUME(T.RCurly)
      this.inSelector = false;
  })

  mixinRuleLookup = this.RULE('mixinRuleLookup', () => {
    this.CONSUME(T.LSquare)
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this.lookupValue)
    })

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
    this.SUBRULE(this.args, { ARGS: [true] });
    this.CONSUME(T.RParen)
  })

  guard = this.RULE('guard', () => {
    this.CONSUME(T.When)
    this.SUBRULE(this.compareBlock)
  })

  compareBlock = this.RULE('compareBlock', () => {
    this.CONSUME(T.LParen)
    this.inCompareBlock = true
    this.SUBRULE(this.expression);
    this.inCompareBlock = true
    this.CONSUME(T.RParen)
  })
}

// ----------------- wrapping it all together -----------------

// reuse the same parser instance.
const parser = new LessParser()

const parse = (text) => {
  const lexResult = LessLexer.tokenize(text)
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
