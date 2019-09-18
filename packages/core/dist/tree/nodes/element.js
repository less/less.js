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
var block_1 = require("./block");
/**
 * An element's values list will be exactly two Values,
 * so that they can have normalized values for indexing / lookups
 */
var Element = /** @class */ (function (_super) {
    __extends(Element, _super);
    function Element(props, options, location) {
        var _this = this;
        var valueNodes;
        if (props[0].constructor === String) {
            valueNodes = [new value_1.default(props[0]), new value_1.default(props[1])];
        }
        else {
            valueNodes = (props.values || props);
        }
        _this = _super.call(this, valueNodes, options, location) || this;
        return _this;
    }
    /** Indexable value */
    Element.prototype.valueOf = function () {
        var combinator = (this.values[0].value || '').toString();
        var simpleSelector = (this.values[1].value || '').toString();
        return combinator + simpleSelector;
    };
    Element.prototype.toString = function () {
        return this.values[0].text + this.values[1].text;
    };
    Element.prototype.toCSS = function (context) {
        if (context === void 0) { context = {}; }
        var value = this.value;
        var firstSelector = context.firstSelector;
        if (value instanceof block_1.default) {
            // selector in parens should not be affected by outer selector
            // flags (breaks only interpolated selectors - see #1973)
            context.firstSelector = true;
        }
        value = value.toCSS ? value.toCSS(context) : value;
        context.firstSelector = firstSelector;
        if (value === '' && this.combinator.value.charAt(0) === '&') {
            return '';
        }
        else {
            return this.combinator.toCSS(context) + value;
        }
    };
    return Element;
}(node_1.default));
Element.prototype.type = 'Element';
exports.default = Element;
//# sourceMappingURL=element.js.map