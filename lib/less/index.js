import * as data from "./data/index";
import * as tree from "./tree/index";
import Environment from "./environment/environment";
import AbstractFileManager from "./environment/abstract-file-manager";
import AbstractPluginLoader from "./environment/abstract-plugin-loader";
import * as visitors from "./visitors/index";
import Parser from "./parser/parser";
import functions from "./functions/index";
import * as contexts from "./contexts";
import SourceMapOutputFactory from "./source-map-output";
import SourceMapBuilderFactory from "./source-map-builder";
import ParseTreeFactory from "./parse-tree";
import ImportManagerFactory from "./import-manager";
import render from "./render";
import parse from "./parse";
import LessError from "./less-error";
import transformTree from "./transform-tree";
import * as utils from "./utils";
import PluginManager from "./plugin-manager";
import logger from "./logger";

export default function (environment, fileManagers) {
    environment = new Environment(environment, fileManagers);
    const SourceMapOutput = SourceMapOutputFactory(environment)
    const SourceMapBuilder = SourceMapBuilderFactory(SourceMapOutput, environment)
    const ParseTree = ParseTreeFactory(SourceMapBuilder)
    const ImportManager = ImportManagerFactory(environment)

    const initial = {
        version: [3, 0, 0],
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
        SourceMapOutput,
        SourceMapBuilder,
        ParseTree,
        ImportManager,
        render: render(environment, ParseTree, ImportManager),
        parse: parse(environment, ParseTree, ImportManager),
        LessError,
        transformTree,
        utils,
        PluginManager,
        logger
    };

    // Create a public API
    function ctor(t) {
        return function() {
            const obj = Object.create(t.prototype);
            t.apply(obj, arguments);
            return obj;
        }
    }
    const api = Object.create(initial);
    for (const n in initial.tree) {
        /* eslint guard-for-in: 0 */
        const t = initial.tree[n];
        if (typeof t === "function") {
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
}
