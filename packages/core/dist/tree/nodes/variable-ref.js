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
var function_call_1 = require("./function-call");
/**
 * this.value might contain another variable ref (nested vars)
 */
var VariableRef = /** @class */ (function (_super) {
    __extends(VariableRef, _super);
    function VariableRef() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VariableRef.prototype.eval = function (context) {
        _super.prototype.eval.call(this, context);
        if (this.evaluating) {
            throw {
                type: 'Name',
                message: "Recursive variable definition for " + this.name,
                filename: this.fileRoot.fileInfo.filename,
                location: this.location
            };
        }
        this.name = this.values.join('');
        this.evaluating = true;
        var variable = this.find(context.frames, function (frame) {
            var v = frame.variable(name);
            if (v) {
                if (v.important) {
                    var importantScope = context.importantScope[context.importantScope.length - 1];
                    importantScope.important = v.important;
                }
                // If in calc, wrap vars in a function call to cascade evaluate args first
                if (context.inCalc) {
                    return (new function_call_1.default('_SELF', [v.value])).eval(context);
                }
                else {
                    return v.value.eval(context);
                }
            }
        });
        if (variable) {
            this.evaluating = false;
            return variable;
        }
        else {
            throw { type: 'Name',
                message: "variable " + name + " is undefined",
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }
    };
    VariableRef.prototype.find = function (obj, fun) {
        for (var i = 0, r = void 0; i < obj.length; i++) {
            r = fun.call(obj, obj[i]);
            if (r) {
                return r;
            }
        }
        return null;
    };
    return VariableRef;
}(node_1.default));
Variable.prototype.type = 'Variable';
exports.default = Variable;
//# sourceMappingURL=variable-ref.js.map