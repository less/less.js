import { Lexer } from 'chevrotain'
import { rawTokenConfig } from './lexer';
/**
 * references:
 * https://github.com/antlr/grammars-v4/blob/master/css3/css3.g4
 * https://www.lifewire.com/css2-vs-css3-3466978
 * https://www.w3.org/TR/css-syntax-3/
 *
 * Fragments and Tokens must be defined in order
 * ({{references}} must follow definitions) 
 */
export const Fragments: string[][] = [
  ['newline', '\\n|\\r\\n?|\\f'],
  ['whitespace', '[ ]|\\t|{{newline}}'],
  ['ws', '{{whitespace}}+'],
  ['comment', '\\/\\*[^*]*\\*+([^/*][^*]*\\*+)*\\/'],
  ['hex', '[\\da-fA-F]'],
  ['unicode', '\\\\{{hex}}{1,6}{{whitespace}}?'],
  ['escape', '{{unicode}}|\\\\[^\\r\\n\\f0-9a-fA-F]'],
  ['string1', '\\"([^\\n\\r\\f\\"]|{{newline}}|{{escape}})*\\"'],
  ['string2', "\\'([^\\n\\r\\f\\']|{{newline}}|{{escape}})*\\'"],
  ['nonascii', '[\\u0240-\\uffff]'],
  ['nmstart', '--|[_a-zA-Z-]|{{nonascii}}|{{escape}}'],
  ['nmchar', '[_a-zA-Z0-9-]|{{nonascii}}|{{escape}}'],
  ['ident', '{{nmstart}}{{nmchar}}+'],
  ['url', '([!#\\$%&*-~]|{{nonascii}}|{{escape}})*'],
  ['number', '[+-]?(?:\\d*\\.\\d+|\\d+)(?:[eE][+-]\d+)?'],
]

export const Tokens: rawTokenConfig[] = [
  { name: 'Value', pattern: Lexer.NA },
  { name: 'BlockMarker', pattern: Lexer.NA },
  { name: 'AnyValue', pattern: /./ },
  { name: 'CompareOperator', pattern: Lexer.NA },
  { name: 'Gt', pattern: />/, categories: ['CompareOperator'] },
  { name: 'Lt', pattern: /</, categories: ['CompareOperator'] },
  { name: 'GtEq', pattern: />=/, categories: ['CompareOperator'] },
  { name: 'LtEq', pattern: /<=/, categories: ['CompareOperator'] },
  { name: 'LCurly', pattern: /{/, categories: ['BlockMarker'] },
  { name: 'RCurly', pattern: /}/, categories: ['BlockMarker'] },
  { name: 'LParen', pattern: /\(/, categories: ['BlockMarker'] },
  { name: 'RParen', pattern: /\)/, categories: ['BlockMarker'] },
  { name: 'LSquare', pattern: /\[/, categories: ['BlockMarker'] },
  { name: 'RSquare', pattern: /\]/, categories: ['BlockMarker'] },
  { name: 'SemiColon', pattern: /;/, categories: ['BlockMarker'] },
  { name: 'AdditionOperator', pattern: Lexer.NA },
  { name: 'MultiplicationOperator', pattern: Lexer.NA },
  { name: 'Plus', pattern: /\+/, categories: ['AdditionOperator'] },
  { name: 'Minus', pattern: /-/, categories: ['AdditionOperator'] },
  { name: 'Divide', pattern: /\//, categories: ['MultiplicationOperator'] },
  { name: 'Comma', pattern: /,/ },
  { name: 'Colon', pattern: /:/ },
  { name: 'AttrMatchOperator', pattern: Lexer.NA },
  // Some tokens have to appear after AttrMatch
  { name: 'Eq', pattern: /=/, categories: ['CompareOperator', 'AttrMatchOperator'] },
  { name: 'Star', pattern: /\*/, categories: ['MultiplicationOperator'] },
  { name: 'Tilde', pattern: /~/ },
  /** Rare: a namespace combinator */
  { name: 'Pipe', pattern: /\|/ },
  { name: 'AttrMatch', pattern: /[*~|^$]=/, categories: ['AttrMatchOperator'] },
  { name: 'Ident', pattern: Lexer.NA },
  { name: 'PlainIdent', pattern: '{{ident}}' },
  { name: 'AttrFlag', pattern: /[is]/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'And', pattern: /and/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'Or', pattern: /or/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'Not', pattern: /not/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'Only', pattern: /only/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'Function', pattern: '{{ident}}\\(' },
  { name: 'AtKeyword', pattern: '@{{ident}}' },
  { name: 'Uri', pattern: Lexer.NA },
  {
    name: 'UriString',
    pattern: 'url\\((:?{{ws}})?({{string1}}|{{string2}})(:?{{ws}})?\\)',
    categories: ['Uri']
  },
  {
    name: 'UriUrl',
    pattern: 'url\\((:?{{ws}})?{{url}}(:?{{ws}})?\\)',
    categories: ['Uri']
  },
  {
    name: 'StringLiteral',
    pattern: '{{string1}}|{{string2}}'
  },
  {
    name: 'Important',
    pattern: '!{{ws}}important'
  },
  {
    name: 'AtImport',
    pattern: /@import/,
    longer_alt: 'AtKeyword'
  },
  {
    name: 'AtMedia',
    pattern: /@media/,
    longer_alt: 'AtKeyword'
  },
  {
    name: 'UnicodeRange',
    pattern: /[uU]\+[0-9a-fA-F?]+(\-[0-9a-fA-F?]+)?/
  },
  {
    name: 'ClassOrId',
    pattern: Lexer.NA
  },
  {
    name: 'Class',
    pattern: '\\.{{ident}}',
    categories: ['ClassOrId']
  },
  {
    name: 'ID',
    pattern: '#{{ident}}',
    categories: ['ClassOrId']
  },

  // This is in the ClassOrId category because a value may get lexed as a color,
  // but will be intended as an ID selector
  {
    name: 'Color',
    pattern: /#(?:(?:[\da-f]{8})|(?:[\da-f]{6})|(?:[\da-f]{3,4}))/i,
    longer_alt: 'ID',
    categories: ['ClassOrId']
  },
  { name: 'Unit', pattern: Lexer.NA },
  { name: 'Number', pattern: '{{number}}', categories: ['Unit'] },
  { name: 'Dimension', pattern: '{{number}}{{ident}}', categories: ['Unit'] },
  { name: 'Percentage', pattern: '{{number}}%', categories: ['Unit'] },
  { name: 'Integer', pattern: /[+-]?\d+/, longer_alt: 'Number', categories: ['Unit'] },
  { name: 'WS', pattern: '(?:{{ws}}|{{comment}})+' },
  {
    name: 'Comment',
    pattern: '{{comment}}',
    line_breaks: true,
    group: Lexer.SKIPPED,
    longer_alt: 'WS'
  },

  /** Ignore BOM */
  {
    name: 'UnicodeBOM',
    pattern: /\uFFFE/,
    group: Lexer.SKIPPED
  }
]
