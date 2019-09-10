"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cssTokens_1 = require("../cssTokens");
var cssStructureParser_1 = require("./cssStructureParser");
var cssRuleParser_1 = require("./cssRuleParser");
var util_1 = require("../util");
var Parser = /** @class */ (function () {
    function Parser(structureOnly) {
        if (structureOnly === void 0) { structureOnly = false; }
        var _a = util_1.createLexer(cssTokens_1.Fragments, cssTokens_1.Tokens), lexer = _a.lexer, tokens = _a.tokens, T = _a.T;
        this.lexer = lexer;
        if (structureOnly) {
            this.parser = new cssStructureParser_1.CssStructureParser(tokens, T);
        }
        else {
            var ruleParser = new cssRuleParser_1.CssRuleParser(tokens, T);
            this.parser = new cssStructureParser_1.CssStructureParser(tokens, T, undefined, ruleParser);
        }
    }
    Parser.prototype.parse = function (text) {
        var lexerResult = this.lexer.tokenize(text);
        var lexedTokens = lexerResult.tokens;
        this.parser.input = lexedTokens;
        var cst = this.parser.primary();
        return { cst: cst, lexerResult: lexerResult, parser: this.parser };
    };
    return Parser;
}());
exports.Parser = Parser;
//# sourceMappingURL=index.js.map