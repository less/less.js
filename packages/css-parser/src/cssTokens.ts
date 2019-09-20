import { rawTokenConfig, LexerType } from './util';
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
  ['nmstart', '[_a-zA-Z]|{{nonascii}}|{{escape}}'],
  ['nmchar', '[_a-zA-Z0-9-]|{{nonascii}}|{{escape}}'],
  ['ident', '-?{{nmstart}}{{nmchar}}*'],

  /** Reference: https://www.w3.org/TR/css-syntax-3/#consume-url-token */
  ['url', '(?:[^(\'"]|{{escape}})*'],

  ['integer', '[+-]?\\d+'],
  /** Any number that's not simply an integer e.g. 1.1 or 1e+1 */
  ['number', '[+-]?(?:\\d*\\.\\d+(?:[eE][+-]\\d+)?|\\d+(?:[eE][+-]\\d+))']
]

/**
 * Anything that is not 'BlockMarker' will be parsed as a generic 'Value'
 */
export const Tokens: rawTokenConfig[] = [
  { name: 'Value', pattern: LexerType.NA },
  { name: 'NonIdent', pattern: LexerType.NA },
  { name: 'AtName', pattern: LexerType.NA },
  // This can match anything, so it must be given the lowest priority
  { name: 'Unknown', pattern: /[\u0000-\uffff]/ },
  { name: 'BlockMarker', pattern: LexerType.NA },
  { name: 'ListMarker', pattern: LexerType.NA },
  { name: 'CompareOperator', pattern: LexerType.NA },
  { name: 'Selector', pattern: LexerType.NA },
  { name: 'SelectorPart', pattern: LexerType.NA },
  { name: 'Color', pattern: LexerType.NA },
  { name: 'Function', pattern: LexerType.NA },
  { name: 'Assign', pattern: LexerType.NA },
  // TODO: can use string literals for simple patterns (e.g: /\)/ vs ')')
  { name: 'Gt', pattern: />/, categories: ['CompareOperator', 'SelectorPart'] },
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
  { name: 'AdditionOperator', pattern: LexerType.NA },
  { name: 'MultiplicationOperator', pattern: LexerType.NA },
  { name: 'Plus', pattern: /\+/, categories: ['AdditionOperator', 'SelectorPart'] },
  { name: 'Minus', pattern: /-/, categories: ['AdditionOperator'] },
  { name: 'Divide', pattern: /\//, categories: ['MultiplicationOperator'] },
  { name: 'Comma', pattern: /,/, categories: ['BlockMarker'] },
  { name: 'Colon', pattern: /:/, categories: ['BlockMarker', 'Assign'] },
  { name: 'AttrMatchOperator', pattern: LexerType.NA },
  // Some tokens have to appear after AttrMatch
  { name: 'Eq', pattern: /=/, categories: ['CompareOperator', 'AttrMatchOperator'] },
  { name: 'Star', pattern: /\*/, categories: ['MultiplicationOperator'] },
  { name: 'Tilde', pattern: /~/, categories: ['SelectorPart'] },
  /** Rare: a namespace combinator */
  { name: 'Pipe', pattern: /\|/, categories: ['SelectorPart'] },
  { name: 'AttrMatch', pattern: /[*~|^$]=/, categories: ['AttrMatchOperator'] },
  { name: 'Ident', pattern: LexerType.NA, categories: ['Selector'] },
  { name: 'PropertyName', pattern: LexerType.NA },

  /**
   * This is the only token outside of spec.
   * It's done to avoid parsing errors of common pre-processor stylesheets, since curly
   * blocks need such special handling.
   * 
   * Pre-processors will / can easily override this.
   */
  { name: 'Interpolated', pattern: /[#$@]{[^}]+}/ },


  { name: 'PlainIdent', pattern: '{{ident}}', categories: ['Ident', 'PropertyName'] },
  { name: 'CustomProperty', pattern: '--{{ident}}', categories: ['BlockMarker', 'PropertyName'] },
  { name: 'CDOToken', pattern: /<!--/, group: LexerType.SKIPPED },
  { name: 'CDCToken', pattern: /-->/, group: LexerType.SKIPPED },
  /** Ignore BOM */
  { name: 'UnicodeBOM', pattern: /\uFFFE/, group: LexerType.SKIPPED },
  { name: 'AttrFlag', pattern: /[is]/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'And', pattern: /and/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'Not', pattern: /not/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'Or', pattern: /or/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'Only', pattern: /only/, longer_alt: 'PlainIdent', categories: ['Ident'] },
  { name: 'PlainFunction', pattern: '{{ident}}\\(', categories: ['BlockMarker', 'Function'] },
  { name: 'AtKeyword', pattern: '@{{ident}}', categories: ['BlockMarker', 'AtName'] },
  { name: 'Uri', pattern: LexerType.NA },
  {
    name: 'UriString',
    pattern: 'url\\((:?{{ws}})?({{string1}}|{{string2}})(:?{{ws}})?\\)',
    line_breaks: true,
    categories: ['Uri']
  },
  {
    name: 'UriUrl',
    pattern: 'url\\((:?{{ws}})?{{url}}(:?{{ws}})?\\)',
    line_breaks: true,
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
    longer_alt: 'AtKeyword',
    categories: ['BlockMarker', 'AtName']
  },
  {
    name: 'AtMedia',
    pattern: /@media/,
    longer_alt: 'AtKeyword',
    categories: ['BlockMarker', 'AtName']
  },
  {
    name: 'UnicodeRange',
    pattern: /[uU]\+[0-9a-fA-F?]+(\-[0-9a-fA-F?]+)?/
  },
  {
    name: 'DotName',
    pattern: '\\.{{ident}}',
    categories: ['Selector']
  },
  {
    name: 'HashName',
    pattern: '#{{ident}}',
    categories: ['Selector']
  },

  // This is in the ClassOrId category because a value may get lexed as a color,
  // but will be intended as an ID selector. ONLY valid as ID if it doesn't start with a number
  {
    name: 'ColorIntStart',
    pattern: /#(?:(?:[0-9][0-9a-f]{7})|(?:[0-9][0-9a-f]{5})|(?:[0-9][0-9a-f]{2,3}))/i,
    categories: ['Color']
  },
  {
    name: 'ColorIdentStart',
    pattern: /#(?:(?:[a-f][0-9a-f]{7})|(?:[a-f][0-9a-f]{5})|(?:[a-f][0-9a-f]{2,3}))/i,
    longer_alt: 'HashName',
    categories: ['Color', 'Selector']
  },
  { name: 'Unit', pattern: LexerType.NA },
  { name: 'Dimension', pattern: LexerType.NA },
  /**
   * CSS syntax says we should identify integers as separate from numbers,
   * probably because there are parts of the syntax where one is allowed but not the other?
   */
  { name: 'Integer', pattern: LexerType.NA },
  { name: 'DimensionNum', pattern: '{{number}}(?:{{ident}}|%)', categories: ['Unit', 'Dimension'] },
  { name: 'DimensionInt', pattern: '{{integer}}(?:{{ident}}|%)', categories: ['Unit', 'Dimension', 'Integer'] },
  { name: 'SignedInt', pattern: /[+-]\d+/, longer_alt: 'DimensionInt', categories: ['Unit', 'Integer'] },
  { name: 'UnsignedInt', pattern: /\d+/, longer_alt: 'DimensionInt', categories: ['Unit', 'Integer'] },
  { name: 'Number', pattern: '{{number}}', longer_alt: 'DimensionNum', categories: ['Unit'] },
  { name: 'WS', pattern: '(?:{{ws}}|{{comment}})+', categories: ['BlockMarker'] },
  {
    name: 'Comment',
    pattern: '{{comment}}',
    line_breaks: true,
    group: LexerType.SKIPPED,
    longer_alt: 'WS'
  }
]
