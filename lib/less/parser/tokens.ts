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

type TokenKeys =
  'Ampersand' |
  'CompareOperator' |
  'Gt' |
  'Lt' |
  'GtEq' |
  'LtEq' |
  'LCurly' |
  'RCurly' |
  'LParen' |
  'RParen' |
  'LSquare' |
  'RSquare' |
  'SemiColon' |
  'AdditionOperator' |
  'MultiplicationOperator' |
  'Plus' |
  'Minus' |
  'Divide' |
  'Comma' |
  'Colon' |
  'AttrMatch' |
  'AttrMatchOperator' |
  'Eq' |
  'Star' |
  'Tilde' |
  'Pipe' |
  'InterpolatedIdent' |
  'Interpolated' |
  'Ident' |
  'PlainIdent' |
  'PlusAssign' |
  'UnderscoreAssign' |
  'AttrFlag' |
  'PseudoClass' |
  'PseudoFunction' |
  'Extend' |
  'When' |
  'And' |
  'Not' |
  'Only' |
  'Uri' |
  'UriString' |
  'UriUrl' |
  'StringLiteral' |
  'Important' |
  'Func' |
  'AtName' |
  // 'VariableAssignment' |
  'AtImport' |
  'AtMedia' |
  'AtPlugin' |
  'UnicodeRange' |
  'ClassOrId' |
  'Class' |
  'ID' |
  'Color' |
  'Unit' |
  'LineComment' |
  'BlockComment' |
  'UnicodeBOM' |
  'WS' |
  'AnyValue'

type TokenMap = {
  [key in TokenKeys]?: TokenType
}
const T: TokenMap = {};

const fragments: {
  [key: string]: RegExp;
} = {};

/**
 * @todo Maybe adapt the mini-DSL from:
 * https://github.com/bd82/toml-tools/blob/master/packages/lexer/lib/tokens.js#L13-L31 
 */
function FRAGMENT(name: string, def: string, flags?: string) {
  fragments[name] = XRegExp.build(def, fragments, flags);
}

const lessTokens: TokenType[] = [];

const createToken = ({ name, ...rest }: ITokenConfig & { name: keyof TokenMap }): TokenType => {
  const token = orgCreateToken({name, ...rest});
  T[name] = token;
  lessTokens.unshift(token);
  return token;
};

FRAGMENT('newline', '\\n|\\r\\n?|\\f');
FRAGMENT('ws', '[ ]|\\t|{{newline}}');
FRAGMENT('spaces', '{{ws}}+')
FRAGMENT('blockComment', '\\/\\*[^*]*\\*+([^/*][^*]*\\*+)*\\/')
FRAGMENT('lineComment', '\\/\\/[^\\n\\r]*') // include?: (\\r\\n|\\r\\n)?  
FRAGMENT('h', '[\\da-fA-F]')
FRAGMENT('unicode', '\\\\{{h}}{1,6}{{ws}}?')
FRAGMENT('escape', '{{unicode}}|\\\\[^\\r\\n\\f0-9a-fA-F]')
FRAGMENT('string1', '\\"([^\\n\\r\\f\\"]|{{newline}}|{{escape}})*\\"')
FRAGMENT('string2', "\\'([^\\n\\r\\f\\']|{{newline}}|{{escape}})*\\'")
FRAGMENT('nonascii', '[\\u0240-\\uffff]')
FRAGMENT('nmstart', '[_a-zA-Z]|{{nonascii}}|{{escape}}')
FRAGMENT('nmchar', '[_a-zA-Z0-9-]|{{nonascii}}|{{escape}}')
FRAGMENT('name', '{{nmchar}}+')
FRAGMENT('ident', '-{0,2}{{nmstart}}{{nmchar}}*')
FRAGMENT('interpolated', '({{ident}}|@{[\w-]+})+')
FRAGMENT('url', '([!#\\$%&*-~]|{{nonascii}}|{{escape}})*')

function MAKE_PATTERN(def: string, flags?: string) {
  return XRegExp.build(def, fragments, flags)
}

createToken({
  name: 'AnyValue',
  pattern: Lexer.NA
})
// Single characters
createToken({ name: 'Ampersand', pattern: '&' });

createToken({ name: 'CompareOperator', pattern: Lexer.NA });
createToken({ name: 'Gt', pattern: '>', categories: [T.CompareOperator] })
createToken({ name: 'Lt', pattern: '<', categories: [T.CompareOperator] })
createToken({ name: 'GtEq', pattern: '>=', categories: [T.CompareOperator] })
createToken({ name: 'LtEq', pattern: '<=', categories: [T.CompareOperator] })

createToken({ name: 'LCurly', pattern: '{' });
createToken({ name: 'RCurly', pattern: '}' });
createToken({ name: 'LParen', pattern: '(' });
createToken({ name: 'RParen', pattern: ')' });
createToken({ name: 'LSquare', pattern: '[' })
createToken({ name: 'RSquare', pattern: ']' })

createToken({ name: 'SemiColon', pattern: ';' })

createToken({ name: 'AdditionOperator', pattern: Lexer.NA });
createToken({ name: 'MultiplicationOperator', pattern: Lexer.NA });
createToken({ name: 'Plus', pattern: '+', categories: [T.AdditionOperator] })
createToken({ name: 'Minus', pattern: '-', categories: [T.AdditionOperator] })

createToken({ name: 'Divide', pattern: /\.?\//, categories: [T.MultiplicationOperator] })
createToken({ name: 'Comma', pattern: ',' })
createToken({ name: 'Colon', pattern: ':' })
createToken({
  name: 'AttrMatchOperator',
  pattern: Lexer.NA
})
// Some tokens have to appear after AttrMatch
createToken({ name: 'Eq', pattern: '=', categories: [T.CompareOperator, T.AttrMatchOperator] })
createToken({ name: 'Star', pattern: '*', categories: [T.MultiplicationOperator] })
createToken({ name: 'Tilde', pattern: '~' })
/** Rare: a namespace combinator */
createToken({ name: 'Pipe', pattern: '|' })

createToken({
  name: 'AttrMatch',
  pattern: /[*~|^$]=/,
  categories: [T.AttrMatchOperator]
})

createToken({
  name: 'InterpolatedIdent',
  pattern: Lexer.NA
})
createToken({
  name: 'Interpolated',
  pattern: MAKE_PATTERN('{{interpolated}}')
})
createToken({
  name: 'Ident',
  pattern: Lexer.NA
})
createToken({
  name: 'PlainIdent',
  pattern: MAKE_PATTERN('{{ident}}'),
  longer_alt: T.Interpolated,
  categories: [T.Ident, T.InterpolatedIdent]
})

createToken({ name: 'PlusAssign', pattern: '+:' })
createToken({ name: 'UnderscoreAssign', pattern: '_:' })
createToken({
  name: 'AttrFlag',
  pattern: /[is]/,
  longer_alt: T.PlainIdent,
  categories: [T.Ident, T.InterpolatedIdent]
})
// createToken({
//   name: 'PseudoClass',
//   pattern: MAKE_PATTERN('::?{{interpolated}}')
// })
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
  longer_alt: T.PlainIdent,
  categories: [T.Ident, T.InterpolatedIdent]
})
createToken({
  name: 'And',
  pattern: /and|or/,
  longer_alt: T.PlainIdent,
  categories: [T.Ident, T.InterpolatedIdent]
})
// createToken({
//   name: 'Or',
//   pattern: /or/,
//   longer_alt: T.PlainIdent,
//   categories: [T.Ident]
// })
createToken({
  name: 'Not',
  pattern: /not/,
  longer_alt: T.PlainIdent,
  categories: [T.Ident, T.InterpolatedIdent]
})
createToken({
  name: 'Only',
  pattern: /only/,
  longer_alt: T.PlainIdent,
  categories: [T.Ident, T.InterpolatedIdent]
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
  pattern: MAKE_PATTERN('~?({{string1}}|{{string2}})')
})
createToken({
  name: 'Important',
  pattern: /!important/
})

/** @todo - not a thing yet */
// createToken({
//   name: 'InterpolatedExprStart',
//   pattern: /#{/
// })
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
  name: 'UnicodeRange',
  pattern: /[uU]\+[0-9a-fA-F?]+(\-[0-9a-fA-F?]+)?/
})

createToken({
  name: 'ClassOrId',
  pattern: Lexer.NA
})

createToken({
  name: 'Class',
  pattern: MAKE_PATTERN('\\.{{interpolated}}'),
  categories: [T.ClassOrId]
})

createToken({
  name: 'ID',
  pattern: MAKE_PATTERN('#{{interpolated}}'),
  categories: [T.ClassOrId]
})

// This is in the ClassOrId category because a value may get lexed as a color,
// but will be intended as an ID selector
createToken({
  name: 'Color',
  pattern: /#(?:(?:[\da-f]{8})|(?:[\da-f]{6})|(?:[\da-f]{3,4}))/i,
  longer_alt: T.ID,
  categories: [T.ClassOrId]
})

createToken({
  name: 'Unit',
  pattern: /[-+]?(\d*\.\d+|\d+)([\w]+|%)?/
})

createToken({
  name: 'WS',
  pattern: MAKE_PATTERN('({{spaces}}|{{lineComment}}|{{blockComment}})+')
})

createToken({
  name: 'LineComment',
  pattern: MAKE_PATTERN('{{lineComment}}'),
  group: Lexer.SKIPPED,
  longer_alt: T.WS
})

createToken({
  name: 'BlockComment',
  pattern: MAKE_PATTERN('{{blockComment}}'),
  line_breaks: true,
  group: Lexer.SKIPPED,
  longer_alt: T.WS
})

/** Ignore BOM */
createToken({
  name: 'UnicodeBOM',
  pattern: '\uFFFE',
  group: Lexer.SKIPPED
})

const LessLexer = new Lexer(lessTokens)

export { lessTokens, LessLexer, T }