var PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;

module.exports = function(Parser) {
    return function (input, options, callback) {
        options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        var parser = new(Parser)(options);

        if (callback) {
            parser.parse(input, function (e, root) {
                if (e) { callback(e); return; }
                var css;
                try {
                    css = root && root.toCSS && root.toCSS(options);
                }
                catch (err) { callback(err); return; }
                callback(null, css);
            }, options);
        } else {
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
