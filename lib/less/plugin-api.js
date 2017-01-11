(function (root, factory) { 
    if (typeof define === 'function' && define.amd) { 
        define([], factory);
    } else if (typeof module === 'object' && module.exports) { 
        module.exports = factory();
    } else { 
        (root.LESS_PLUGINS = root.LESS_PLUGINS || []).push(factory());
    } 
}(this, function () {
    // Less.js Plugin object
    return {
        install: function(less, pluginManager, functions) {
            // functions.add('')
        }
    };
}));