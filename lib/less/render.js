var PromiseConstructor;

var importsCache = require('./imports-cache');



module.exports = function(environment, ParseTree, ImportManager) {
    var render = function (input, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // importsCache can be enabled or disabled per render phase
        if ( options.withImportsCaching ) {
           importsCache.enable();
           // If you invalidate cache yourself, you will have to call 
           // less.invalidateImportsCacheFile(filePath) everytime a less file is modified
           if ( !options.withManualImportsCachingInvalidation ) {
               importsCache.clean();
           } 
        } 
        else {
           importsCache.disable();
        }


        if (!callback) {
            if (!PromiseConstructor) {
                PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;
            }
            var self = this;
            return new PromiseConstructor(function (resolve, reject) {
                render.call(self, input, options, function(err, output) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(output);
                    }
                });
            });
        } else {
            this.parse(input, options, function(err, root, imports, options) {
                if (err) { return callback(err); }

                var result;
                try {
                    var parseTree = new ParseTree(root, imports);
                    result = parseTree.toCSS(options);
                }
                catch (err) { return callback(err); }

                callback(null, result);
            });
        }
    };

    return render;
};
