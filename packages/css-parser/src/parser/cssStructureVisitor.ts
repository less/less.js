import { ICstVisitor, TokenType, IToken } from 'chevrotain'
import { CssRuleParser } from './cssRuleParser'
import { CstNodeTokenVector } from './cssStructureParser'
import { TokenMap } from '../util'

export interface CstVisitorInstance {
  new (...args: any[]): ICstVisitor<any, any>
}

export const CssStructureVisitor = (baseConstructor: CstVisitorInstance) => {
  return class extends baseConstructor {
    cssParser: CssRuleParser
    lexedTokens: IToken[]

    constructor(tokens: TokenType[], T: TokenMap, lexedTokens: IToken[]) {
      super()
      this.cssParser = new CssRuleParser(tokens, T)
      this.lexedTokens = lexedTokens
      this.validateVisitor()
    }

    primary(ctx) {
      const { atRule, unknownRule, customPropertyRule } = ctx
      const parser = this.cssParser

      if (atRule) {
        this.visit(atRule)
      }
      if (unknownRule) {
        unknownRule.forEach((rule: CstNodeTokenVector, i: number) => {
          const { curlyBlock, ident, colon } = rule.children
          if (curlyBlock) {
            const { start, end } = rule.tokenRange
            // const block = this.visit(curlyBlock)
            /** Parse as a qualified rule */
            parser.input = this.lexedTokens.slice(start, end)
            const node = parser.compoundSelectorList()
            if (parser.errors.length === 0) {
              // console.log(node)
            } else {
              console.log(parser.errors[0].message)
            }
          } else if (ident && colon) {
            const { start, end } = rule.tokenRange
            /** Parse as a declaration */
            parser.input = this.lexedTokens.slice(start, end)
            const node = parser.declaration()
            if (parser.errors.length === 0) {
              unknownRule[i] = node
            }
          }
        })
      }
      if (customPropertyRule) {
        this.visit(customPropertyRule)
      }
      return ctx
    }

    atRule(ctx) {
      return ctx
    }

    unknownRule(ctx) {
      return ctx
    }

    customPropertyRule(ctx) {
      return ctx
    }

    expressionList(ctx) {
      return ctx
    }

    curlyBlock(ctx) {
      this.visit(ctx.primary)
      return ctx
    }
  }
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

