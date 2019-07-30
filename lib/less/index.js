export default (environment, fileManagers) => {
    let SourceMapOutput;
    let SourceMapBuilder;
    let ParseTree;
    let ImportManager;
    let Environment;

    const initial = {
        version: [3, 9, 0],
        data: require('./data'),
        tree: require('./tree'),
        Environment: (Environment = require('./environment/environment')),
        AbstractFileManager: require('./environment/abstract-file-manager'),
        AbstractPluginLoader: require('./environment/abstract-plugin-loader'),
        environment: (environment = new Environment(environment, fileManagers)),
        visitors: require('./visitors'),
        Parser: require('./parser/parser'),
        functions: require('./functions')(environment),
        contexts: require('./contexts'),
        SourceMapOutput: (SourceMapOutput = require('./source-map-output')(environment)),
        SourceMapBuilder: (SourceMapBuilder = require('./source-map-builder')(SourceMapOutput, environment)),
        ParseTree: (ParseTree = require('./parse-tree')(SourceMapBuilder)),
        ImportManager: (ImportManager = require('./import-manager')(environment)),
        render: require('./render')(environment, ParseTree, ImportManager),
        parse: require('./parse')(environment, ParseTree, ImportManager),
        LessError: require('./less-error'),
        transformTree: require('./transform-tree'),
        utils: require('./utils'),
        PluginManager: require('./plugin-manager'),
        logger: require('./logger')
    };

    // Create a public API

    const ctor = t => (function(...args) {
        const obj = Object.create(t.prototype);
        t.apply(obj, Array.prototype.slice.call(args, 0));
        return obj;
    });
    let t;
    const api = Object.create(initial);
    for (const n in initial.tree) {
        /* eslint guard-for-in: 0 */
        t = initial.tree[n];
        if (typeof t === 'function') {
            api[n.toLowerCase()] = ctor(t);
        }
        else {
            api[n] = Object.create(null);
            for (const o in t) {
                /* eslint guard-for-in: 0 */
                api[n][o.toLowerCase()] = ctor(t[o]);
            }
        }
    }

    return api;
};
