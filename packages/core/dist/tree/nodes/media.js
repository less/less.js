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
var ruleset_1 = require("./ruleset");
var list_1 = require("./list");
var selector_1 = require("./selector");
var generic_1 = require("./generic");
var expression_1 = require("./expression");
var atrule_1 = require("./atrule");
var utils = require("../utils");
var Media = /** @class */ (function (_super) {
    __extends(Media, _super);
    function Media(value, features, index, currentFileInfo, visibilityInfo) {
        var _this = _super.call(this) || this;
        _this._index = index;
        _this._fileInfo = currentFileInfo;
        var selectors = (new selector_1.default([], null, null, _this._index, _this._fileInfo)).createEmptySelectors();
        _this.features = new list_1.default(features);
        _this.rules = [new ruleset_1.default(selectors, value)];
        _this.rules[0].allowImports = true;
        _this.copyVisibilityInfo(visibilityInfo);
        _this.allowRoot = true;
        _this.setParent(selectors, _this);
        _this.setParent(_this.features, _this);
        _this.setParent(_this.rules, _this);
        return _this;
    }
    Media.prototype.isRulesetLike = function () {
        return true;
    };
    Media.prototype.accept = function (visitor) {
        if (this.features) {
            this.features = visitor.visit(this.features);
        }
        if (this.rules) {
            this.rules = visitor.visitArray(this.rules);
        }
    };
    Media.prototype.genCSS = function (context, output) {
        output.add('@media ', this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
    };
    Media.prototype.eval = function (context) {
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }
        var media = new Media(null, [], this._index, this._fileInfo, this.visibilityInfo());
        if (this.debugInfo) {
            this.rules[0].debugInfo = this.debugInfo;
            media.debugInfo = this.debugInfo;
        }
        media.features = this.features.eval(context);
        context.mediaPath.push(media);
        context.mediaBlocks.push(media);
        this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
        context.frames.unshift(this.rules[0]);
        media.rules = [this.rules[0].eval(context)];
        context.frames.shift();
        context.mediaPath.pop();
        return context.mediaPath.length === 0 ? media.evalTop(context) :
            media.evalNested(context);
    };
    Media.prototype.evalTop = function (context) {
        var result = this;
        // Render all dependent Media blocks.
        if (context.mediaBlocks.length > 1) {
            var selectors = (new selector_1.default([], null, null, this.getIndex(), this.fileInfo())).createEmptySelectors();
            result = new ruleset_1.default(selectors, context.mediaBlocks);
            result.multiMedia = true;
            result.copyVisibilityInfo(this.visibilityInfo());
            this.setParent(result, this);
        }
        delete context.mediaBlocks;
        delete context.mediaPath;
        return result;
    };
    Media.prototype.evalNested = function (context) {
        var i;
        var value;
        var path = context.mediaPath.concat([this]);
        // Extract the media-query conditions separated with `,` (OR).
        for (i = 0; i < path.length; i++) {
            value = path[i].features instanceof list_1.default ?
                path[i].features.value : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
        }
        // Trace all permutations to generate the resulting media-query.
        //
        // (a, b and c) with nested (d, e) ->
        //    a and d
        //    a and e
        //    b and c and d
        //    b and c and e
        this.features = new list_1.default(this.permute(path).map(function (path) {
            path = path.map(function (fragment) { return fragment.toCSS ? fragment : new generic_1.default(fragment); });
            for (i = path.length - 1; i > 0; i--) {
                path.splice(i, 0, new generic_1.default('and'));
            }
            return new expression_1.default(path);
        }));
        this.setParent(this.features, this);
        // Fake a tree-node that doesn't output anything.
        return new ruleset_1.default([], []);
    };
    Media.prototype.permute = function (arr) {
        if (arr.length === 0) {
            return [];
        }
        else if (arr.length === 1) {
            return arr[0];
        }
        else {
            var result = [];
            var rest = this.permute(arr.slice(1));
            for (var i = 0; i < rest.length; i++) {
                for (var j = 0; j < arr[0].length; j++) {
                    result.push([arr[0][j]].concat(rest[i]));
                }
            }
            return result;
        }
    };
    Media.prototype.bubbleSelectors = function (selectors) {
        if (!selectors) {
            return;
        }
        this.rules = [new ruleset_1.default(utils.copyArray(selectors), [this.rules[0]])];
        this.setParent(this.rules, this);
    };
    return Media;
}(atrule_1.default));
Media.prototype.type = 'Media';
exports.default = Media;
//# sourceMappingURL=media.js.map