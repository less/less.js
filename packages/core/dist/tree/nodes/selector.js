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
var element_1 = require("./element");
// A selector like div .foo@{blah} +/* */ p
//   
//  e.g.
//     elements = ['div',' ','.foo',new Variable('@blah'),'+','p']
//     text = 'div.foo[bar] +/* */ p'
//  
var Selector = /** @class */ (function (_super) {
    __extends(Selector, _super);
    function Selector() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Selector.prototype.getElements = function (els) {
        if (!els) {
            return [new element_1.default(['', '&'], {}, this.location)];
        }
        return els;
    };
    Selector.prototype.createEmptySelectors = function () {
        var el = new element_1.default(['', '&'], {}, this.location);
        var sels = [new Selector([el], {}, this.location)];
        sels[0].options.mediaEmpty = true;
        return sels;
    };
    /**
     * @todo - what's the type of 'other'?
     */
    Selector.prototype.match = function (other) {
        var elements = this.values;
        var len = elements.length;
        var olen;
        other = other.mixinElements();
        olen = other.length;
        if (olen === 0 || len < olen) {
            return 0;
        }
        else {
            for (var i = 0; i < olen; i++) {
                if (elements[i].value !== other[i]) {
                    return 0;
                }
            }
        }
        return olen; // return number of matched elements
    };
    Selector.prototype.mixinElements = function () {
        if (this.mixinElements_) {
            return this.mixinElements_;
        }
        var elements = this.elements.map(function (v) { return v.combinator.value + (v.value.value || v.value); }).join('').match(/[,&#\*\.\w-]([\w-]|(\\.))*/g);
        if (elements) {
            if (elements[0] === '&') {
                elements.shift();
            }
        }
        else {
            elements = [];
        }
        return (this.mixinElements_ = elements);
    };
    Selector.prototype.isJustParentSelector = function () {
        return !this.mediaEmpty &&
            this.elements.length === 1 &&
            this.elements[0].value === '&' &&
            (this.elements[0].combinator.value === ' ' || this.elements[0].combinator.value === '');
    };
    Selector.prototype.eval = function (context) {
        var evaldCondition = this.condition && this.condition.eval(context);
        var elements = this.elements;
        var extendList = this.extendList;
        elements = elements && elements.map(function (e) { return e.eval(context); });
        extendList = extendList && extendList.map(function (extend) { return extend.eval(context); });
        return this.createDerived(elements, extendList, evaldCondition);
    };
    Selector.prototype.genCSS = function (context, output) {
        var i;
        var element;
        if ((!context || !context.firstSelector) && this.elements[0].combinator.value === '') {
            output.add(' ', this.fileInfo(), this.getIndex());
        }
        for (i = 0; i < this.elements.length; i++) {
            element = this.elements[i];
            element.genCSS(context, output);
        }
    };
    Selector.prototype.getIsOutput = function () {
        return this.evaldCondition;
    };
    return Selector;
}(node_1.default));
Selector.prototype.type = 'Selector';
exports.default = Selector;
//# sourceMappingURL=selector.js.map