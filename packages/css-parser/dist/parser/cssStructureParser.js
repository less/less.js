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
var baseParserClass_1 = require("./baseParserClass");
/**
 *  Parsing is broken into 2 phases, so that we:
 *    1. Don't have to do any backtracking to refine rules (like @media).
 *    2. Don't have to have special parsing rules based on block context.
 *
 *  This actually matches the spec, which essentially says that preludes and
 *  at-rule bodies (in {}) can be almost anything, and the outer grammar should
 *  not care about what at-rules or declaration values contain.
 */
var CssStructureParser = /** @class */ (function (_super) {
    __extends(CssStructureParser, _super);
    function CssStructureParser(tokens, T, config, 
    /** An optional instance to further refine rules */
    ruleParser) {
        if (config === void 0) { config = { maxLookahead: 1 }; }
        var _this = _super.call(this, tokens, config) || this;
        /** If an expression ends up not being a declaration, merge initial values into expression */
        _this._mergeValues = function (values, expr) {
            if (!expr) {
                /** Create new expression list */
                expr = {
                    name: 'expressionList',
                    children: {
                        expression: [{
                                name: 'expression',
                                children: {
                                    values: []
                                }
                            }]
                    }
                };
            }
            var listChildren = expr.children;
            var expressions = listChildren.expression;
            if (expressions) {
                var firstExpression = expressions[0].children;
                var firstValues = firstExpression.values;
                firstExpression.values = values.concat(firstValues);
            }
            else {
                listChildren.expression = values;
            }
            return expr;
        };
        /** Wrapper for secondary parsing by rule parser */
        _this._parseNode = function (node) {
            return node;
            // if (!this.ruleParser || this.RECORDING_PHASE) {
            //   return node
            // }
            // this.ACTION(() => {
            //   this.ruleParser.input
            // })
        };
        /** Optional whitespace */
        _this._ = _this.RULE('_', function () {
            var token;
            _this.OPTION(function () { return token = _this.CONSUME(_this.T.WS); });
            return token;
        });
        _this.primary = _this.RULE('primary', function () {
            var rules = [];
            _this.MANY(function () {
                var rule = _this.SUBRULE(_this.rule);
                _this.ACTION(function () { return rule && rules.push(rule); });
            });
            var post = {};
            var ws = _this.SUBRULE(_this._);
            _this.ACTION(function () {
                if (ws) {
                    post = { post: [ws] };
                }
            });
            return {
                name: 'primary',
                children: __assign({ rules: rules }, post)
            };
        });
        /** Capture semi-colon fragment */
        _this.semi = _this.RULE('semi', function () {
            var semi = _this.CONSUME(_this.T.SemiColon);
            return {
                name: 'isolatedSemiColon',
                children: { semi: [semi] }
            };
        });
        _this.rule = _this.RULE('rule', function () {
            var ws = _this.SUBRULE(_this._);
            var rule = _this.OR([
                { ALT: function () { return _this.SUBRULE(_this.atRule); } },
                { ALT: function () { return _this.SUBRULE(_this.componentValues); } },
                { ALT: function () { return _this.SUBRULE(_this.customPropertyRule); } },
                /** Capture any isolated / redundant semi-colons */
                { ALT: function () { return _this.SUBRULE(_this.semi); } },
                { ALT: function () { return chevrotain_1.EMPTY_ALT; } }
            ]);
            if (rule.children) {
                if (ws) {
                    rule.children.pre = [ws];
                }
                return rule;
            }
            else if (ws) {
                return {
                    name: 'ws',
                    children: {
                        value: [ws]
                    }
                };
            }
        });
        /**
         * Everything up to an (outer) ';' or '{' is the AtRule's prelude
         */
        _this.atRule = _this.RULE('atRule', function () {
            var name = [_this.CONSUME(_this.T.AtName)];
            var expr = _this.SUBRULE(_this.expressionList);
            var optionals = {};
            _this.OR([
                {
                    ALT: function () {
                        optionals.body = [_this.SUBRULE(_this.curlyBlock)];
                    }
                },
                {
                    ALT: function () { return _this.OPTION(function () {
                        optionals.SemiColon = [_this.CONSUME(_this.T.SemiColon)];
                    }); }
                }
            ]);
            return {
                name: 'atRule',
                children: __assign(__assign({ name: name }, (expr ? { prelude: [expr] } : {})), optionals)
            };
        });
        _this.propertyValue = _this.RULE('propertyValue', function () {
            return _this.OR([
                { ALT: function () { return _this.SUBRULE(_this.block); } },
                { ALT: function () { return _this.CONSUME(_this.T.Value); } }
            ]);
        });
        _this.componentValues = _this.RULE('componentValues', function () {
            var values = [];
            var val;
            var ws;
            var colon;
            var expr;
            var expressionTokens;
            var propertyTokens;
            var valueTokens;
            var parser = _this.ruleParser;
            _this.ACTION(function () { return _this.CAPTURE(); });
            _this.OR([
                {
                    /** Grab initial colon (or 2), in case this is a selector list */
                    ALT: function () {
                        val = _this.CONSUME(_this.T.Colon);
                        _this.ACTION(function () {
                            values.push(val);
                        });
                        _this.OPTION(function () {
                            val = _this.CONSUME2(_this.T.Colon);
                            _this.ACTION(function () {
                                values.push(val);
                            });
                        });
                    }
                },
                {
                    /** Grab curly if it's the first member of an expression */
                    ALT: function () {
                        val = _this.SUBRULE(_this.curlyBlock);
                        _this.ACTION(function () {
                            values.push(val);
                        });
                    }
                },
                {
                    ALT: function () {
                        _this.ACTION(function () { return _this.CAPTURE(); });
                        _this.AT_LEAST_ONE(function () {
                            val = _this.SUBRULE(_this.propertyValue);
                            _this.ACTION(function () {
                                values.push(val);
                            });
                        });
                        _this.ACTION(function () { return propertyTokens = _this.END_CAPTURE(); });
                        ws = _this.SUBRULE(_this._);
                        _this.OPTION2(function () {
                            colon = _this.CONSUME(_this.T.Assign);
                        });
                    }
                }
            ]);
            /** Consume any remaining values */
            _this.ACTION(function () { return _this.CAPTURE(); });
            expr = _this.SUBRULE(_this.expressionList);
            var curly, semi;
            _this.ACTION(function () {
                valueTokens = _this.END_CAPTURE();
                expressionTokens = _this.END_CAPTURE();
            });
            _this.OR2([
                { ALT: function () { return curly = _this.SUBRULE2(_this.curlyBlock); } },
                { ALT: function () { return semi = _this.CONSUME(_this.T.SemiColon); } },
                { ALT: function () { return chevrotain_1.EMPTY_ALT; } }
            ]);
            if (curly) {
                /** Treat as qualified rule */
                _this.ACTION(function () {
                    if (ws) {
                        values.push(ws);
                    }
                    if (colon) {
                        values.push(colon);
                    }
                    if (values.length > 0) {
                        expr = _this._mergeValues(values, expr);
                    }
                });
                return {
                    name: 'qualifiedRule',
                    children: {
                        expressionList: [expr],
                        body: [curly]
                    }
                };
            }
            else if (colon) {
                /** Treat as declaration */
                var property_1;
                var value_1;
                _this.ACTION(function () {
                    if (_this.ruleParser) {
                        parser.input = propertyTokens;
                        property_1 = parser.property();
                        parser.input = valueTokens;
                        expr = parser.expression();
                    }
                    else {
                        property_1 = values;
                    }
                    value_1 = [expr];
                });
                return {
                    name: 'declaration',
                    children: __assign(__assign(__assign({ property: property_1 }, (ws ? { ws: [ws] } : {})), { Colon: [colon], value: value_1 }), (semi ? { SemiColon: [semi] } : {}))
                };
            }
            /**
             * Treat as a plain expression list
             * @todo - Any error flagging to do here?
             */
            if (ws) {
                values.push(ws);
            }
            if (colon) {
                values.push(colon);
            }
            if (values.length > 0) {
                expr = _this._mergeValues(values, expr);
            }
            return expr;
        });
        /**
         * Custom property values can consume everything, including curly blocks
         */
        _this.customPropertyRule = _this.RULE('customPropertyRule', function () {
            var name = _this.CONSUME(_this.T.CustomProperty);
            var ws = _this.SUBRULE(_this._);
            var colon = _this.CONSUME(_this.T.Assign);
            var value = _this.SUBRULE(_this.customExpressionList);
            var semi;
            _this.OPTION(function () {
                semi = _this.CONSUME(_this.T.SemiColon);
            });
            return {
                name: 'declaration',
                children: __assign(__assign(__assign({ property: [name] }, (ws ? { ws: [ws] } : {})), { Colon: [colon], value: [value] }), (semi ? { SemiColon: [semi] } : {}))
            };
        });
        /** A comma-separated list of expressions */
        _this.expressionList = _this.RULE('expressionList', function () {
            var expressions;
            var Comma;
            var expr;
            _this.OPTION(function () {
                expr = _this.SUBRULE(_this.expression);
                _this.ACTION(function () {
                    if (expr) {
                        expressions = [expr];
                    }
                    else {
                        expressions = [];
                    }
                    Comma = [];
                });
                _this.MANY(function () {
                    var comma = _this.CONSUME(_this.T.Comma);
                    _this.ACTION(function () {
                        Comma.push(comma);
                    });
                    expr = _this.SUBRULE(_this.subExpression);
                    _this.ACTION(function () {
                        expressions.push(expr);
                    });
                });
            });
            if (expr) {
                return {
                    name: 'expressionList',
                    children: __assign(__assign({}, (Comma && Comma.length > 0 ? { Comma: Comma } : {})), (expressions ? { expression: expressions } : {}))
                };
            }
        });
        /** List of expression lists (or expression list if only 1) */
        _this.expressionListGroup = _this.RULE('expressionListGroup', function () {
            var isGroup = false;
            var SemiColon;
            var expressionList;
            var list = _this.SUBRULE(_this.customExpressionList);
            var semi;
            _this.OPTION(function () {
                semi = _this.CONSUME(_this.T.SemiColon);
                isGroup = true;
                _this.ACTION(function () {
                    expressionList = [list];
                    SemiColon = [semi];
                });
                _this.MANY(function () {
                    list = _this.SUBRULE2(_this.customExpressionList);
                    _this.ACTION(function () {
                        expressionList.push(list);
                        SemiColon = [semi];
                    });
                    _this.OPTION2(function () {
                        semi = _this.CONSUME2(_this.T.SemiColon);
                        _this.ACTION(function () {
                            SemiColon.push(semi);
                        });
                    });
                });
            });
            if (isGroup) {
                return {
                    name: 'expressionListGroup',
                    children: {
                        SemiColon: SemiColon,
                        expressionList: expressionList
                    }
                };
            }
            else if (list) {
                return list;
            }
        });
        _this.customExpressionList = _this.RULE('customExpressionList', function () {
            var expressions;
            var expr;
            var Comma;
            _this.OPTION(function () {
                expr = _this.SUBRULE(_this.customExpression);
                _this.ACTION(function () {
                    if (expr) {
                        expressions = [expr];
                    }
                    else {
                        expressions = [];
                    }
                    Comma = [];
                });
                _this.MANY(function () {
                    var comma = _this.CONSUME(_this.T.Comma);
                    _this.ACTION(function () {
                        Comma.push(comma);
                    });
                    expr = _this.SUBRULE2(_this.customExpression);
                    _this.ACTION(function () {
                        expressions.push(expr);
                    });
                });
            });
            if (expr) {
                return {
                    name: 'expressionList',
                    children: __assign(__assign({}, (Comma && Comma.length > 0 ? { Comma: Comma } : {})), (expressions ? { expression: expressions } : {}))
                };
            }
        });
        /**
         *  An expression contains values and spaces
         */
        _this.expression = _this.RULE('expression', function () {
            var values;
            var val;
            _this.ACTION(function () { return values = []; });
            _this.MANY(function () {
                val = _this.SUBRULE(_this.value);
                _this.ACTION(function () { return values.push(val); });
            });
            if (val) {
                return {
                    name: 'expression',
                    children: { values: values }
                };
            }
        });
        /**
         * Immediately following a comma and optional whitespace
         * This allows a curly block of rules to be a single value in an expression
         */
        _this.subExpression = _this.RULE('subExpression', function () {
            var values;
            var val;
            _this.ACTION(function () { return values = []; });
            _this.OPTION(function () {
                val = _this.CONSUME(_this.T.WS);
                _this.ACTION(function () { return values.push(val); });
            });
            _this.OPTION2(function () {
                val = _this.SUBRULE(_this.curlyBlock);
                _this.ACTION(function () { return values.push(val); });
            });
            _this.MANY(function () {
                val = _this.SUBRULE(_this.value);
                _this.ACTION(function () { return values.push(val); });
            });
            if (val) {
                return {
                    name: 'expression',
                    children: { values: values }
                };
            }
        });
        /**
         * This will detect a declaration-like expression within an expression,
         * but note that the declaration is essentially a duplicate of the entire expression.
         */
        _this.customExpression = _this.RULE('customExpression', function () {
            var exprValues;
            var propertyValues;
            var values;
            var val;
            var ws;
            var pre;
            var colon;
            _this.ACTION(function () {
                exprValues = [];
                propertyValues = [];
                values = [];
            });
            /** Similar to componentValues, except a propertyvalue is not required */
            pre = _this.SUBRULE(_this._);
            _this.ACTION(function () { return pre && values.push(pre); });
            _this.MANY(function () {
                val = _this.SUBRULE(_this.propertyValue);
                _this.ACTION(function () {
                    propertyValues.push(val);
                    values.push(val);
                });
            });
            ws = _this.SUBRULE2(_this._);
            _this.ACTION(function () { return ws && values.push(ws); });
            _this.OPTION2(function () {
                colon = _this.CONSUME(_this.T.Assign);
                _this.ACTION(function () {
                    values.push(colon);
                });
            });
            _this.MANY2(function () {
                var value = _this.OR([
                    { ALT: function () { return _this.SUBRULE(_this.value); } },
                    { ALT: function () { return _this.SUBRULE(_this.curlyBlock); } }
                ]);
                _this.ACTION(function () {
                    exprValues.push(value);
                    values.push(value);
                });
            });
            var decl;
            if (colon && propertyValues && propertyValues.length > 0) {
                decl = {
                    name: 'declaration',
                    children: __assign(__assign(__assign(__assign({}, (pre ? { pre: [pre] } : {})), { property: propertyValues }), (ws ? { ws: [ws] } : {})), { Colon: [colon], value: [{
                                name: 'expression',
                                children: {
                                    values: exprValues
                                }
                            }] })
                };
            }
            if (values && values.length > 0) {
                return {
                    name: 'expression',
                    children: __assign({ values: values }, (decl ? { declaration: [decl] } : {}))
                };
            }
        });
        /**
         * According to a reading of the spec, whitespace is a valid
         * value in a CSS list, e.g. in the custom properties spec,
         * `--custom: ;` has a value of ' '
         *
         * However, a property's grammar may discard whitespace between values.
         * e.g. for `color: black`, the value in the browser will resolve to `black`
         * and not ` black`. The CSS spec is rather hand-wavy about whitespace,
         * sometimes mentioning it specifically, sometimes not representing it
         * in grammar even though it's expected to be present.
         *
         * Strictly speaking, though, a property's value begins _immediately_
         * following a ':' and ends at ';' (or until automatically closed by
         * '}', ']', ')' or the end of a file).
         */
        _this.value = _this.RULE('value', function () {
            return _this.OR([
                { ALT: function () { return _this.SUBRULE(_this.block); } },
                { ALT: function () { return _this.CONSUME(_this.T.Value); } },
                { ALT: function () { return _this.CONSUME(_this.T.AtName); } },
                { ALT: function () { return _this.CONSUME(_this.T.CustomProperty); } },
                { ALT: function () { return _this.CONSUME(_this.T.Colon); } },
                { ALT: function () { return _this.CONSUME(_this.T.WS); } }
            ]);
        });
        _this.curlyBlock = _this.RULE('curlyBlock', function () {
            var children;
            var L = _this.CONSUME(_this.T.LCurly);
            var blockBody = _this.SUBRULE(_this.primary);
            _this.ACTION(function () {
                children = { L: [L], blockBody: [blockBody] };
            });
            /** @todo - Add a parsing error if this is missing */
            _this.OPTION(function () {
                var R = _this.CONSUME(_this.T.RCurly);
                _this.ACTION(function () { return children.R = [R]; });
            });
            return {
                name: 'curlyBlock',
                children: children
            };
        });
        /**
         * Everything in `[]` or `()` we evaluate as raw expression lists,
         * or groups of expression lists (divided by semi-colons).
         *
         * The CSS spec suggests that `[]`, `()`, `{}` should be treated equally,
         * as generic blocks, so I'm not sure of this, but in the language
         * _so far_, there's some distinction between these block types.
         * AFAIK, `[]` is only used formally in CSS grid and with attribute
         * identifiers, and `()` is used for functions and at-rule expressions.
         *
         * It would be great if CSS formalized this distinction, but for now,
         * this seems safe.
         */
        _this.block = _this.RULE('block', function () {
            var L;
            var R;
            var Function;
            var blockBody;
            _this.OR([
                {
                    ALT: function () {
                        _this.OR2([
                            { ALT: function () { return L = _this.CONSUME(_this.T.LParen); } },
                            { ALT: function () { return Function = _this.CONSUME(_this.T.Function); } }
                        ]);
                        blockBody = _this.SUBRULE(_this.expressionListGroup);
                        /** @todo - Add a parsing error if this is missing */
                        _this.OPTION(function () { return R = _this.CONSUME(_this.T.RParen); });
                    }
                },
                {
                    ALT: function () {
                        L = _this.CONSUME(_this.T.LSquare);
                        blockBody = _this.SUBRULE2(_this.expressionListGroup);
                        /** @todo - Add a parsing error if this is missing */
                        _this.OPTION2(function () { return R = _this.CONSUME(_this.T.RSquare); });
                    }
                }
            ]);
            return {
                name: 'block',
                children: __assign(__assign(__assign(__assign({}, (L ? { L: [L] } : {})), (Function ? { Function: [Function] } : {})), (blockBody ? { blockBody: [blockBody] } : {})), (R ? { R: [R] } : {}))
            };
        });
        _this.T = T;
        if (ruleParser) {
            _this.ruleParser = ruleParser;
        }
        if (_this.constructor === CssStructureParser) {
            _this.performSelfAnalysis();
        }
        return _this;
    }
    return CssStructureParser;
}(baseParserClass_1.BaseParserClass));
exports.CssStructureParser = CssStructureParser;
//# sourceMappingURL=cssStructureParser.js.map