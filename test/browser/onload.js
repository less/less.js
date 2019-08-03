(function() {
    window.DEFER = [window.onload];
    Object.defineProperty(window, 'onload', {
        get: function() {
            return function() {};
        },
        set: function(fn) {
            window.DEFER.push(fn);
        },
        enumerable: true,
        configurable: true
    });
})();