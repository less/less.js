import contexts from './contexts.js';
import Parser from './parser/parser.js';
import PluginManager from './plugin-manager.js';
import LessError from './less-error.js';
import * as utils from './utils.js';

export default function(environment, ParseTree, ImportManager) {
    const parse = function (input, options, callback) {

        if (typeof options === 'function') {
            callback = options;
            options = utils.copyOptions(this.options, {});
        }
        else {
            options = utils.copyOptions(this.options, options || {});
        }

        if (!callback) {
            const self = this;
            return new Promise(function (resolve, reject) {
                parse.call(self, input, options, function(err, output) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(output);
                    }
                });
            });
        } else {
            let context;
            let rootFileInfo;
            const pluginManager = new PluginManager(this, !options.reUsePluginManager);

            options.pluginManager = pluginManager;

            context = new contexts.Parse(options);

            if (options.rootFileInfo) {
                rootFileInfo = options.rootFileInfo;
            } else {
                const filename = options.filename || 'input';
                const entryPath = filename.replace(/[^\/\\]*$/, '');
                rootFileInfo = {
                    filename,
                    rewriteUrls: context.rewriteUrls,
                    rootpath: context.rootpath || '',
                    currentDirectory: entryPath,
                    entryPath,
                    rootFilename: filename
                };
                // add in a missing trailing slash
                if (rootFileInfo.rootpath && rootFileInfo.rootpath.slice(-1) !== '/') {
                    rootFileInfo.rootpath += '/';
                }
            }

            const imports = new ImportManager(this, context, rootFileInfo);
            this.importManager = imports;

            // TODO: allow the plugins to be just a list of paths or names
            // Do an async plugin queue like lessc

            if (options.plugins) {
                options.plugins.forEach(function(plugin) {
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
                .parse(input, function (e, root) {
                    if (e) { return callback(e); }
                    callback(null, root, imports, options);
                }, options);
        }
    };
    return parse;
};
