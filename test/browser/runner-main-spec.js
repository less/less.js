console.warn("start spec");

// Run main tests from less = {} options
describe("less.js main tests", function() {
    testLessEqualsInDocument();
    it("the global environment", function() {
        expect(window.require).toBe(undefined);
    });
});




