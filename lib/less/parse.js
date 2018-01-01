import * as contexts from "./contexts";
import Parser from './parser/parser';
import PluginManager from './plugin-manager';
import LessError from './less-error';
import * as utils from './utils';
import Promise from "../promise";

export default function (environment, ParseTree, ImportManager) {
    const parse = function(input, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = utils.defaults(this.options, {});
        }
        else {
            options = utils.defaults(this.options, options || {});
        }

        if (!callback) {
            return new Promise((resolve, reject) => {
                parse.call(this, input, options, (err, output) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(output);
                    }
                });
            });
        } else {
            let rootFileInfo;
            const pluginManager = new PluginManager(this, true);

            options.pluginManager = pluginManager;

            const context = new contexts.Parse(options);

            if (options.rootFileInfo) {
                rootFileInfo = options.rootFileInfo;
            } else {
                const filename = options.filename || "input";
                const entryPath = filename.replace(/[^\/\\]*$/, "");
                rootFileInfo = {
                    filename,
                    relativeUrls: context.relativeUrls,
                    rootpath: context.rootpath || "",
                    currentDirectory: entryPath,
                    entryPath,
                    rootFilename: filename
                };
                // add in a missing trailing slash
                if (rootFileInfo.rootpath && rootFileInfo.rootpath.slice(-1) !== "/") {
                    rootFileInfo.rootpath += "/";
                }
            }

            const imports = new ImportManager(this, context, rootFileInfo);
            this.importManager = imports;

            // TODO: allow the plugins to be just a list of paths or names
            // Do an async plugin queue like lessc

            if (options.plugins) {
                options.plugins.forEach(plugin => {
                    let evalResult, contents;
                    if (plugin.fileContent) {
                        contents = plugin.fileContent.replace(/^\uFEFF/, '');
                        evalResult = pluginManager.Loader.evalPlugin(contents, context, imports, plugin.options, plugin.filename);
                        if (evalResult instanceof LessError) {
                            return callback(evalResult);
                        }
                    }
                    else {
                        pluginManager.addPlugin(plugin);
                    }
                });
            }

            new Parser(context, imports, rootFileInfo)
                .parse(input, (e, root) => {
                    if (e) { return callback(e); }
                    callback(null, root, imports, options);
                }, options);
        }
    };
    return parse;
}
