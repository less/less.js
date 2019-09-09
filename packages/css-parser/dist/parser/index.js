"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cssTokens_1 = require("../cssTokens");
var cssStructureParser_1 = require("./cssStructureParser");
var util_1 = require("../util");
// let { parser, lexer, tokens, T } = createParser(CssStructureParser, Fragments, Tokens)
// const cssVisitor = CssStructureVisitor(
//   parser.getBaseCstVisitorConstructorWithDefaults()
// )
var Parser = /** @class */ (function () {
    function Parser() {
        var _a = util_1.createLexer(cssTokens_1.Fragments, cssTokens_1.Tokens), lexer = _a.lexer, tokens = _a.tokens, T = _a.T;
        this.lexer = lexer;
        this.parser = new cssStructureParser_1.CssStructureParser(tokens, T);
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