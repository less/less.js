
setTimeout(function(){
    less.modifyVars({var1: "green", var2: "purple"});
}, 1000);

describe("less.js modify vars", function() {
    testLessEqualsInDocument();
    it("Should log only 2 XHR requests", function() {
        var xhrLogMessages = logMessages.filter(function(item) {
            return /XHR: Getting '/.test(item);
        })
        expect(xhrLogMessages.length).toEqual(2);
    });
});