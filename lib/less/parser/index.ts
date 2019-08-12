
import { CstParser, EMPTY_ALT } from 'chevrotain'
import { lessTokens, LessLexer, T } from './tokens'

class LessParser extends CstParser {
  primary: any;
  extendRule: any;
  variableCall: any;
  variableAssign: any;
  declaration: any;
  atrule: any;
  generalAtRule: any;
  rulesetOrMixin: any;
  selector: any;
  expression: any;
  expressionList: any;
  innerExpressionList: any;
  interpolatedIdent: any;
  mixinArgs: any;
  functionCall: any;
  guard: any;
  curlyBlock: any;
  parenBlock: any;
  bracketBlock: any;
  mixinRuleLookup: any;
  importAtRule: any;
  pluginAtRule: any;
  pluginArgs: any;
  mediaAtRule: any;
  mediaList: any;
  mediaParam: any;
  mediaQuery: any;

  simple_selector: any;
  combinator: any;
  element_name: any;
  simple_selector_suffix: any;
  lookupValue: any;
  attrib: any;
  pseudo: any;
  pseudoFunction: any;
  inSelector: boolean = false;
  inCompareBlock: boolean = false;

  additionExpression: any;
  multiplicationExpression: any;
  compareExpression: any;
  atomicExpression: any;
  compareBlock: any;

  constructor() {
      super(lessTokens, {
          ignoredIssues: {
            selector: { OR: true }
          }
      })

      const $ = this

      $.RULE('primary', () => {
          $.MANY(() => {
              $.OR([
                  // { ALT: () => $.SUBRULE($.variableCall) },
                  { GATE: () => $.inSelector, ALT: () => $.SUBRULE($.declaration) },
                  { ALT: () => $.SUBRULE($.atrule) },
                  { ALT: () => $.SUBRULE($.variableAssign) },
                  // { ALT: () => $.SUBRULE($.entitiesCall) },

                  // this combines mixincall, mixinDefinition and rule set
                  // because of common prefix
                  { ALT: () => $.SUBRULE($.rulesetOrMixin) }
              ])
          })
      })

      // The original extend had two variants "extend" and "extendRule"
      // implemented in the same function, we will have two separate functions
      // for readability and clarity.
      $.RULE('extendRule', () => {
          $.CONSUME(T.Extend)
          $.MANY_SEP({
              SEP: T.Comma,
              DEF: () => {
                  // TODO: a GATE is needed here because the following All
                  $.SUBRULE($.selector)

                  // TODO: this probably has to be post processed
                  // because "ALL" may be a normal ending part of a selector
                  // $.OPTION(() => {
                  //     $.CONSUME(T.All)
                  // })
              }
          })
          $.CONSUME(T.RParen)
      })

      $.RULE('declaration', () => {
          $.OR([
            { ALT: () => $.CONSUME(T.Ident) },
            { ALT: () => $.CONSUME(T.InterpolatedIdent) }
          ])
          $.OR2([
            { ALT: () => $.CONSUME(T.Colon) },
            { ALT: () => $.CONSUME(T.PlusAssign) },
            { ALT: () => $.CONSUME(T.UnderscoreAssign) }
          ]);
          $.SUBRULE($.expressionList);
          $.OPTION(() => $.CONSUME(T.SemiColon));
      })

      $.RULE('rulesetOrMixin', () => {
        let extend = false;
          $.AT_LEAST_ONE_SEP({
              SEP: T.Comma,
              DEF: () => {
                  $.SUBRULE($.selector)
                  $.OPTION(() => {
                    $.SUBRULE($.extendRule);
                    extend = true;
                  })
              }
          })

          $.OR([
              {
                GATE: () => extend,
                ALT: () => $.CONSUME(T.SemiColon)
              },
              {
                  // args indicate a mixin call or definition
                  GATE: () => {
                    const prevToken = $.LA(0)
                    const nextToken = $.LA(1)

                    // A LParen must immediately follow a mixin
                    return nextToken.startOffset === prevToken.endOffset + 1
                  },
                  ALT: () => {
                      // TODO: variable argument list syntax inside args indicates a definition
                      $.SUBRULE($.mixinArgs)
                      $.OR2([
                          {
                              // a guard or block indicates a mixin definition
                              ALT: () => {
                                  $.OPTION2(() => {
                                      $.SUBRULE($.guard)
                                  })
                                  $.SUBRULE($.curlyBlock)
                              }
                          },

                          // can there also be a lookup ("") here?
                          // a SemiColon or "!important" indicates a mixin call
                          {
                              ALT: () => {
                                  $.OPTION3(() => {
                                      $.CONSUME(T.Important)
                                  })
                                  $.CONSUME2(T.SemiColon)
                              }
                          }
                      ])
                  }
              },
              {
                  // Block indicates a ruleset
                  ALT: () => {
                      $.SUBRULE2($.curlyBlock)
                  }
              }
          ])
      })

      $.RULE('variableAssign', () => {
        $.CONSUME(T.VariableAssignment);
        $.SUBRULE($.expressionList);
        $.OPTION(() => $.CONSUME(T.SemiColon));
      });

      // Used for mixin / function args
      // Can have a semi-colon separator
      $.RULE('innerExpressionList', (inMixin: true) => {
        $.MANY_SEP({
          SEP: T.ArgSeparator,
          DEF: () => {
            $.OR([
              {
                GATE: () => inMixin,
                ALT: () => {
                  $.CONSUME(T.VariableAssignment)
                  $.SUBRULE($.expression)
                }
              },
              {
                ALT: () => $.SUBRULE2($.expression)
              }
            ])
          }
        })
      });

      $.RULE('expressionList', () => {
        $.MANY_SEP({
          SEP: T.Comma,
          DEF: () => $.SUBRULE($.expression)
        })
      });

      $.RULE('expression', () => {
        $.MANY(() => {
          $.SUBRULE($.additionExpression)
        });
      }); 

      $.RULE('additionExpression', () => {
        // using labels can make the CST processing easier
        $.SUBRULE($.multiplicationExpression, { LABEL: "lhs" })
        $.MANY(() => {
          // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
          $.CONSUME(T.AdditionOperator)
          //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
          $.SUBRULE2($.multiplicationExpression, { LABEL: "rhs" })
        })
      })

      $.RULE("multiplicationExpression", () => {
        $.SUBRULE($.compareExpression, { LABEL: "lhs" })
        $.MANY(() => {
            $.CONSUME(T.MultiplicationOperator)
            //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
            $.SUBRULE2($.compareExpression, { LABEL: "rhs" })
        })
      })

      $.RULE('compareExpression', () => {
        // using labels can make the CST processing easier
        $.SUBRULE($.atomicExpression, { LABEL: "lhs" })
        $.MANY({
          GATE: () => $.inCompareBlock,
          DEF: () => {
            // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
            $.CONSUME(T.CompareOperator)
            //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
            $.SUBRULE2($.atomicExpression, { LABEL: "rhs" })
          }
        })
      })     

      $.RULE('atomicExpression', () => {
        $.OR([
            // parenthesisExpression has the highest precedence and thus it appears
            // in the "lowest" leaf in the expression ParseTree.
            { ALT: () => $.SUBRULE($.parenBlock) },
            { ALT: () => $.SUBRULE($.functionCall) },
            { ALT: () => $.CONSUME(T.AtName) },
            { ALT: () => $.CONSUME(T.Unit) },
            { ALT: () => $.CONSUME(T.Ident) },
            { ALT: () => $.CONSUME(T.StringLiteral) },
            { ALT: () => $.CONSUME(T.Uri) },
            { ALT: () => $.CONSUME(T.Color) }
        ])
      })

      $.RULE('parenBlock', () => {
        $.CONSUME(T.LParen);
        $.OR([
          { ALT: () => $.SUBRULE($.declaration) },
          { ALT: () => $.SUBRULE($.additionExpression) }
        ])
        $.CONSUME(T.RParen);
      });

      $.RULE('functionCall', () => {
        $.CONSUME(T.Func);
        $.SUBRULE($.innerExpressionList);
        $.CONSUME(T.RParen);
      })

      $.RULE('variableCall', () => {
          // $.OR([
          //     { ALT: () => $.CONSUME(T.VariableCall) },
          //     { ALT: () => $.CONSUME(T.VariableName) }
          // ])

          $.OPTION(() => {
              $.SUBRULE($.mixinRuleLookup)
          })

          $.OPTION2(() => {
              $.CONSUME(T.Important)
          })
      })

      $.RULE('entitiesCall', () => {
          // TODO: TBD
      })

      $.RULE('atrule', () => {
          $.OR([
              { ALT: () => $.SUBRULE($.importAtRule) },
              { ALT: () => $.SUBRULE($.pluginAtRule) },
              { ALT: () => $.SUBRULE($.mediaAtRule) },
              { ALT: () => $.SUBRULE($.generalAtRule) }
          ]);
      })

      $.RULE('generalAtRule', () => {
        $.CONSUME(T.AtName)
        $.SUBRULE($.expression)
        $.OR([
            { ALT: () => $.CONSUME(T.SemiColon) },
            { ALT: () => $.SUBRULE($.curlyBlock) }
        ]);
      });

      // TODO: this is the original CSS import is the LESS import different?
      $.RULE('importAtRule', () => {
          $.CONSUME(T.AtImport)

          $.OR([
              { ALT: () => $.CONSUME(T.StringLiteral) },
              // TODO: is the LESS URI different than CSS?
              { ALT: () => $.CONSUME(T.Uri) }
          ])

          $.OPTION(() => {
            $.SUBRULE($.mediaList)
          })

          $.CONSUME(T.SemiColon)
      })

      $.RULE('pluginAtRule', () => {
          $.CONSUME(T.AtPlugin)
          $.OPTION(() => {
              $.SUBRULE($.pluginArgs)
          })

          $.OR([
              { ALT: () => $.CONSUME(T.StringLiteral) },
              // TODO: is the LESS URI different?
              { ALT: () => $.CONSUME(T.Uri) }
          ])
      })

      $.RULE('pluginArgs', () => {
          $.CONSUME(T.LParen)
          // TODO: what is this? it seems like a "permissive token".
          $.CONSUME(T.RParen)
      })

      // TODO: this is css 2.1, css 3 has an expression language here
      $.RULE('mediaAtRule', () => {
        $.CONSUME(T.AtMedia)
        $.SUBRULE($.mediaList)
        $.SUBRULE($.curlyBlock)
      })

      $.RULE('mediaList', () => {
        $.OPTION(() => $.CONSUME(T.Only))
        $.MANY_SEP({
          SEP: T.Comma,
          DEF: () => {
            $.SUBRULE($.mediaParam)
          }
        })
      })

      $.RULE('mediaParam', () => {
        $.MANY_SEP({
          SEP: T.And,
          DEF: () => {
            $.OPTION(() => $.CONSUME(T.Not))
            $.OR([
              { ALT: () => $.CONSUME(T.Ident) },
              { ALT: () => {
                $.CONSUME(T.LParen)
                $.SUBRULE($.mediaParam)
                $.CONSUME(T.RParen)
              }},
              { ALT: () => $.SUBRULE($.mediaQuery) }
            ])
          }
        })
        
      })

      $.RULE('mediaQuery', () => {
        $.CONSUME(T.LParen)
        $.CONSUME(T.InterpolatedIdent)
        $.CONSUME(T.Colon)
        $.SUBRULE($.additionExpression)
        $.CONSUME(T.RParen)
      });

      // TODO: misaligned with CSS: Missing case insensitive attribute flag
      // https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors
      $.RULE('attrib', () => {
          $.CONSUME(T.LSquare)
          $.CONSUME(T.Ident)

          $.OPTION(() => {
            $.CONSUME(T.AttrMatch);

              // REVIEW: misaligned with LESS: LESS allowed % number here, but
              // that is not valid CSS
              $.OR([
                  { ALT: () => $.CONSUME2(T.Ident) },
                  { ALT: () => $.CONSUME(T.StringLiteral) }
              ])
          })
          $.OPTION2(() => {
            $.CONSUME(T.AttrFlag);
          });
          $.CONSUME(T.RSquare)
      })

      $.RULE('variableCurly', () => {
          // TODO: TBD
      })

      $.RULE('selector', () => {
          $.SUBRULE($.simple_selector)
          $.OPTION(() => {
              $.OR([
                  {
                      GATE: () => {
                          const prevToken = $.LA(0)
                          const nextToken = $.LA(1)
                          //  This is the only place in CSS where the grammar is whitespace sensitive.
                          return nextToken.startOffset > prevToken.endOffset
                      },
                      ALT: () => {
                          $.OPTION2(() => {
                              $.SUBRULE($.combinator)
                          })
                          $.SUBRULE($.selector)
                      }
                  },
                  {
                      ALT: () => {
                          $.SUBRULE2($.combinator)
                          $.SUBRULE2($.selector)
                      }
                  }
              ])
          })
      })

      // TODO: 'variableCurly' can appear here?
      $.RULE('simple_selector', () => {
          $.OR([
              {
                  ALT: () => {
                      $.SUBRULE($.element_name)
                      $.MANY(() => {
                          $.SUBRULE($.simple_selector_suffix)
                      })
                  }
              },
              {
                  ALT: () => {
                      $.AT_LEAST_ONE(() => {
                          $.SUBRULE2($.simple_selector_suffix)
                      })
                  }
              }
          ])
      })

      $.RULE('combinator', () => {
          $.OR([
              { ALT: () => $.CONSUME(T.Plus) },
              { ALT: () => $.CONSUME(T.Gt) },
              { ALT: () => $.CONSUME(T.Tilde) }
          ])
      })

      // helper grammar rule to avoid repetition
      // [ HASH | class | attrib | pseudo ]+
      $.RULE('simple_selector_suffix', () => {
          $.OR([
              { ALT: () => $.CONSUME(T.ClassOrId) },
              { ALT: () => $.SUBRULE($.attrib) },
              { ALT: () => $.SUBRULE($.pseudo) },
              { ALT: () => $.CONSUME(T.Ampersand) }
          ])
      })

      // IDENT | '*'
      $.RULE('element_name', () => {
          $.OR([
              { ALT: () => $.CONSUME(T.Ident) },
              { ALT: () => $.CONSUME(T.Star) },
              { ALT: () => $.CONSUME(T.Unit) }
          ])
      })

      $.RULE('pseudoFunction', () => {
        $.CONSUME(T.PseudoFunction);
        $.SUBRULE($.expression);
        $.CONSUME(T.RParen);
      });

      // ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
      $.RULE('pseudo', () => {
        $.OR([
          { ALT: () => $.SUBRULE($.pseudoFunction) },
          { ALT: () => $.CONSUME(T.PseudoClass) }
        ]);
      })

      $.RULE('curlyBlock', () => {
          $.CONSUME(T.LCurly);
          $.inSelector = true;
          $.SUBRULE($.primary);
          $.CONSUME(T.RCurly)
          $.inSelector = false;
      })

      $.RULE('mixinRuleLookup', () => {
          $.CONSUME(T.LSquare)
          $.AT_LEAST_ONE(() => {
              $.SUBRULE($.lookupValue)
          })

          $.CONSUME(T.RSquare)
      })

      $.RULE('lookupValue', () => {
          $.OR([
              { ALT: () => $.CONSUME(T.Ident) },
              // { ALT: () => $.CONSUME(T.VariableName) },
              // { ALT: () => $.CONSUME(T.NestedVariableName) },
            //   { ALT: () => $.CONSUME(T.PropertyVariable) },
            //   { ALT: () => $.CONSUME(T.NestedPropertyVariable) },
              { ALT: () => EMPTY_ALT }
          ])
      })

      $.RULE('mixinArgs', () => {
        $.CONSUME(T.LParen)
        $.SUBRULE($.innerExpressionList, { ARGS: [true] });
        $.CONSUME(T.RParen)
      })

      $.RULE('guard', () => {
        $.CONSUME(T.When)
        $.SUBRULE($.compareBlock)
      })

      $.RULE('compareBlock', () => {
        $.CONSUME(T.LParen)
        $.inCompareBlock = true
        $.SUBRULE($.expression);
        $.inCompareBlock = true
        $.CONSUME(T.RParen)
      })

      // very important to call this after all the rules have been defined.
      // otherwise the parser may not work correctly as it will lack information
      // derived during the self analysis phase.
      this.performSelfAnalysis()
  }
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