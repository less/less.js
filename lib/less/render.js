var PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;

var render = function(Parser) {
    return function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        if (callback) {
            render(input.options)
                .then(function(css) {
                    callback(null, css);
                },
                function(error) {
                    callback(error);
                });
        } else {
            var parser = new(Parser)(options);

            return new PromiseConstructor(function (resolve, reject) {
                parser.parse(input, function (e, root) {
                    if (e) { return reject(e); }
                    try { resolve(root.toCSS(options)); }
                    catch (err) { reject( err); }
                }, options);
            });
        }
    };
};
module.exports = render;
