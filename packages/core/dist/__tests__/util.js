"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
require("mocha");
var util_1 = require("../util");
describe('listMerge()', function () {
    it('should return the same list', function () {
        var list = ['.a', '.b'];
        var result = util_1.mergeList(list)[0];
        chai_1.expect(result).to.eq(list);
        chai_1.expect(JSON.stringify(result)).to.eq(JSON.stringify(list));
    });
    it('should merge to .a.b, .a.c', function () {
        var list = ['.a', ['.b', '.c']];
        var result = util_1.mergeList(list);
        chai_1.expect(JSON.stringify(result)).to.eq('[[".a",".b"],[".a",".c"]]');
    });
    it('should merge to .a.c, .b.c', function () {
        var list = [['.a', '.b'], '.c'];
        var result = util_1.mergeList(list);
        chai_1.expect(JSON.stringify(result)).to.eq('[[".a",".c"],[".b",".c"]]');
    });
    it('should merge to .a.c, .b.c', function () {
        var list = [['.a', '.b'], ['.c']];
        var result = util_1.mergeList(list);
        chai_1.expect(JSON.stringify(result)).to.eq('[[".a",".c"],[".b",".c"]]');
    });
    it('should merge to .a.c, .a.d, .b.c, .b.d', function () {
        var list = [['.a', '.b'], ['.c', '.d']];
        var result = util_1.mergeList(list);
        chai_1.expect(JSON.stringify(result)).to.eq('[[".a",".c"],[".b",".c"],[".a",".d"],[".b",".d"]]');
    });
    it('should merge to .a.b.d, .a.c.d', function () {
        var list = ['.a', ['.b', '.c'], '.d'];
        var result = util_1.mergeList(list);
        chai_1.expect(JSON.stringify(result)).to.eq('[[".a",".b",".d"],[".a",".c",".d"]]');
    });
});
//# sourceMappingURL=util.js.map