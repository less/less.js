var postProcessor = function() {};

postProcessor.prototype = {
    process: function (css) {
        return 'hr {height:50px;}\n' + css;
    }
};

var postProcessorPlugin = {
    install: function(less, pluginManager) {
        pluginManager.addPostProcessor( new postProcessor());
    }
};

var less = {logLevel: 4,
    errorReporting: "console",
    plugins: [postProcessorPlugin]};
