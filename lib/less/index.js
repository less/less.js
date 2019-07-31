import data from './data';
import tree from './tree';
import Environment from './environment/environment';
import AbstractFileManager from './environment/abstract-file-manager';
import AbstractPluginLoader from './environment/abstract-plugin-loader';
import visitors from './visitors';
import Parser from './parser/parser';
import Functions from './functions';
import contexts from './contexts';
import sourceMapOutput from './source-map-output';
import sourceMapBuilder from './source-map-builder';
import parseTree from './parse-tree';
import importManager from './import-manager';
import Render from './render';
import Parse from './parse';
import LessError from './less-error';
import transformTree from './transform-tree';
import * as utils from './utils';
import PluginManager from './plugin-manager';
import logger from './logger';

export default (environment, fileManagers) => {
    const SourceMapOutput = sourceMapOutput(environment);
    const SourceMapBuilder = sourceMapBuilder(SourceMapOutput, environment);
    const ParseTree = parseTree(SourceMapBuilder);
    const ImportManager = importManager(environment);
    const render = Render(environment, ParseTree, ImportManager);
    const parse = Parse(environment, ParseTree, ImportManager);
    const environ = new Environment(environment, fileManagers);
    const functions = Functions(environment);

    const initial = {
        version: [3, 9, 0],
        data,
        tree,
        Environment,
        AbstractFileManager,
        AbstractPluginLoader,
        environment: environ,
        visitors,
        Parser,
        functions,
        contexts,
        SourceMapOutput,
        SourceMapBuilder,
        ParseTree,
        ImportManager,
        render,
        parse,
        LessError,
        transformTree,
        utils,
        PluginManager,
        logger
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
