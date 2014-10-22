/* global document */
module.exports = {
    extractId: function(href) {
        return href.replace(/^[a-z-]+:\/+?[^\/]+/, '' )  // Remove protocol & domain
            .replace(/^\//,                 '' )  // Remove root /
            .replace(/\.[a-zA-Z]+$/,        '' )  // Remove simple extension
            .replace(/[^\.\w-]+/g,          '-')  // Replace illegal characters
            .replace(/\./g,                 ':'); // Replace dots with colons(for valid id)
    },
    addDataAttr: function(options) {
        function reformatOptionName(option) {
            return String.replace(option , /_(.)/g, function( match, p1) {
                return p1.toUpperCase();
            });
        }

        var script = document.currentScript || (function() {
            var scripts = document.getElementsByTagName("script");
            return scripts[scripts.length - 1];
        })();
        for (var opt in script.dataset)
            if (script.dataset.hasOwnProperty(opt)) {
                opt = reformatOptionName(opt);
                if (opt === "env" || opt === "dumpLineNumbers" || opt === "rootpath" || opt === "errorReporting")
                    options[opt] = script.dataset[opt];
                else
                    options[opt] = JSON.parse(script.dataset[opt]);
            }
        return options;
    }
};
