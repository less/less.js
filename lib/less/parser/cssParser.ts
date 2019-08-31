
import { CstParser, EMPTY_ALT, TokenType, EOF } from 'chevrotain'
import { TokenMap } from './util'

export class CSSParser extends CstParser {
  T: TokenMap

  constructor(tokens: TokenType[], T: TokenMap) {
    super(tokens, {
      maxLookahead: 1
    })
    this.T = T
    this.performSelfAnalysis()
  }

  reset() {
    super.reset()
  }

    // Optional whitespace
  _ = this.RULE('_', () => {
    this.OPTION(() => this.CONSUME(this.T.WS))
  })

  primary = this.RULE('primary', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(this.T.WS) },
        { ALT: () => this.SUBRULE(this.atRule) },
        {
          IGNORE_AMBIGUITIES: true,
          ALT: () => this.SUBRULE(this.valueOrDeclarationList)
        }
      ])
    })
  })

  atRule = this.RULE('atRule', () => {
    this.CONSUME(this.T.AtKeyword)
    this.SUBRULE(this._)
    this.SUBRULE(this.valueList)
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(this.T.SemiColon) },
        { ALT: () => this.SUBRULE(this.curlyBlock) }
      ])
    })
  })

  // QualifiedRule = this.RULE('QualifiedRule', () => {
  //   /** @todo */
  // })

  curlyBlock = this.RULE('curlyBlock', () => {
    this.CONSUME(this.T.LCurly)
    this.SUBRULE(this.primary)
    this.CONSUME(this.T.RCurly)
  })

  block = this.RULE('block', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(this.T.LParen)
          this.SUBRULE(this.blockContents)
          this.CONSUME(this.T.RParen)
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.LSquare)
          this.SUBRULE2(this.blockContents)
          this.CONSUME(this.T.RSquare)
        }
      }
    ])
  })

  blockContents = this.RULE('blockContents', () => {
    this.MANY(() => {
      this.SUBRULE(this.valueOrDeclarationList)
    })
  })

  valueList = this.RULE('valueList', () => {
    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.anyValue) },
          { ALT: () => this.SUBRULE(this.block) },
          { ALT: () => EMPTY_ALT }
        ])
      }
    })
  })

  valueOrDeclarationList = this.RULE('valueOrDeclarationList', () => {
    this.SUBRULE(this.anyValueOrDeclaration)
    this.MANY(() => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(this.T.Comma)
            this.SUBRULE(this.valueList)
          }
        },
        { ALT: () => this.CONSUME(this.T.SemiColon) }
      ])
      this.SUBRULE2(this.anyValueOrDeclaration)
    })
    /** This production appears to be selector-like */
    this.OPTION(() => this.SUBRULE(this.curlyBlock))
  })

  anyValueOrDeclaration = this.RULE('anyValueOrDeclaration', () => {
    this.OR([
      {
        ALT: () => this.AT_LEAST_ONE(() => {
          this.CONSUME(this.T.Value)
        })
      },
      { ALT: () => this.SUBRULE(this.block) }
    ])

    this.OR2([
      {
        ALT: () => {
          this.CONSUME(this.T.Colon)
          this.MANY2(() => {
            this.CONSUME2(this.T.Value)
          })
        }
      },
      { ALT: () => EMPTY_ALT }
    ])
  })

  anyValue = this.RULE('anyValue', () => {
    this.AT_LEAST_ONE(() => {
      this.CONSUME(this.T.Value)
    })
  })

}

/**
 * @todo pseudo-code, parse loosely first, then more specifically for atrules / values
 */
// const mediaRuleParser = new MediaRuleParser();

// fuzzyDirective(ctx) {
//     const subVector = ctx.NotSemiColon
//     mediaRuleParser.input = subVector;
//     const structuredMediaRuleCst = mediaRuleParser.wellDefinedMediaRule();
//     if (mediaRuleParser.errors === 0) {
//         delete ctx.NotSemiColon
//         ctx.children[structuredMediaRuleCst.name] = [structuredMediaRuleCst]
//     // Are these errors in fact warnings to user?
//     } else {
//        ctx.unstructuredMediaRule = ctx.NotSemiColon
//        delete ctx.NotSemiColon
//     }
// }


