
import { Parser, EMPTY_ALT } from 'chevrotain'
import { lessTokens, LessLexer, T } from './tokens'

class LessParser extends Parser {
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
  interpolatedIdent: any;
  args: any;
  guard: any;
  curlyBlock: any;
  parenBlock: any;
  bracketBlock: any;
  mixinRuleLookup: any;
  importAtRule: any;
  pluginAtRule: any;
  pluginArgs: any;
  mediaAtRule: any;
  media_list: any;
  simple_selector: any;
  combinator: any;
  element_name: any;
  simple_selector_suffix: any;
  lookupValue: any;
  classOrId: any;
  attrib: any;
  pseudo: any;
  pseudoFunction: any;
  inSelector: boolean = false;

  constructor() {
      super(lessTokens, {
          // maxLookahead: 2,
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
          $.SUBRULE($.expression);
          $.CONSUME(T.SemiColon);
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
                  ALT: () => {
                      // TODO: variable argument list syntax inside args indicates a definition
                      $.SUBRULE($.args)
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
        $.CONSUME(T.AtName);
        $.CONSUME(T.Colon);
        $.SUBRULE($.expression);
        $.CONSUME(T.SemiColon);
      });

      $.RULE('expression', (inParens: boolean = false) => {
        $.MANY(() => {
          $.OR([
            { GATE: () => inParens,
              ALT: () => {
                $.OR2([
                  { ALT: () => $.SUBRULE($.declaration)}
                ]);
              }
            },
            { ALT: () => $.CONSUME(T.Ident) },
            { ALT: () => $.CONSUME(T.AtName) },
            { ALT: () => $.CONSUME(T.Unit) },
            { ALT: () => $.SUBRULE($.parenBlock) }
          ]);
        });
      });

      $.RULE('parenBlock', () => {
        $.CONSUME(T.LParen);
        $.SUBRULE($.expression, { ARGS: [true] });
        $.CONSUME(T.RParen);
      });

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
              $.SUBRULE($.media_list)
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
          $.SUBRULE($.media_list)
          $.SUBRULE($.curlyBlock)
      })

      $.RULE('media_list', () => {
          $.CONSUME(T.Ident)
          $.MANY_SEP({
              SEP: T.Comma,
              DEF: () => {
                  $.CONSUME2(T.Ident)
              }
          })
      })

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
              { ALT: () => $.CONSUME(T.ClassOrID) },
              { ALT: () => $.SUBRULE($.attrib) },
              { ALT: () => $.SUBRULE($.pseudo) },
              { ALT: () => $.CONSUME(T.Ampersand) }
          ])
      })

      // IDENT | '*'
      $.RULE('element_name', () => {
          $.OR([
              { ALT: () => $.CONSUME(T.Ident) },
              { ALT: () => $.CONSUME(T.Star) }
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
          $.CONSUME(T.LCurly)
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

      $.RULE('args', () => {
          $.CONSUME(T.LParen)
          $.CONSUME(T.RParen)
          // TODO: TBD
      })

      $.RULE('guard', () => {
          $.CONSUME(T.When)
          // TODO: TBD
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