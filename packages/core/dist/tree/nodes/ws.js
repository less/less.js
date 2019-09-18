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
 * A white-space node
 * Used to normalize expressions and values for equality testing
 * and list indexing
 */
var WS = /** @class */ (function (_super) {
    __extends(WS, _super);
    function WS() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return WS;
}(node_1.default));
WS.prototype.type = 'WS';
exports.default = WS;
//# sourceMappingURL=ws.js.map