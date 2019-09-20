import {
  Lexer,
  createToken,
  ITokenConfig,
  TokenType,
  TokenPattern
} from 'chevrotain'

// TODO: get rid of xRegExp dep
import * as XRegExp from 'xregexp'

export enum LexerType {
  NA,
  SKIPPED
}

export interface TokenMap {
  [key: string]: TokenType
}

export interface rawTokenConfig extends Omit<ITokenConfig, 'longer_alt' | 'categories' | 'pattern' | 'group'> {
  pattern: TokenPattern | LexerType
  group?: ITokenConfig['group'] | LexerType
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
    let { name, pattern, longer_alt, categories, group, ...rest } = rawToken
    let regExpPattern: RegExp
    if (pattern !== LexerType.NA) {
      const category = !categories || categories[0]
      if (!category || (group !== LexerType.SKIPPED && category !== 'BlockMarker')) {
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
          regExpPattern = XRegExp.build(<string>pattern, fragments)
      }
      else {
        regExpPattern = pattern
      }
    } else {
      regExpPattern = Lexer.NA
    }

    const longerAlt = longer_alt ? { longer_alt: T[longer_alt] } : {}
    const groupValue = group === LexerType.SKIPPED ? { group: Lexer.SKIPPED } : (group ? { group: <string>group } : {})
    const tokenCategories = categories ? { categories: categories.map(category => {
      return T[category]
    }) } : {}
    const token = createToken({
      name,
      pattern: regExpPattern,
      ...longerAlt,
      ...groupValue,
      ...tokenCategories,
      ...rest
    })
    T[name] = token
    /** Build tokens from bottom to top */
    tokens.unshift(token);
  })

  // Lexer initialization time can be reduced (~30%) by explicitly providing the link_break option for all Tokens
  // https://sap.github.io/chevrotain/documentation/6_5_0/interfaces/itokenconfig.html#line_breaks
  const lexer = new Lexer(tokens, {
    ensureOptimizations: true,
    // traceInitPerf: true,
    // Always run the validations during testing (dev flows).
    // And avoid validation during productive flows to reduce the Lexer's startup time.
    skipValidations: process.env["LESS_TESTING_MODE"] !== "true"
  })

  return {
    lexer,
    tokens,
    T
  }
}
