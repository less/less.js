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
/**
 * Numeric is any number (dimension without a unit)
 *   e.g. new Numeric(2, ...)
 *
 * @todo - does this need to store the text representation?
 *   e.g. a CSS number can be '+1', the plus would be lost in conversion
 */
var Numeric = /** @class */ (function (_super) {
    __extends(Numeric, _super);
    function Numeric(props, options, location) {
        var _this = this;
        if (props.constructor === Number) {
            props = { primitive: props };
        }
        _this = _super.call(this, props, options, location) || this;
        return _this;
    }
    return Numeric;
}(node_1.default));
Numeric.prototype.type = 'Numeric';
exports.default = Numeric;
//# sourceMappingURL=numeric.js.map