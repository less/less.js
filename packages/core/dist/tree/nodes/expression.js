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
var node_1 = require("../node");
var block_1 = require("./block");
var comment_1 = require("./comment");
var dimension_1 = require("./dimension");
var constants_1 = require("../../constants");
/**
 * An expression is a value that collapses blocks after evaluation
 */
var Expression = /** @class */ (function (_super) {
    __extends(Expression, _super);
    function Expression() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Expression.prototype.eval = function (context) {
        var _a = this.options, inBlock = _a.inBlock, blockInOp = _a.blockInOp;
        var returnValue;
        var mathOn = context.isMathOn();
        var inParenthesis = inBlock &&
            (context.options.math !== constants_1.MathMode.STRICT_LEGACY || !blockInOp);
        var doubleParen = false;
        if (inParenthesis) {
            context.enterBlock();
        }
        if (this.value.length > 1) {
            returnValue = _super.prototype.eval.call(this, context);
        }
        else if (this.value.length === 1) {
            var value = this.value[0];
            if (value instanceof Expression &&
                value.options.inBlock &&
                value.options.blockInOp &&
                !context.inCalc) {
                doubleParen = true;
            }
            returnValue = value.eval(context);
        }
        else {
            returnValue = this;
        }
        if (inParenthesis) {
            context.exitBlock();
        }
        if (inBlock && blockInOp && !mathOn && !doubleParen
            && (!(returnValue instanceof dimension_1.default))) {
            returnValue = new block_1.default(returnValue, {}, this.location);
        }
        return returnValue;
    };
    Expression.prototype.throwAwayComments = function () {
        this.value = this.value.filter(function (v) { return !(v instanceof comment_1.default); });
    };
    return Expression;
}(node_1.default));
Expression.prototype.type = 'Expression';
exports.default = Expression;
//# sourceMappingURL=expression.js.map