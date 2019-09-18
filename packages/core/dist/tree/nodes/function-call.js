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
var function_caller_1 = require("../functions/function-caller");
//
// A function call node.
//
var FunctionCall = /** @class */ (function (_super) {
    __extends(FunctionCall, _super);
    function FunctionCall(name, args, index, currentFileInfo) {
        var _this = _super.call(this) || this;
        _this.name = name;
        _this.args = args;
        _this.calc = name === 'calc';
        _this._index = index;
        _this._fileInfo = currentFileInfo;
        return _this;
    }
    FunctionCall.prototype.accept = function (visitor) {
        if (this.args) {
            this.args = visitor.visitArray(this.args);
        }
    };
    //
    // When evaluating a function call,
    // we either find the function in the functionRegistry,
    // in which case we call it, passing the  evaluated arguments,
    // if this returns null or we cannot find the function, we
    // simply print it out as it appeared originally [2].
    //
    // The reason why we evaluate the arguments, is in the case where
    // we try to pass a variable to a function, like: `saturate(@color)`.
    // The function should receive the value, not the variable.
    //
    FunctionCall.prototype.eval = function (context) {
        /**
         * Turn off math for calc(), and switch back on for evaluating nested functions
         */
        var currentMathContext = context.mathOn;
        context.mathOn = !this.calc;
        if (this.calc || context.inCalc) {
            context.enterCalc();
        }
        var args = this.args.map(function (a) { return a.eval(context); });
        if (this.calc || context.inCalc) {
            context.exitCalc();
        }
        context.mathOn = currentMathContext;
        var result;
        var funcCaller = new function_caller_1.default(this.name, context, this.getIndex(), this.fileInfo());
        if (funcCaller.isValid()) {
            try {
                result = funcCaller.call(args);
            }
            catch (e) {
                throw {
                    type: e.type || 'Runtime',
                    message: "error evaluating function `" + this.name + "`" + (e.message ? ": " + e.message : ''),
                    index: this.getIndex(),
                    filename: this.fileInfo().filename,
                    line: e.lineNumber,
                    column: e.columnNumber
                };
            }
            if (result !== null && result !== undefined) {
                // Results that that are not nodes are cast as Anonymous nodes
                // Falsy values or booleans are returned as empty nodes
                if (!(result instanceof node_1.default)) {
                    if (!result || result === true) {
                        result = new Anonymous(null);
                    }
                    else {
                        result = new Anonymous(result.toString());
                    }
                }
                result._index = this._index;
                result._fileInfo = this._fileInfo;
                return result;
            }
        }
        return new Call(this.name, args, this.getIndex(), this.fileInfo());
    };
    FunctionCall.prototype.genCSS = function (context, output) {
        output.add(this.name + "(", this.fileInfo(), this.getIndex());
        for (var i = 0; i < this.args.length; i++) {
            this.args[i].genCSS(context, output);
            if (i + 1 < this.args.length) {
                output.add(', ');
            }
        }
        output.add(')');
    };
    return FunctionCall;
}(node_1.default));
FunctionCall.prototype.type = 'FunctionCall';
exports.default = FunctionCall;
//# sourceMappingURL=function-call.js.map