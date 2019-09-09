import {
  Lexer,
  createToken,
  ITokenConfig,
  TokenType
} from 'chevrotain'

import * as XRegExp from 'xregexp'
import { EmbeddedActionsParser } from 'chevrotain';

export interface TokenMap {
  [key: string]: TokenType
}

export interface rawTokenConfig extends Omit<ITokenConfig, 'longer_alt' | 'categories'> {
  longer_alt?: string;
  categories?: string[];
}

interface ILexer {
  T: TokenMap
  lexer: Lexer
  tokens: TokenType[]
}

export const createLexer = (rawFragments: string[][], rawTokens: rawTokenConfig[]): ILexer => {
  const fragments: {
    [key: string]: RegExp;
  } = {};
  const T: TokenMap = {};
  const tokens: TokenType[] = [];

  /** Build fragment replacements */
  rawFragments.forEach(fragment => {
    fragments[fragment[0]] = XRegExp.build(fragment[1], fragments)
  })
  rawTokens.forEach((rawToken: rawTokenConfig) => {
    let { name, pattern, longer_alt, categories, ...rest } = rawToken

    if (pattern !== Lexer.NA) {
      const category = !categories || categories[0]
      if (!category || (rest.group !== Lexer.SKIPPED && category !== 'BlockMarker')) {
        if (categories) {
          categories.push('Value')
        } else {
          categories = ['Value']
        }
        if (category !== 'Ident') {
          categories.push('NonIdent')
        }
      }
      if(!(pattern instanceof RegExp)) {
        pattern = XRegExp.build(pattern as string, fragments)
      }
    }
    const longerAlt = longer_alt ? { longer_alt: T[longer_alt] } : {}
    const tokenCategories = categories ? { categories: categories.map(category => {
      return T[category]
    }) } : {}
    const token = createToken({
      name,
      pattern,
      ...longerAlt,
      ...tokenCategories,
      ...rest
    })
    T[name] = token
    /** Build tokens from bottom to top */
    tokens.unshift(token);
  })
  return {
    lexer: new Lexer(tokens),
    tokens,
    T
  }
}

interface IEmbeddedActionsParser extends EmbeddedActionsParser {
  primary(): void
}

type CssParser = {
  new(tokens: TokenType[], T: TokenMap): IEmbeddedActionsParser
}

export const createParser = (Parser: CssParser, rawFragments: string[][], rawTokens: rawTokenConfig[]) => {
  const { lexer, tokens, T } = createLexer(rawFragments, rawTokens)

  const parser = new Parser(tokens, T)

  return {
    parser,
    lexer,
    tokens,
    T,
    parse (text: string) {
      const lexResult = lexer.tokenize(text)
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
    }
  }
  
}
