var PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise,
    contexts = require("./contexts"),
    Parser = require('./parser/parser');

module.exports = function(environment, ParseTree, ImportManager) {
    var render = function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        if (callback) {
            render(input, options)
                .then(function(css) {
                    callback(null, css);
                },
                function(error) {
                    callback(error);
                });
        } else {
            var env = new contexts.parseEnv(options),
                imports = new ImportManager(env);

            var parser = new(Parser)(env, imports);

            return new PromiseConstructor(function (resolve, reject) {
                parser.parse(input, function (e, root) {
                    if (e) { return reject(e); }
                    try {
                        var parseTree = new ParseTree(root, imports);
                        var result = parseTree.toCSS(options);
                        resolve(result);
                    }
                    catch (err) { reject( err); }
                }, options);
            });
        }
    };
    return render;
};
