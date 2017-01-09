(function (root, registerPlugin) { 
    if (typeof define === 'function' && define.amd) { 
        define([], registerPlugin);
    } else if (typeof module === 'object' && module.exports) { 
        module.exports = registerPlugin();
    } else { 
        if (!root.less) { root.less = {}; } 
        if (!root.less.plugins) { root.less.plugins = []; }
        root.less.plugins.push(registerPlugin());
    } 
}(this, function () {
    // Less.js Plugin object
    return {
        install: function(less, pluginManager, functions) {
            // functions.add('')
        }
    };
}));