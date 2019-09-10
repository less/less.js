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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var chevrotain_1 = require("chevrotain");
/**
 * This class further parses general rules into known rules
 */
var CssRuleParser = /** @class */ (function (_super) {
    __extends(CssRuleParser, _super);
    function CssRuleParser(tokens, T, config) {
        if (config === void 0) { config = { maxLookahead: 1 }; }
        var _this = _super.call(this, tokens, config) || this;
        _this._ = _this.RULE('_', function () {
            var token;
            _this.OPTION(function () { return token = _this.CONSUME(_this.T.WS); });
            return token;
        });
        /** A property is a collection of tokens in case we need to process segments */
        _this.property = _this.RULE('property', function () {
            return [_this.CONSUME(_this.T.PropertyName)];
        });
        _this.expression = _this.RULE('expression', function () {
            var values = [];
            _this.AT_LEAST_ONE(function () {
                var tmpValues = _this.SUBRULE(_this.valueExpression);
                _this.ACTION(function () {
                    values = values.concat(tmpValues);
                });
            });
            return {
                name: 'expression',
                children: { values: values }
            };
        });
        _this.valueExpression = _this.RULE('valueExpression', function () {
            var values = [];
            var val;
            val = _this.SUBRULE(_this._);
            _this.ACTION(function () { return val && values.push(val); });
            _this.OPTION(function () {
                val = _this.SUBRULE(_this.addition);
                _this.ACTION(function () { return val && values.push(val); });
            });
            return values;
        });
        _this.addition = _this.RULE('addition', function () {
            var rhs;
            _this.ACTION(function () { return rhs = []; });
            var val;
            var op;
            var ws;
            var lhs = _this.SUBRULE(_this.multiplication);
            _this.MANY(function () {
                op = _this.CONSUME(_this.T.AdditionOperator);
                ws = _this.SUBRULE2(_this._);
                val = _this.SUBRULE2(_this.multiplication);
                _this.ACTION(function () {
                    rhs.push({
                        name: 'rhs',
                        children: __assign(__assign({ op: [op] }, (ws ? { ws: [ws] } : {})), { expression: [val] })
                    });
                });
            });
            var post = _this.SUBRULE3(_this._);
            if (rhs && rhs.length > 0) {
                return {
                    name: 'addition',
                    children: __assign({ lhs: [lhs], rhs: rhs }, (post ? { post: [post] } : {}))
                };
            }
            else {
                return lhs;
            }
        });
        _this.multiplication = _this.RULE('multiplication', function () {
            var rhs;
            _this.ACTION(function () { return rhs = []; });
            var val;
            var op;
            var ws;
            var lhs = _this.SUBRULE(_this.compare);
            _this.MANY(function () {
                op = _this.CONSUME(_this.T.MultiplicationOperator);
                ws = _this.SUBRULE2(_this._);
                val = _this.SUBRULE2(_this.compare);
                _this.ACTION(function () {
                    rhs.push({
                        name: 'rhs',
                        children: __assign(__assign({ op: [op] }, (ws ? { ws: [ws] } : {})), { expression: [val] })
                    });
                });
            });
            var post = _this.SUBRULE3(_this._);
            if (rhs && rhs.length > 0) {
                return {
                    name: 'multiplication',
                    children: __assign({ lhs: [lhs], rhs: rhs }, (post ? { post: [post] } : {}))
                };
            }
            else {
                return lhs;
            }
        });
        _this.compare = _this.RULE('compare', function () {
            var rhs;
            _this.ACTION(function () { return rhs = []; });
            var val;
            var op;
            var ws;
            var lhs = _this.SUBRULE(_this.value);
            _this.MANY(function () {
                op = _this.CONSUME(_this.T.CompareOperator);
                ws = _this.SUBRULE2(_this._);
                val = _this.SUBRULE2(_this.value);
                _this.ACTION(function () {
                    rhs.push({
                        name: 'rhs',
                        children: __assign(__assign({ op: [op] }, (ws ? { ws: [ws] } : {})), { expression: [val] })
                    });
                });
            });
            var post = _this.SUBRULE3(_this._);
            if (rhs && rhs.length > 0) {
                return {
                    name: 'compare',
                    children: __assign({ lhs: [lhs], rhs: rhs }, (post ? { post: [post] } : {}))
                };
            }
            else {
                return lhs;
            }
        });
        _this.value = _this.RULE('value', function () {
            return _this.OR([
                // { ALT: () => this.SUBRULE(this.block) },
                { ALT: function () { return _this.CONSUME(_this.T.Unit); } },
                { ALT: function () { return _this.CONSUME(_this.T.Ident); } },
                { ALT: function () { return _this.CONSUME(_this.T.StringLiteral); } },
                { ALT: function () { return _this.CONSUME(_this.T.Uri); } },
                { ALT: function () { return _this.CONSUME(_this.T.Color); } },
                { ALT: function () { return _this.CONSUME(_this.T.UnicodeRange); } }
            ]);
        });
        _this.T = T;
        if (_this.constructor === CssRuleParser) {
            _this.performSelfAnalysis();
        }
        return _this;
    }
    return CssRuleParser;
}(chevrotain_1.EmbeddedActionsParser));
exports.CssRuleParser = CssRuleParser;
//# sourceMappingURL=cssRuleParser.js.map