/**
 * references:
 * https://github.com/antlr/grammars-v4/blob/master/css3/css3.g4
 * https://www.lifewire.com/css2-vs-css3-3466978
 */
import {
  Parser,
  Lexer,
  createToken as orgCreateToken,
  EMPTY_ALT,
  ITokenConfig,
  TokenType
} from 'chevrotain';
import * as XRegExp from 'xregexp';

const fragments: {
  [key: string]: RegExp;
} = {};

function FRAGMENT(name: string, def: string, flags?: string) {
  fragments[name] = XRegExp.build(def, fragments, flags);
}

const Token: {
  [key: string]: TokenType
} = {};

const lessTokens: TokenType[] = [];

const createToken = ({ name, ...rest }: ITokenConfig): TokenType => {
  const token = orgCreateToken({name, ...rest});
  Token[name] = token;
  lessTokens.push(token);
  return token;
};

FRAGMENT("spaces", "[ \\t\\r\\n\\f]+")
FRAGMENT("h", "[\\da-f]", 'i')
FRAGMENT("unicode", "{{h}}{1,6}")
FRAGMENT("escape", "{{unicode}}|\\\\[^\\r\\n\\f0-9a-fA-F]")
FRAGMENT("nl", "\\n|\\r|\\f")
FRAGMENT("string1", '\\"([^\\n\\r\\f\\"]|{{nl}}|{{escape}})*\\"')
FRAGMENT("string2", "\\'([^\\n\\r\\f\\']|{{nl}}|{{escape}})*\\'")
FRAGMENT("nonascii", "[\\u0240-\\uffff]")
FRAGMENT("nmstart", "[_a-zA-Z]|{{nonascii}}|{{escape}}")
FRAGMENT("nmchar", "[_a-zA-Z0-9-]|{{nonascii}}|{{escape}}")
FRAGMENT("name", "({{nmchar}})+")
FRAGMENT("ident", "-?{{nmstart}}{{nmchar}}*")
FRAGMENT("url", "([!#\\$%&*-~]|{{nonascii}}|{{escape}})*")

function MAKE_PATTERN(def: string, flags?: string) {
  return XRegExp.build(def, fragments, flags)
}

const Whitespace = createToken({
  name: "Whitespace",
  pattern: MAKE_PATTERN("{{spaces}}"),
  // The W3C specs are are defined in a whitespace sensitive manner.
  // But there is only **one** place where the grammar is truly whitespace sensitive.
  // So the whitespace sensitivity was implemented via a GATE in the selector rule.
  group: Lexer.SKIPPED
})

const Comment = createToken({
  name: "Comment",
  pattern: /\/\*[^*]*\*+([^/*][^*]*\*+})*\//,
  group: Lexer.SKIPPED
})

const AtName = createToken({
  name: 'AtName',
  pattern: MAKE_PATTERN('@{{ident}}')
});

const PropertyVariable = createToken({
  name: "PropertyVariable",
  pattern: /\$[\w-]+/
})

const NestedPropertyVariable = createToken({
  name: "NestedPropertyVariable",
  pattern: /\$@[\w-]+/
})

// Ident must be before Minus
const Ident = createToken({
  name: 'Ident',
  pattern: MAKE_PATTERN("{{ident}}")
})

const ImportSym = createToken({
  name: "ImportSym",
  pattern: /@import/,
  longer_alt: AtName
})

const MediaSym = createToken({
  name: "MediaSym",
  pattern: /@media/,
  longer_alt: AtName
})

const PluginSym = createToken({
  name: "PluginSym",
  pattern: /@plugin/,
  longer_alt: AtName
})

// This group has to be defined BEFORE Ident as their prefix is a valid Ident
const Uri = createToken({ name: "Uri", pattern: Lexer.NA })
const UriString = createToken({
  name: "UriString",
  pattern: MAKE_PATTERN(
      "url\\((:?{{spaces}})?({{string1}}|{{string2}})(:?{{spaces}})?\\)"
  ),
  categories: Uri
})
const UriUrl = createToken({
  name: "UriUrl",
  pattern: MAKE_PATTERN("url\\((:?{{spaces}})?{{url}}(:?{{spaces}})?\\)"),
  categories: Uri
})

const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: MAKE_PATTERN("{{string1}}|{{string2}}")
})
// TODO: not sure this token is needed
const Ampersand = createToken({ name: "Ampersand", pattern: "&" })
const Extend = createToken({
  name: "Extend",
  pattern: 'extend',
  longer_alt: Ident
})
const Star = createToken({ name: "Star", pattern: '*' })
const Equals = createToken({ name: "Equals", pattern: '=' })
const Includes = createToken({ name: "Includes", pattern: '~=' })
const Dasmatch = createToken({ name: "Dasmatch", pattern: '|=' })
const BeginMatchExactly = createToken({
  name: "BeginMatchExactly",
  pattern: "^="
})
const EndMatchExactly = createToken({ name: "EndMatchExactly", pattern: "$=" })
const ContainsMatch = createToken({ name: "ContainsMatch", pattern: "*=" })

const ImportantSym = createToken({
  name: "ImportantSym",
  pattern: /!important/i
})

const When = createToken({
  name: "When",
  pattern: /when/
})

// must must appear before Ident due to common prefix
const Func = createToken({
  name: "Func",
  pattern: MAKE_PATTERN("{{ident}}\\(")
})

// TODO: keywords vs identifiers
// TODO: would LParen conflict with other tokens that include LParen?
const LParen = createToken({
  name: 'LParen',
  pattern: '('
});
const RParen = createToken({
  name: 'RParen',
  pattern: ')'
});

const SemiColon = createToken({ name: 'SemiColon', pattern: Lexer.NA })

const SoftSemiColon = createToken({
  name: 'SoftSemiColon',
  pattern: ';',
  categories: [SemiColon]
})

const PopSemiColon = createToken({
  name: 'PopSemiColon',
  pattern: ';',
  pop_mode: true,
  categories: [SemiColon]
})

const Percentage = createToken({
  name: "Percentage",
  pattern: /(?:\d+\.\d+|\d+)%/
})
const LSquare = createToken({ name: "LSquare", pattern: "[" })
const RSquare = createToken({ name: "RSquare", pattern: "]" })

const Plus = createToken({ name: "Plus", pattern: "+" })
const GreaterThan = createToken({ name: "GreaterThan", pattern: ">" })
const Tilde = createToken({ name: "Tilde", pattern: "~" })
const Hash = createToken({
  name: "Hash",
  pattern: '#'
})
const Dot = createToken({ name: "Dot", pattern: "." })
const Comma = createToken({ name: "Comma", pattern: "," })

const Colon = createToken({
  name: 'Colon',
  pattern: Lexer.NA
})

const SoftColon = createToken({
  name: 'Colon',
  pattern: ':',
  categories: [Colon]
});

const Assign = createToken({
  name: "Assign",
  pattern: ":",
  push_mode: 'value_mode',
  categories: [Colon]
})

/** Will pop out of at-rule mode and into value mode */
const AtAssign = createToken({
  name: "AtAssign",
  pattern: ":",
  push_mode: 'value_mode',
  pop_mode: true,
  categories: [Colon]
})

const LCurly = createToken({
  name: "LCurly",
  pattern: '{'
});

const AtLCurly = createToken({
  name: "AtLCurly",
  pattern: '{',
  pop_mode: true
});

const RCurly = createToken({
  name: 'RCurly',
  pattern: '}'
});

const commonTokens = [
  Ident,
  Comma,
  Dot,
  Hash,
  RCurly,
  Ampersand,
  LParen,
  RParen,
  StringLiteral,
  Uri
];

const lessModes = {
  modes: {
    rules_mode: [
      Whitespace,
      InterpolateStart,
      AtStart,
      Extend,
      LCurly,
      SoftColon,
      SoftSemiColon,
      ...commonTokens
    ],
    at_mode: [
      Whitespace,
      ImportSym,
      PluginSym,
      MediaSym,
      AtAssign,
      AtLCurly,
      PopSemiColon,
      ...commonTokens
    ],
    value_mode: [
      Whitespace,
      PopSemiColon,
      ...commonTokens
    ]
  },
  defaultMode: 'rules_mode'
};

const LessLexer = new Lexer(lessModes)

// ----------------- parser -----------------

class LessParser extends Parser {
  primary: any;
  extendRule: any;
  andExtend: any;
  variableCall: any;
  variableAssign: any;
  atrule: any;
  rulesetOrMixin: any;
  selector: any;
  args: any;
  guard: any;
  block: any;
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

  constructor() {
      super(lessTokens, {
          ignoredIssues: {
              selector: { OR: true }
          }
      })

      const $ = this

      $.RULE("primary", () => {
          $.MANY(() => {
              $.OR([
                  // { ALT: () => $.SUBRULE($.variableCall) },
                  { ALT: () => $.SUBRULE($.atrule) },
                  
                  // { ALT: () => $.SUBRULE($.declaration) },
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
      $.RULE("andExtend", () => {
        $.CONSUME(Ampersand);
        $.CONSUME(Colon);
        $.SUBRULE($.extendRule);
      });
      $.RULE("extendRule", () => {
          $.CONSUME(Extend)
          $.CONSUME(LParen)
          $.MANY_SEP({
              SEP: Comma,
              DEF: () => {
                  // TODO: a GATE is needed here because the following All
                  $.SUBRULE($.selector)

                  // TODO: this probably has to be post processed
                  // because "ALL" may be a normal ending part of a selector
                  // $.OPTION(() => {
                  //     $.CONSUME(All)
                  // })
              }
          })
          $.CONSUME(RParen)
          $.CONSUME(SemiColon)
      })

      $.RULE("declaration", () => {
          // TODO: TBD
      })

      $.RULE("rulesetOrMixin", () => {
          $.MANY_SEP({
              SEP: Comma,
              DEF: () => {
                  $.SUBRULE($.selector)
                  $.OPTION(() => {
                    $.SUBRULE($.extendRule);
                  })
              }
          })

          $.OR([
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
                                  $.SUBRULE($.block)
                              }
                          },

                          // can there also be a lookup ("") here?
                          // a SemiColon or "!important" indicates a mixin call
                          {
                              ALT: () => {
                                  $.OPTION3(() => {
                                      $.CONSUME(ImportantSym)
                                  })
                                  $.CONSUME(SemiColon)
                              }
                          }
                      ])
                  }
              },
              {
                  // Block indicates a ruleset
                  ALT: () => {
                      $.SUBRULE2($.block)
                  }
              }
          ])
      })

      $.RULE('variableAssign', () => {
        $.CONSUME(Colon);
        $.CONSUME(Ident);
        $.CONSUME(SemiColon);
      });

      $.RULE("variableCall", () => {
          // $.OR([
          //     { ALT: () => $.CONSUME(VariableCall) },
          //     { ALT: () => $.CONSUME(VariableName) }
          // ])

          $.OPTION(() => {
              $.SUBRULE($.mixinRuleLookup)
          })

          $.OPTION2(() => {
              $.CONSUME(ImportantSym)
          })
      })

      $.RULE("entitiesCall", () => {
          // TODO: TBD
      })

      $.RULE("atrule", () => {
          $.CONSUME(AtStart);
          $.OR([
              { ALT: () => $.SUBRULE($.importAtRule) },
              { ALT: () => $.SUBRULE($.pluginAtRule) },
              { ALT: () => $.SUBRULE($.mediaAtRule) },
              { ALT: () => {
                $.CONSUME(Ident)
                $.OR2([
                  { ALT: () => $.SUBRULE($.variableAssign) }
                ]);
              }}
          ]);
      })

      // TODO: this is the original CSS import is the LESS import different?
      $.RULE("importAtRule", () => {
          $.CONSUME(ImportSym)

          $.OR([
              { ALT: () => $.CONSUME(StringLiteral) },
              // TODO: is the LESS URI different than CSS?
              { ALT: () => $.CONSUME(Uri) }
          ])

          $.OPTION(() => {
              $.SUBRULE($.media_list)
          })

          $.CONSUME(SemiColon)
      })

      $.RULE("pluginAtRule", () => {
          $.CONSUME(PluginSym)
          $.OPTION(() => {
              $.SUBRULE($.pluginArgs)
          })

          $.OR([
              { ALT: () => $.CONSUME(StringLiteral) },
              // TODO: is the LESS URI different?
              { ALT: () => $.CONSUME(Uri) }
          ])
      })

      $.RULE("pluginArgs", () => {
          $.CONSUME(LParen)
          // TODO: what is this? it seems like a "permissive token".
          $.CONSUME(RParen)
      })

      // TODO: this is css 2.1, css 3 has an expression language here
      $.RULE("mediaAtRule", () => {
          $.CONSUME(MediaSym)
          $.SUBRULE($.media_list)
          $.CONSUME(LCurly)
          $.MANY_SEP({
              SEP: Comma,
              DEF: () => {
                  $.SUBRULE($.selector)
              }
          })
          $.SUBRULE($.block)
          $.CONSUME(RCurly)
      })

      $.RULE("media_list", () => {
          $.CONSUME(Ident)
          $.MANY_SEP({
              SEP: Comma,
              DEF: () => {
                  $.CONSUME2(Ident)
              }
          })
      })

      // TODO: misaligned with CSS: Missing case insensitive attribute flag
      // https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors
      $.RULE("attrib", () => {
          $.CONSUME(LSquare)
          $.CONSUME(Ident)

          $.OPTION(() => {
              $.OR([
                  { ALT: () => $.CONSUME(Equals) },
                  { ALT: () => $.CONSUME(Includes) },
                  { ALT: () => $.CONSUME(Dasmatch) },
                  { ALT: () => $.CONSUME(BeginMatchExactly) },
                  { ALT: () => $.CONSUME(EndMatchExactly) },
                  { ALT: () => $.CONSUME(ContainsMatch) }
              ])

              // REVIEW: misaligned with LESS: LESS allowed % number here, but
              // that is not valid CSS
              $.OR2([
                  { ALT: () => $.CONSUME2(Ident) },
                  { ALT: () => $.CONSUME(StringLiteral) }
              ])
          })
          $.CONSUME(RSquare)
      })

      $.RULE("variableCurly", () => {
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
      $.RULE("simple_selector", () => {
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

      $.RULE("combinator", () => {
          $.OR([
              { ALT: () => $.CONSUME(Plus) },
              { ALT: () => $.CONSUME(GreaterThan) },
              { ALT: () => $.CONSUME(Tilde) }
          ])
      })

      // helper grammar rule to avoid repetition
      // [ HASH | class | attrib | pseudo ]+
      $.RULE("simple_selector_suffix", () => {
          $.OR([
              { ALT: () => $.SUBRULE($.classOrId) },
              { ALT: () => $.SUBRULE($.attrib) },
              { ALT: () => $.SUBRULE($.pseudo) },
              { ALT: () => $.CONSUME(Ampersand) }
          ])
      })

      // '.' IDENT | '#' IDENT
      $.RULE("classOrId", () => {
          $.OR([
            { ALT: () => $.CONSUME(Dot) },
            { ALT: () => $.CONSUME(Hash) }
          ]);
          $.CONSUME(Ident)
      })

      // IDENT | '*'
      $.RULE("element_name", () => {
          $.OR([
              { ALT: () => $.CONSUME(Ident) },
              { ALT: () => $.CONSUME(Star) }
          ])
      })

      // ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
      $.RULE("pseudo", () => {
          $.CONSUME(Colon)

          $.OR([
              { ALT: () => $.CONSUME(Ident) },
              {
                  ALT: () => {
                      $.CONSUME(Func)
                      $.OPTION(() => {
                          $.CONSUME2(Ident)
                      })
                      $.CONSUME(RParen)
                  }
              }
          ])
      })

      $.RULE("block", () => {
          $.CONSUME(LCurly)
          $.OR([
            { ALT: () => $.SUBRULE($.andExtend) },
            { ALT: () => $.SUBRULE($.primary) }
          ])
          $.CONSUME(RCurly)
      })

      $.RULE("mixinRuleLookup", () => {
          $.CONSUME(LSquare)
          $.AT_LEAST_ONE(() => {
              $.SUBRULE($.lookupValue)
          })

          $.CONSUME(RSquare)
      })

      $.RULE("lookupValue", () => {
          $.OR([
              { ALT: () => $.CONSUME(Ident) },
              // { ALT: () => $.CONSUME(VariableName) },
              // { ALT: () => $.CONSUME(NestedVariableName) },
              { ALT: () => $.CONSUME(PropertyVariable) },
              { ALT: () => $.CONSUME(NestedPropertyVariable) },
              { ALT: () => EMPTY_ALT }
          ])
      })

      $.RULE("args", () => {
          $.CONSUME(LParen)
          $.CONSUME(RParen)
          // TODO: TBD
      })

      $.RULE("guard", () => {
          $.CONSUME(When)
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