module.exports = function(environment) {
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
        // ParseTree: require('./parse-tree'), // TODO - move environment to constructor? make available to consumers
        //SourceMapOutput: require('./source-map-output.js'), // TODO - move environment to constructor? make available to consumers
        getImportManager: require('./imports'), // TODO: change to class? add static ways of replacing file-manager?
        LessError: require('./less-error'),
        transformTree: require('./transform-tree'),
        utils: require('./utils'),
        PluginManager: require('./plugin-manager')
    };

    return less;
};
