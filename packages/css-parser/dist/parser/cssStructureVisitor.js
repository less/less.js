"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CssStructureVisitor = function (baseConstructor) {
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1(cssParser, lexedTokens) {
            var _this = _super.call(this) || this;
            _this.errors = [];
            _this.cssParser = cssParser;
            _this.lexedTokens = lexedTokens;
            _this.validateVisitor();
            return _this;
        }
        class_1.prototype.primary = function (ctx) {
            var rule = ctx.rule;
            if (rule) {
                this.visit(rule);
            }
        };
        class_1.prototype.rule = function (ctx) {
            var atRule = ctx.atRule, componentValues = ctx.componentValues, customPropertyRule = ctx.customPropertyRule;
            var parser = this.cssParser;
            if (atRule) {
                this.visit(atRule);
            }
            if (componentValues) {
                var rule = componentValues[0];
                var _a = rule.children, curlyBlock = _a.curlyBlock, colon = _a.colon, expressionList = _a.expressionList, property = _a.property;
                var _b = rule.tokenRange, start = _b.start, expressionEnd = _b.expressionEnd, propertyEnd = _b.propertyEnd;
                parser.input = this.lexedTokens.slice(start, expressionEnd);
                /** Try parsing values as selectors */
                var selectors = parser.compoundSelectorList();
                if (selectors) {
                    ctx[selectors.name] = selectors;
                }
                if (curlyBlock) {
                    this.visit(curlyBlock);
                    var block = curlyBlock[0];
                    if (selectors) {
                        ctx.componentValues = undefined;
                        ctx[block.name] = block;
                    }
                    else {
                        /**
                         * These errors may be meaningless, as it may be a valid component value.
                         * This is really up to the implementation how they should be treated.
                         */
                        this.errors.concat(parser.errors);
                    }
                }
                if (colon) {
                    /** There's a root-level colon, so try to parse as a declaration */
                    parser.input = this.lexedTokens.slice(start, propertyEnd);
                    var node = parser.property();
                    this.visit(expressionList);
                    if (node) {
                        rule.children.property['isValid'] = true;
                    }
                    else {
                        this.errors.concat(parser.errors);
                    }
                }
                if (parser.errors.length !== 0) {
                    /** Parse as a generic list of values & curly blocks */
                    var node = parser.customExpressionList();
                    if (node) {
                        ctx.unknownRule = undefined;
                        ctx[node.name] = node;
                    }
                    else {
                        this.errors.concat(parser.errors);
                    }
                }
            }
            if (customPropertyRule) {
                this.visit(customPropertyRule);
            }
            return ctx;
        };
        class_1.prototype.atRule = function (ctx) {
            return ctx;
        };
        class_1.prototype.componentValues = function (ctx) {
            return ctx;
        };
        class_1.prototype.customPropertyRule = function (ctx) {
            return ctx;
        };
        class_1.prototype.expressionList = function (ctx) {
            this.visit(ctx.expression);
            return ctx;
        };
        class_1.prototype.expression = function (ctx) {
            return ctx;
        };
        class_1.prototype.curlyBlock = function (ctx) {
            this.visit(ctx.primary);
            return ctx;
        };
        return class_1;
    }(baseConstructor));
};
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
//# sourceMappingURL=cssStructureVisitor.js.map