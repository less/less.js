"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var chevrotain_1 = require("chevrotain");
var XRegExp = require("xregexp");
exports.createLexer = function (rawFragments, rawTokens) {
    console.log(JSON.stringify(rawTokens, null, '  '));
    var fragments = {};
    var T = {};
    var tokens = [];
    /** Build fragment replacements */
    rawFragments.forEach(function (fragment) {
        fragments[fragment[0]] = XRegExp.build(fragment[1], fragments);
    });
    rawTokens.forEach(function (rawToken) {
        var name = rawToken.name, pattern = rawToken.pattern, longer_alt = rawToken.longer_alt, categories = rawToken.categories, rest = __rest(rawToken, ["name", "pattern", "longer_alt", "categories"]);
        if (pattern !== chevrotain_1.Lexer.NA) {
            var category = !categories || categories[0];
            if (!category || (rest.group !== chevrotain_1.Lexer.SKIPPED && category !== 'BlockMarker')) {
                if (categories) {
                    categories.push('Value');
                }
                else {
                    categories = ['Value'];
                }
                if (category !== 'Ident') {
                    categories.push('NonIdent');
                }
            }
            if (!(pattern instanceof RegExp)) {
                pattern = XRegExp.build(pattern, fragments);
            }
        }
        var longerAlt = longer_alt ? { longer_alt: T[longer_alt] } : {};
        var tokenCategories = categories ? { categories: categories.map(function (category) {
                return T[category];
            }) } : {};
        var token = chevrotain_1.createToken(__assign(__assign(__assign({ name: name,
            pattern: pattern }, longerAlt), tokenCategories), rest));
        T[name] = token;
        /** Build tokens from bottom to top */
        tokens.unshift(token);
    });
    return {
        lexer: new chevrotain_1.Lexer(tokens),
        tokens: tokens,
        T: T
    };
};
exports.createParser = function (Parser, rawFragments, rawTokens) {
    var _a = exports.createLexer(rawFragments, rawTokens), lexer = _a.lexer, tokens = _a.tokens, T = _a.T;
    var parser = new Parser(tokens, T);
    return {
        parser: parser,
        lexer: lexer,
        tokens: tokens,
        T: T,
        parse: function (text) {
            var lexResult = lexer.tokenize(text);
            parser.input = lexResult.tokens;
            // any top level rule may be used as an entry point
            var value = parser.primary();
            return {
                // This is a pure grammar, the value will be undefined until we add embedded actions
                // or enable automatic CST creation.
                value: value,
                lexErrors: lexResult.errors,
                parseErrors: parser.errors
            };
        }
    };
};
//# sourceMappingURL=util.js.map