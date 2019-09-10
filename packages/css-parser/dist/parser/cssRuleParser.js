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
        _this.preExpression = _this.RULE('preExpression', function () {
            var val;
            var pre;
            var ws;
            var colon;
            var propertyValues;
            var allValues;
            _this.ACTION(function () {
                propertyValues = [];
                allValues = [];
            });
            /** Grab initial colon, in case this is a selector list */
            _this.OPTION(function () {
                pre = _this.CONSUME(_this.T.Colon);
                _this.ACTION(function () {
                    propertyValues.push(pre);
                    allValues.push(pre);
                });
            });
            _this.MANY(function () {
                val = _this.SUBRULE(_this.propertyValue);
                _this.ACTION(function () {
                    propertyValues.push(val);
                    allValues.push(val);
                });
            });
            ws = _this.SUBRULE(_this._);
            _this.ACTION(function () {
                allValues.push(ws);
            });
            _this.OPTION2(function () {
                colon = _this.CONSUME2(_this.T.Colon);
                _this.ACTION(function () {
                    allValues.push(colon);
                });
            });
            if (pre && colon) {
                return {
                    name: 'declaration',
                    children: __assign(__assign({ property: propertyValues }, (ws ? { ws: [ws] } : {})), { Colon: [colon], allValues: allValues })
                };
            }
            return allValues;
        });
        _this.property = _this.OVERRIDE_RULE('property', function () {
            _this.CONSUME(_this.T.Ident);
        });
        _this.expression = _this.OVERRIDE_RULE('expression', function () {
            _this.AT_LEAST_ONE(function () { return _this.SUBRULE(_this.valueExpression); });
        });
        _this.valueExpression = _this.RULE('valueExpression', function () {
            _this.SUBRULE(_this._);
            _this.SUBRULE(_this.addition);
        });
        _this.addition = _this.RULE('addition', function () {
            // using labels can make the CST processing easier
            _this.SUBRULE(_this.multiplication, { LABEL: "lhs" });
            _this.MANY(function () {
                // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
                _this.CONSUME(_this.T.AdditionOperator);
                _this.SUBRULE2(_this._);
                //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
                _this.SUBRULE2(_this.multiplication, { LABEL: "rhs" });
            });
            _this.SUBRULE3(_this._);
        });
        _this.multiplication = _this.RULE('multiplication', function () {
            _this.SUBRULE(_this.compare, { LABEL: "lhs" });
            _this.MANY(function () {
                _this.CONSUME(_this.T.MultiplicationOperator);
                _this.SUBRULE(_this._);
                _this.SUBRULE2(_this.compare, { LABEL: "rhs" });
            });
            _this.SUBRULE2(_this._);
        });
        _this.compare = _this.RULE('compare', function () {
            // using labels can make the CST processing easier
            _this.SUBRULE(_this.value, { LABEL: "lhs" });
            _this.MANY(function () {
                _this.CONSUME(_this.T.CompareOperator);
                _this.SUBRULE(_this._);
                _this.SUBRULE2(_this.value, { LABEL: "rhs" });
            });
            _this.SUBRULE2(_this._);
        });
        _this.value = _this.OVERRIDE_RULE('value', function () {
            _this.OR([
                { ALT: function () { return _this.SUBRULE(_this.block); } },
                { ALT: function () { return _this.CONSUME(_this.T.Unit); } },
                { ALT: function () { return _this.CONSUME(_this.T.Ident); } },
                { ALT: function () { return _this.CONSUME(_this.T.StringLiteral); } },
                { ALT: function () { return _this.CONSUME(_this.T.Uri); } },
                { ALT: function () { return _this.CONSUME(_this.T.Color); } },
                { ALT: function () { return _this.CONSUME(_this.T.UnicodeRange); } }
            ]);
        });
        // value = this.OVERRIDE_RULE('value', () => {
        //   this.OR([
        //     { ALT: () => this.SUBRULE(this.block) },
        //     { ALT: () => this.CONSUME(this.T.Unit) },
        //     { ALT: () => this.CONSUME(this.T.Ident) },
        //     { ALT: () => this.CONSUME(this.T.StringLiteral) },
        //     { ALT: () => this.CONSUME(this.T.Uri) },
        //     { ALT: () => this.CONSUME(this.T.Color) },
        //     { ALT: () => this.CONSUME(this.T.UnicodeRange) },
        //     { ALT: () => this.CONSUME(this.T.WS) }
        //   ])
        // })
        _this.compoundSelectorList = _this.RULE('compoundSelectorList', function () {
            _this.SUBRULE(_this.compoundSelector);
            _this.MANY(function () {
                _this.SUBRULE(_this._);
                _this.CONSUME(_this.T.Comma);
                _this.SUBRULE2(_this._);
                _this.SUBRULE2(_this.compoundSelector);
            });
        });
        /**
         * e.g. div.foo[bar] + p
         */
        _this.compoundSelector = _this.RULE('compoundSelector', function () {
            _this.SUBRULE(_this.selector);
            _this.MANY(function () {
                _this.OPTION(function () { return _this.CONSUME(_this.T.WS, { LABEL: 'ws' }); });
                _this.OPTION2(function () {
                    _this.SUBRULE(_this.selectorCombinator);
                    _this.SUBRULE(_this._);
                });
                _this.SUBRULE(_this.compoundSelector);
            });
            _this.SUBRULE2(_this._);
        });
        _this.selector = _this.RULE('selector', function () {
            _this.OR([
                {
                    ALT: function () {
                        _this.SUBRULE(_this.selectorElement);
                        _this.MANY(function () {
                            _this.SUBRULE(_this.selectorSuffix);
                        });
                    }
                },
                {
                    ALT: function () {
                        _this.AT_LEAST_ONE(function () {
                            _this.SUBRULE2(_this.selectorSuffix);
                        });
                    }
                }
            ]);
        });
        // IDENT | '*'
        _this.selectorElement = _this.RULE('selectorElement', function () {
            _this.OR([
                { ALT: function () { return _this.CONSUME(_this.T.Ident); } },
                { ALT: function () { return _this.CONSUME(_this.T.Star); } },
                { ALT: function () { return _this.CONSUME(_this.T.DimensionInt); } }
            ]);
        });
        // helper grammar rule to avoid repetition
        // [ HASH | class | attrib | pseudo ]+
        _this.selectorSuffix = _this.RULE('selectorSuffix', function () {
            _this.OR([
                { ALT: function () { return _this.CONSUME(_this.T.ClassOrId); } },
                { ALT: function () { return _this.SUBRULE(_this.selectorAttribute); } },
                { ALT: function () { return _this.SUBRULE(_this.pseudoSelector); } }
            ]);
        });
        _this.selectorCombinator = _this.RULE('selectorCombinator', function () {
            _this.OR([
                { ALT: function () { return _this.CONSUME(_this.T.Plus); } },
                { ALT: function () { return _this.CONSUME(_this.T.Gt); } },
                { ALT: function () { return _this.CONSUME(_this.T.Tilde); } },
                { ALT: function () { return _this.CONSUME(_this.T.Pipe); } }
            ]);
        });
        _this.selectorAttribute = _this.RULE('selectorAttribute', function () {
            _this.CONSUME(_this.T.LSquare);
            _this.CONSUME(_this.T.Ident);
            _this.OPTION(function () {
                _this.CONSUME(_this.T.AttrMatchOperator);
                _this.OR([
                    { ALT: function () { return _this.CONSUME2(_this.T.Ident); } },
                    { ALT: function () { return _this.CONSUME(_this.T.StringLiteral); } }
                ]);
            });
            _this.OPTION2(function () {
                _this.CONSUME(_this.T.AttrFlag);
            });
            _this.CONSUME(_this.T.RSquare);
        });
        // ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
        _this.pseudoSelector = _this.RULE('pseudoSelector', function () {
            _this.OR([
                { ALT: function () { return _this.SUBRULE(_this.pseudoFunction); } },
                { ALT: function () {
                        _this.CONSUME(_this.T.Colon, { LABEL: 'colon1' });
                        _this.OPTION(function () { return _this.CONSUME2(_this.T.Colon, { LABEL: 'colon2' }); });
                        _this.CONSUME(_this.T.Ident);
                    } }
            ]);
        });
        _this.pseudoFunction = _this.RULE('pseudoFunction', function () {
            _this.OR([
                {
                    ALT: function () {
                        _this.CONSUME(_this.T.PseudoNotNthFunc);
                        _this.SUBRULE(_this._);
                        _this.SUBRULE(_this.compoundSelectorList);
                        _this.SUBRULE2(_this._);
                        _this.CONSUME(_this.T.RParen);
                    }
                },
                {
                    /**
                     * :nth* pseudo-function
                     * @reference https://www.w3.org/TR/css-syntax-3/#anb-microsyntax
                     */
                    ALT: function () {
                        _this.CONSUME(_this.T.PseudoNthFunc);
                        _this.SUBRULE3(_this._);
                        _this.OR2([
                            { ALT: function () { return _this.CONSUME(_this.T.NthIdent); } },
                            {
                                ALT: function () {
                                    /**
                                     * @todo implement a GATE to check for 'n'
                                     */
                                    _this.CONSUME(_this.T.DimensionInt);
                                    _this.SUBRULE4(_this._);
                                    _this.OPTION(function () {
                                        _this.OR3([
                                            {
                                                ALT: function () {
                                                    _this.OR4([
                                                        { ALT: function () { return _this.CONSUME(_this.T.Plus); } },
                                                        { ALT: function () { return _this.CONSUME(_this.T.Minus); } }
                                                    ]);
                                                    _this.CONSUME(_this.T.WS);
                                                    _this.CONSUME(_this.T.UnsignedInt);
                                                }
                                            },
                                            {
                                                /**
                                                 * A signed int is a single token, so this allows
                                                 * 'n+1', which is [<Ident: 'n'>, <SignedInt: '+1'>]
                                                */
                                                ALT: function () { return _this.CONSUME(_this.T.SignedInt); }
                                            }
                                        ]);
                                    });
                                }
                            }
                        ]);
                        _this.SUBRULE5(_this._);
                        _this.OPTION2(function () {
                            _this.CONSUME(_this.T.Of);
                            _this.SUBRULE6(_this._);
                            _this.SUBRULE2(_this.compoundSelectorList);
                            _this.SUBRULE7(_this._);
                        });
                        _this.CONSUME2(_this.T.RParen);
                    }
                }
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