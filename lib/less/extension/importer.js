var LessError = require('../less-error'),
    tree = require("../tree"),
    less = require("../.");

var ExtensionImporter = module.exports = function ExtensionImporter(context, fileInfo) {
    this.fileInfo = fileInfo;
};

ExtensionImporter.prototype.eval = function(contents, callback) {
    var loaded = {},
        loader,
        registry;

    registry = {
        add: function(name, func) {
            loaded[name] = func;
        },
        addMultiple: function(functions) {
            Object.keys(functions).forEach(function(name) {
                loaded[name] = functions[name];
            });
        }
    };

    try {
        loader = new Function("functions", "tree", "fileInfo", "less", contents);
        loader(registry, tree, this.fileInfo, less);
    } catch(e) {
        callback(new LessError({
            message: "Extension evaluation error: '" + e.name + ': ' + e.message.replace(/["]/g, "'") + "'" ,
            filename: this.fileInfo.filename
        }), null );
    }

    callback(null, { functions: loaded });
};
