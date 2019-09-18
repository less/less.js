import { ICstVisitor, IToken, IRecognitionException } from 'chevrotain'
import { CssRuleParser } from './cssRuleParser'

export interface CstVisitorInstance {
  new (...args: any[]): ICstVisitor<any, any>
}

export const CssStructureVisitor = (baseConstructor: CstVisitorInstance) => {
  return class extends baseConstructor {
    cssParser: CssRuleParser
    lexedTokens: IToken[]
    errors: IRecognitionException[]

    constructor(
      cssParser: CssRuleParser,
      lexedTokens: IToken[]
    ) {
      super()
      this.errors = []
      this.cssParser = cssParser
      this.lexedTokens = lexedTokens
      this.validateVisitor()
    }

    primary(ctx) {
      const { rule } = ctx
      if (rule) {
        this.visit(rule)
      }
    }

    rule(ctx) {
      const { atRule, componentValues, customPropertyRule } = ctx
      const parser = this.cssParser

      if (atRule) {
        this.visit(atRule)
      }

      if (componentValues) {
        const rule = componentValues[0]
        const { curlyBlock, colon, expressionList, property } = rule.children
        const { start, expressionEnd, propertyEnd } = rule.tokenRange
        parser.input = this.lexedTokens.slice(start, expressionEnd)
        
        /** Try parsing values as selectors */
        // @ts-ignore
        const selectors = parser.compoundSelectorList()
        if (selectors) {
          ctx[selectors.name] = selectors
        }

        if (curlyBlock) {
          this.visit(curlyBlock)
          const block = curlyBlock[0]
          if (selectors) {
            ctx.componentValues = undefined
            ctx[block.name] = block
          } else {
            /**
             * These errors may be meaningless, as it may be a valid component value.
             * This is really up to the implementation how they should be treated.
             */
            this.errors.concat(parser.errors)
          }
        }

        if (colon) {
          /** There's a root-level colon, so try to parse as a declaration */
          parser.input = this.lexedTokens.slice(start, propertyEnd)
          const node = parser.property()
          this.visit(expressionList)
          if (node) {
            rule.children.property['isValid'] = true
          } else {
            this.errors.concat(parser.errors)
          }
        }

        if (parser.errors.length !== 0) {
          /** Parse as a generic list of values & curly blocks */
          // @ts-ignore
          const node = parser.customExpressionList()
          if (node) {
            ctx.unknownRule = undefined
            ctx[node.name] = node
          } else {
            this.errors.concat(parser.errors)
          }
        }
      }
      if (customPropertyRule) {
        this.visit(customPropertyRule)
      }
      return ctx
    }

    atRule(ctx) {
      return ctx
    }

    componentValues(ctx) {
      return ctx
    }

    customPropertyRule(ctx) {
      return ctx
    }

    expressionList(ctx) {
      this.visit(ctx.expression)
      return ctx
    }

    expression(ctx) {
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

