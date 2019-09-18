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
 * This is any generic (unquoted string fragment) value
 *   e.g. new Value('this is an unquoted value')
 *        new Value({ text: '[id=foo]', value: '[id="foo"]' }) */
//       new Value({ text: ' >/* combine */ ', value: '>' })
/*
* Renamed from 'Anonymous'
*/
var Value = /** @class */ (function (_super) {
    __extends(Value, _super);
    function Value(props, options, location) {
        var _this = this;
        var returnProps;
        if (props.constructor === String) {
            returnProps = { text: props, value: props };
        }
        else {
            returnProps = props;
            if (returnProps.value === undefined) {
                returnProps.value = returnProps.text;
            }
        }
        _this = _super.call(this, returnProps, options, location) || this;
        return _this;
    }
    return Value;
}(node_1.default));
Value.prototype.type = 'Value';
exports.default = Value;
//# sourceMappingURL=value.js.map