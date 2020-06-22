"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var expression_1 = __importDefault(require("../tree/expression"));
var functionCaller = /** @class */ (function () {
    function functionCaller(name, context, index, currentFileInfo) {
        this.name = name.toLowerCase();
        this.index = index;
        this.context = context;
        this.currentFileInfo = currentFileInfo;
        this.func = context.frames[0].functionRegistry.get(this.name);
    }
    functionCaller.prototype.isValid = function () {
        return Boolean(this.func);
    };
    functionCaller.prototype.call = function (args) {
        // This code is terrible and should be replaced as per this issue...
        // https://github.com/less/less.js/issues/2477
        if (Array.isArray(args)) {
            args = args.filter(function (item) {
                if (item.type === 'Comment') {
                    return false;
                }
                return true;
            })
                .map(function (item) {
                if (item.type === 'Expression') {
                    var subNodes = item.value.filter(function (item) {
                        if (item.type === 'Comment') {
                            return false;
                        }
                        return true;
                    });
                    if (subNodes.length === 1) {
                        return subNodes[0];
                    }
                    else {
                        return new expression_1.default(subNodes);
                    }
                }
                return item;
            });
        }
        return this.func.apply(this, args);
    };
    return functionCaller;
}());
exports.default = functionCaller;
//# sourceMappingURL=function-caller.js.map