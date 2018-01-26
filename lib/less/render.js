var utils = require('./utils');

module.exports = function(environment, ParseTree, ImportManager) {
    var render = function (input, options) {
        options = utils.defaults(this.options, options || {});

        var self = this;
        return new Promise(function(resolve, reject) {
            self.parse(input, options, function(err, root, imports, options) {
                if (err) { reject(err); }

                var result;
                try {
                    var parseTree = new ParseTree(root, imports);
                    result = parseTree.toCSS(options);
                }
                catch (err) { reject(err); }

                resolve(result);
            });
        });
    };

    return render;
};
