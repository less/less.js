/**
 * references:
 * https://github.com/antlr/grammars-v4/blob/master/css3/css3.g4
 * https://www.lifewire.com/css2-vs-css3-3466978
 */
import {
  Lexer,
  createToken as orgCreateToken,
  ITokenConfig,
  TokenType
} from 'chevrotain';
import * as XRegExp from 'xregexp';

const T: {[key: string]: TokenType } = {};

const fragments: {
  [key: string]: RegExp;
} = {};

function FRAGMENT(name: string, def: string, flags?: string) {
  fragments[name] = XRegExp.build(def, fragments, flags);
}

const lessTokens: TokenType[] = [];

const createToken = ({ name, ...rest }: ITokenConfig): TokenType => {
  const token = orgCreateToken({name, ...rest});
  T[name] = token;
  lessTokens.unshift(token);
  return token;
};

FRAGMENT('spaces', '[ \\t\\r\\n\\f]+')
FRAGMENT('h', '[\\da-f]', 'i')
FRAGMENT('unicode', '\\{{h}}{1,6}')
FRAGMENT('escape', '{{unicode}}|\\\\[^\\r\\n\\f0-9a-fA-F]')
FRAGMENT('nl', '\\n|\\r|\\f')
FRAGMENT('string1', '\\"([^\\n\\r\\f\\"]|{{nl}}|{{escape}})*\\"')
FRAGMENT('string2', "\\'([^\\n\\r\\f\\']|{{nl}}|{{escape}})*\\'")
FRAGMENT('nonascii', '[\\u0240-\\uffff]')
FRAGMENT('nmstart', '[_a-zA-Z]|{{nonascii}}|{{escape}}')
FRAGMENT('nmchar', '[_a-zA-Z0-9-]|{{nonascii}}|{{escape}}')
FRAGMENT('name', '({{nmchar}})+')
FRAGMENT('ident', '-?{{nmstart}}{{nmchar}}*')
FRAGMENT('interpolated', '({{ident}}|@{{{ident}}})+')
FRAGMENT('url', '([!#\\$%&*-~]|{{nonascii}}|{{escape}})*')

function MAKE_PATTERN(def: string, flags?: string) {
  return XRegExp.build(def, fragments, flags)
}

createToken({
  name: 'Comment',
  pattern: /\/\*[^*]*\*+([^/*][^*]*\*+)*\//,
  group: Lexer.SKIPPED
})

// Single characters
createToken({ name: 'Ampersand', pattern: '&' });
createToken({ name: 'Gt', pattern: '>' })
createToken({ name: 'Lt', pattern: '<' })
createToken({ name: 'LCurly', pattern: '{' });
createToken({ name: 'RCurly', pattern: '}' });
createToken({ name: 'LParen', pattern: '(' });
createToken({ name: 'RParen', pattern: ')' });
createToken({ name: 'LSquare', pattern: '[' })
createToken({ name: 'RSquare', pattern: ']' })
createToken({ name: 'SemiColon', pattern: ';' })
createToken({ name: 'Plus', pattern: '+' })
createToken({ name: 'Minus', pattern: '-' })
createToken({ name: 'Divide', pattern: /\.?\// })
createToken({ name: 'Comma', pattern: ',' })
createToken({ name: 'Colon', pattern: ':' })
createToken({
  name: 'AttrMatch',
  pattern: /[*~|^$]?=/
})
createToken({ name: 'Star', pattern: '*' })
createToken({ name: 'Eq', pattern: '=' })
createToken({ name: 'Tilde', pattern: '~' })
createToken({
  name: 'Unit',
  pattern: /(\d+|\d*\.\d+)([\w]+|%)?/
})

createToken({
  name: 'InterpolatedIdent',
  pattern: MAKE_PATTERN('{{interpolated}}')
})
createToken({
  name: 'Ident',
  pattern: MAKE_PATTERN('{{ident}}'),
  longer_alt: T.InterpolatedIdent
})

createToken({ name: 'PlusAssign', pattern: '+:' })
createToken({ name: 'UnderscoreAssign', pattern: '_:' })
createToken({ name: 'AttrFlag', pattern: /[is]/, longer_alt: T.Ident })
createToken({
  name: 'PseudoClass',
  pattern: MAKE_PATTERN('::?{{interpolated}}')
})
createToken({
  name: 'PseudoFunction',
  pattern: MAKE_PATTERN(':{{interpolated}}\\(')
})

// @todo, make extend just a function that receives a selector?
// Basically, an "in-place" selector visitor after tree flattening?
// Hmm, no that's backwards, because the args to extend are the selectors to visit
createToken({
  name: 'Extend',
  pattern: ':extend('
})
createToken({
  name: 'When',
  pattern: /when/,
  longer_alt: T.Ident
})
createToken({
  name: 'And',
  pattern: /and/,
  longer_alt: T.Ident
})
createToken({
  name: 'Or',
  pattern: /or/,
  longer_alt: T.Ident
})


createToken({ name: 'Uri', pattern: Lexer.NA })
createToken({
  name: 'UriString',
  pattern: MAKE_PATTERN(
      'url\\((:?{{spaces}})?({{string1}}|{{string2}})(:?{{spaces}})?\\)'
  ),
  categories: T.Uri
})
createToken({
  name: 'UriUrl',
  pattern: MAKE_PATTERN('url\\((:?{{spaces}})?{{url}}(:?{{spaces}})?\\)'),
  categories: T.Uri
})
createToken({
  name: 'StringLiteral',
  pattern: MAKE_PATTERN('{{string1}}|{{string2}}')
})
createToken({
  name: 'Important',
  pattern: /!important/
})

/** Ident variants */
createToken({
  name: 'Func',
  pattern: MAKE_PATTERN('{{ident}}\\(')
})
createToken({
  name: 'AtName',
  pattern: MAKE_PATTERN('@{{ident}}')
})

/** @todo - not a thing yet */
createToken({
  name: 'InterpolatedExprStart',
  pattern: /#{/
})
createToken({
  name: 'AtImport',
  pattern: /@import/,
  longer_alt: T.AtName
})
createToken({
  name: 'AtMedia',
  pattern: /@media/,
  longer_alt: T.AtName
})
createToken({
  name: 'AtPlugin',
  pattern: /@plugin/,
  longer_alt: T.AtName
})

createToken({
  name: 'ClassOrID',
  pattern: MAKE_PATTERN('[#.]{{interpolated}}')
})

/** Ignore BOM */
createToken({
  name: "UnicodeBOM",
  pattern: "\uFFFE",
  group: Lexer.SKIPPED
})

createToken({
  name: 'Whitespace',
  pattern: MAKE_PATTERN('{{spaces}}'),
  // The W3C specs are are defined in a whitespace sensitive manner.
  // But there is only **one** place where the grammar is truly whitespace sensitive.
  // So the whitespace sensitivity was implemented via a GATE in the selector rule.
  group: Lexer.SKIPPED
})

const LessLexer = new Lexer(lessTokens)

export { lessTokens, LessLexer, T }