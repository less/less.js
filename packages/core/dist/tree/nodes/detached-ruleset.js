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
var contexts_1 = require("../contexts");
var utils = require("../utils");
/**
 * @todo - remove and merge with ruleset
 */
var DetachedRuleset = /** @class */ (function (_super) {
    __extends(DetachedRuleset, _super);
    function DetachedRuleset(ruleset, frames) {
        var _this = _super.call(this) || this;
        _this.ruleset = ruleset;
        _this.frames = frames;
        _this.setParent(_this.ruleset, _this);
        return _this;
    }
    DetachedRuleset.prototype.accept = function (visitor) {
        this.ruleset = visitor.visit(this.ruleset);
    };
    DetachedRuleset.prototype.eval = function (context) {
        var frames = this.frames || utils.copyArray(context.frames);
        return new DetachedRuleset(this.ruleset, frames);
    };
    DetachedRuleset.prototype.callEval = function (context) {
        return this.ruleset.eval(this.frames ? new contexts_1.default.Eval(context, this.frames.concat(context.frames)) : context);
    };
    return DetachedRuleset;
}(node_1.default));
DetachedRuleset.prototype.type = 'DetachedRuleset';
DetachedRuleset.prototype.evalFirst = true;
exports.default = DetachedRuleset;
//# sourceMappingURL=detached-ruleset.js.map