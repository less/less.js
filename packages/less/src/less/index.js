import Environment from './environment/environment.js';
import data from './data/index.js';
import tree from './tree/index.js';
import AbstractFileManager from './environment/abstract-file-manager.js';
import AbstractPluginLoader from './environment/abstract-plugin-loader.js';
import visitors from './visitors/index.js';
import Parser from './parser/parser.js';
import functions from './functions/index.js';
import contexts from './contexts.js';
import LessError from './less-error.js';
import transformTree from './transform-tree.js';
import * as utils from './utils.js';
import PluginManager from './plugin-manager.js';
import logger from './logger.js';
import SourceMapOutput from './source-map-output.js';
import SourceMapBuilder from './source-map-builder.js';
import ParseTree from './parse-tree.js';
import ImportManager from './import-manager.js';
import Parse from './parse.js';
import Render from './render.js';
import { version } from '../../package.json';
import parseVersion from 'parse-node-version';

export default function(environment, fileManagers) {
    let sourceMapOutput, sourceMapBuilder, parseTree, importManager;

    environment = new Environment(environment, fileManagers);
    sourceMapOutput = SourceMapOutput(environment);
    sourceMapBuilder = SourceMapBuilder(sourceMapOutput, environment);
    parseTree = ParseTree(sourceMapBuilder);
    importManager = ImportManager(environment);

    const render = Render(environment, parseTree, importManager);
    const parse = Parse(environment, parseTree, importManager);

    const v = parseVersion(`v${version}`);
    const initial = {
        version: [v.major, v.minor, v.patch],
        data,
        tree,
        Environment,
        AbstractFileManager,
        AbstractPluginLoader,
        environment,
        visitors,
        Parser,
        functions: functions(environment),
        contexts,
        SourceMapOutput: sourceMapOutput,
        SourceMapBuilder: sourceMapBuilder,
        ParseTree: parseTree,
        ImportManager: importManager,
        render,
        parse,
        LessError,
        transformTree,
        utils,
        PluginManager,
        logger
    };

    // Create a public API

    const ctor = function(t) {
        return function() {
            const obj = Object.create(t.prototype);
            t.apply(obj, Array.prototype.slice.call(arguments, 0));
            return obj;
        };
    };
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

    /**
     * Some of the functions assume a `this` context of the API object,
     * which causes it to fail when wrapped for ES6 imports.
     *
     * An assumed `this` should be removed in the future.
     */
    initial.parse = initial.parse.bind(api);
    initial.render = initial.render.bind(api);

    return api;
};
