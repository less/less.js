module.exports = function(environment) {
    var SourceMapOutput = require('./source-map-output.js')(environment),
        SourceMapBuilder = require('./source-map-builder.js')(SourceMapOutput);

    var less = {
        version: [2, 0, 0],
        data: require('./data'),
        tree: require('./tree'),
        visitors: require('./visitors'),
        Parser: require('./parser/parser'),
        functions: require('./functions')(environment),
        contexts: require("./contexts"),
        environment: environment,
        render: require("./render")(environment),
        ParseTree: require('./parse-tree'),
        SourceMapOutput: SourceMapOutput,
        SourceMapBuilder: SourceMapBuilder,
        getImportManager: require('./imports'), // TODO: change to class? add static ways of replacing file-manager?
        LessError: require('./less-error'),
        transformTree: require('./transform-tree'),
        utils: require('./utils'),
        PluginManager: require('./plugin-manager')
    };

    return less;
};
