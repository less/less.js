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
var chevrotain_1 = require("chevrotain");
var BaseParserClass = /** @class */ (function (_super) {
    __extends(BaseParserClass, _super);
    function BaseParserClass() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.CAPTURING = false;
        _this.CAPTURED_TOKENS = [];
        return _this;
        /** Probably not needed */
        // SUBRULE<T>(
        //   ruleToCall: (idx: number) => T,
        //   options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE<T>(ruleToCall, options))
        // }
        // SUBRULE1<T>(
        //     ruleToCall: (idx: number) => T,
        //     options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE1<T>(ruleToCall, options))
        // }
        // SUBRULE2<T>(
        //     ruleToCall: (idx: number) => T,
        //     options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE2<T>(ruleToCall, options))
        // }
        // SUBRULE3<T>(
        //   ruleToCall: (idx: number) => T,
        //   options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE3<T>(ruleToCall, options))
        // }
        // SUBRULE4<T>(
        //   ruleToCall: (idx: number) => T,
        //   options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE4<T>(ruleToCall, options))
        // }
        // SUBRULE5<T>(
        //     ruleToCall: (idx: number) => T,
        //     options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE5<T>(ruleToCall, options))
        // }
        // SUBRULE6<T>(
        //     ruleToCall: (idx: number) => T,
        //     options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE6<T>(ruleToCall, options))
        // }
        // SUBRULE7<T>(
        //   ruleToCall: (idx: number) => T,
        //   options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE7<T>(ruleToCall, options))
        // }
        // SUBRULE8<T>(
        //   ruleToCall: (idx: number) => T,
        //   options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE8<T>(ruleToCall, options))
        // }
        // SUBRULE9<T>(
        //   ruleToCall: (idx: number) => T,
        //   options?: SubruleMethodOpts
        // ): T {
        //   return this.processCapturedSubrule<T>(super.SUBRULE9<T>(ruleToCall, options))
        // }
    }
    // protected CAPTURED_ELEMENTS: CstElement[][] = []
    BaseParserClass.prototype.CAPTURE = function () {
        this.CAPTURING = true;
        this.CAPTURED_TOKENS.push([]);
        // this.CAPTURED_ELEMENTS.push([])
    };
    BaseParserClass.prototype.END_CAPTURE = function () {
        var tokens = this.CAPTURED_TOKENS.pop();
        // const elements = this.CAPTURED_ELEMENTS.pop()
        if (this.CAPTURED_TOKENS.length === 0) {
            this.CAPTURING = false;
        }
        return tokens;
    };
    BaseParserClass.prototype.processCapturedToken = function (token) {
        if (!this.CAPTURING) {
            return token;
        }
        this.CAPTURED_TOKENS.forEach(function (groupArr) {
            groupArr.push(token);
        });
        // this.CAPTURED_ELEMENTS.forEach(groupArr => {
        //   groupArr.push(token)
        // })
        return token;
    };
    // private processCapturedSubrule <T>(element: any): T {
    //   if (!this.CAPTURING) {
    //     return element
    //   }
    // }
    BaseParserClass.prototype.CONSUME = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME1 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME1.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME2 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME2.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME3 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME3.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME4 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME4.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME5 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME5.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME6 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME6.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME7 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME7.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME8 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME8.call(this, tokType, options));
    };
    BaseParserClass.prototype.CONSUME9 = function (tokType, options) {
        return this.processCapturedToken(_super.prototype.CONSUME9.call(this, tokType, options));
    };
    return BaseParserClass;
}(chevrotain_1.EmbeddedActionsParser));
exports.BaseParserClass = BaseParserClass;
//# sourceMappingURL=baseParserClass.js.map