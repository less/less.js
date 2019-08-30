import { Lexer } from 'chevrotain'
import { Fragments as CSSFragments, Tokens as CSSTokens } from './cssTokens'
import { rawTokenConfig } from './lexer';

interface IMerges {
  [key: string]: rawTokenConfig[]
}

export const Fragments = [...CSSFragments]
export let Tokens = [{ name: 'Ampersand', pattern: /&/ }, ...CSSTokens]

Fragments.push(['lineComment', '\\/\\/[^\\n\\r]*'])
Fragments.push(['interpolated', '({{ident}}?@{[\w-]+}{{ident}}?)+'])

const merges: IMerges = {
  'Ident': [
    {
      name: 'Interpolated',
      pattern: Lexer.NA
    },
    {
      name: 'InterpolatedIdent',
      pattern: '{{interpolated}}',
      categories: ['Interpolated']
    }
  ],
  'PlainIdent': [
    { name: 'PlusAssign', pattern: /\+:/ },
    { name: 'UnderscoreAssign', pattern: /_:/ },
    {
      name: 'Extend',
      pattern: /:extend\(/
    },
    {
      name: 'When',
      pattern: /when/,
      longer_alt: 'PlainIdent',
      categories: ['Ident', 'Interpolated']
    },
    {
      name: 'VarOrProp',
      pattern: Lexer.NA
    },
    {
      name: 'NestedReference',
      pattern: '([@$]+{{ident}}?){2,}',
      categories: ['VarOrProp']
    },
    {
      name: 'PropertyReference',
      pattern: '\\${{ident}}',
      categories: ['VarOrProp']
    }
  ],
  'AtMedia': [
    {
      name: 'AtPlugin',
      pattern: /@plugin/,
      longer_alt: 'AtKeyword'
    }
  ],
  'Comment': [
    {
      name: 'LineComment',
      pattern: '{{lineComment}}',
      group: Lexer.SKIPPED,
      longer_alt: 'WS'
    }
  ]
}

let tokenLength = Tokens.length;
for (let i = 0; i < tokenLength; i++) {
  let token = Tokens[i]
  const copyToken = () => { token = {...token} }
  const { name } = token
  let alterations = true

  switch (name) {
    case 'Divide':
      copyToken()
      token.pattern = /\.?\//
      break
    case 'AtKeyword':
      copyToken()
      token.categories = ['VarOrProp']
      break
    case 'WS':
      copyToken()
      token.pattern = '({{ws}}|{{lineComment}}|{{comment}})+'
      break
    case 'Class':
      copyToken()
      token.pattern = '\\.{{interpolated}}'
      break
    case 'ID':
      copyToken()
      token.pattern = '#{{interpolated}}'
      break
    case 'PlainIdent':
    case 'AttrFlag':
    case 'AndOr':
    case 'Not':
    case 'Only':
      copyToken()
      token.categories = ['Ident', 'Interpolated']
      break
    default:
      alterations = false
  }
  if (alterations) {
    Tokens[i] = token
  }
  const merge = merges[name]
  if (merge) {
    /** Insert after current token */
    Tokens = Tokens.slice(0, i + 1).concat(merge, Tokens.slice(i + 1))
    const mergeLength = merge.length
    tokenLength += mergeLength
    i += mergeLength
  }
}
