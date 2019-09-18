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
var value_1 = require("./value");
/**
 * Will merge props using space or comma separators
 */
var MergeType;
(function (MergeType) {
    MergeType[MergeType["SPACED"] = 0] = "SPACED";
    MergeType[MergeType["COMMA"] = 1] = "COMMA";
})(MergeType = exports.MergeType || (exports.MergeType = {}));
var Declaration = /** @class */ (function (_super) {
    __extends(Declaration, _super);
    function Declaration() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Declaration.prototype.eval = function (context) {
        context.importantScope.push({});
        this.processNodeArray(this.values, function (node) { return node.eval(context); });
        var important = this.children.important[0];
        var importantResult = context.importantScope.pop();
        if (!important && importantResult.important) {
            important.text = importantResult.important;
        }
        return _super.prototype.clone.call(this, context);
    };
    Declaration.prototype.makeImportant = function () {
        var decl = this.clone();
        decl.children.important = [new value_1.default('!important')];
        return decl;
    };
    return Declaration;
}(node_1.default));
Declaration.prototype.type = 'Declaration';
exports.default = Declaration;
//# sourceMappingURL=declaration.js.map