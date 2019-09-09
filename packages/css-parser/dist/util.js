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
var LexerType;
(function (LexerType) {
    LexerType[LexerType["NA"] = 0] = "NA";
    LexerType[LexerType["SKIPPED"] = 1] = "SKIPPED";
})(LexerType = exports.LexerType || (exports.LexerType = {}));
exports.createLexer = function (rawFragments, rawTokens) {
    var fragments = {};
    var T = {};
    var tokens = [];
    /** Build fragment replacements */
    rawFragments.forEach(function (fragment) {
        fragments[fragment[0]] = XRegExp.build(fragment[1], fragments);
    });
    rawTokens.forEach(function (rawToken) {
        var name = rawToken.name, pattern = rawToken.pattern, longer_alt = rawToken.longer_alt, categories = rawToken.categories, group = rawToken.group, rest = __rest(rawToken, ["name", "pattern", "longer_alt", "categories", "group"]);
        var regExpPattern;
        if (pattern !== LexerType.NA) {
            var category = !categories || categories[0];
            if (!category || (group !== LexerType.SKIPPED && category !== 'BlockMarker')) {
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
                regExpPattern = XRegExp.build(pattern, fragments);
            }
            else {
                regExpPattern = pattern;
            }
        }
        else {
            regExpPattern = chevrotain_1.Lexer.NA;
        }
        var longerAlt = longer_alt ? { longer_alt: T[longer_alt] } : {};
        var groupValue = group === LexerType.SKIPPED ? { group: chevrotain_1.Lexer.SKIPPED } : (group ? { group: group } : {});
        var tokenCategories = categories ? { categories: categories.map(function (category) {
                return T[category];
            }) } : {};
        var token = chevrotain_1.createToken(__assign(__assign(__assign(__assign({ name: name, pattern: regExpPattern }, longerAlt), groupValue), tokenCategories), rest));
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
//# sourceMappingURL=util.js.map