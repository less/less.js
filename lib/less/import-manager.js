import * as contexts from "./contexts";
import Parser from './parser/parser';
import LessError from './less-error';
import * as utils from './utils';

if (typeof Promise === 'undefined') {
    require('promise');
}

export default function (environment) {
    // FileInfo = {
    //  'relativeUrls' - option - whether to adjust URL's to be relative
    //  'filename' - full resolved filename of current file
    //  'rootpath' - path to append to normal URLs for this node
    //  'currentDirectory' - path to the current file, absolute
    //  'rootFilename' - filename of the base file
    //  'entryPath' - absolute path to the entry file
    //  'reference' - whether the file should not be output and only output parts that are referenced

    class ImportManager {
        constructor(less, context, rootFileInfo) {
            this.less = less;
            this.rootFilename = rootFileInfo.filename;
            this.paths = context.paths || [];  // Search paths, when importing
            this.contents = {};             // map - filename to contents of all the files
            this.contentsIgnoredChars = {}; // map - filename to lines at the beginning of each file to ignore
            this.mime = context.mime;
            this.error = null;
            this.context = context;
            // Deprecated? Unused outside of here, could be useful.
            this.queue = [];        // Files which haven't been imported yet
            this.files = {};        // Holds the imported parse trees.
        }

        /**
         * Add an import to be imported
         * @param path - the raw path
         * @param tryAppendExtension - whether to try appending a file extension (.less or .js if the path has no extension)
         * @param currentFileInfo - the current file info (used for instance to work out relative paths)
         * @param importOptions - import options
         * @param callback - callback for when it is imported
         */
        push(path, tryAppendExtension, currentFileInfo, importOptions, callback) {
            const pluginLoader = this.context.pluginManager.Loader;

            this.queue.push(path);

            const fileParsedFunc = (e, root, fullPath) => {
                this.queue.splice(this.queue.indexOf(path), 1); // Remove the path from the queue

                const importedEqualsRoot = fullPath === this.rootFilename;
                if (importOptions.optional && e) {
                    callback(null, {rules:[]}, false, null);
                }
                else {
                    if (!this.files[fullPath]) {
                        this.files[fullPath] = { root, options: importOptions };
                    } 
                    if (e && !this.error) { this.error = e; }
                    callback(e, root, importedEqualsRoot, fullPath);
                }
            };

            const newFileInfo = {
                relativeUrls: this.context.relativeUrls,
                entryPath: currentFileInfo.entryPath,
                rootpath: currentFileInfo.rootpath,
                rootFilename: currentFileInfo.rootFilename
            };

            const fileManager = environment.getFileManager(path, currentFileInfo.currentDirectory, this.context, environment);

            if (!fileManager) {
                fileParsedFunc({ message: "Could not find a file-manager for " + path });
                return;
            }

            const loadFileCallback = loadedFile => {
                let plugin;
                const resolvedFilename = loadedFile.filename;
                const contents = loadedFile.contents.replace(/^\uFEFF/, '');

                // Pass on an updated rootpath if path of imported file is relative and file
                // is in a (sub|sup) directory
                //
                // Examples:
                // - If path of imported file is 'module/nav/nav.less' and rootpath is 'less/',
                //   then rootpath should become 'less/module/nav/'
                // - If path of imported file is '../mixins.less' and rootpath is 'less/',
                //   then rootpath should become 'less/../'
                newFileInfo.currentDirectory = fileManager.getPath(resolvedFilename);
                if (newFileInfo.relativeUrls) {
                    newFileInfo.rootpath = fileManager.join(
                        (this.context.rootpath || ""),
                        fileManager.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));

                    if (!fileManager.isPathAbsolute(newFileInfo.rootpath) && fileManager.alwaysMakePathsAbsolute()) {
                        newFileInfo.rootpath = fileManager.join(newFileInfo.entryPath, newFileInfo.rootpath);
                    }
                }
                newFileInfo.filename = resolvedFilename;

                const newEnv = new contexts.Parse(this.context);

                newEnv.processImports = false;
                this.contents[resolvedFilename] = contents;

                if (currentFileInfo.reference || importOptions.reference) {
                    newFileInfo.reference = true;
                }

                if (importOptions.isPlugin) {
                    plugin = pluginLoader.evalPlugin(contents, newEnv, this, importOptions.pluginArgs, newFileInfo);
                    if (plugin instanceof LessError) {
                        fileParsedFunc(plugin, null, resolvedFilename);
                    }
                    else {
                        fileParsedFunc(null, plugin, resolvedFilename);
                    }
                } else if (importOptions.inline) {
                    fileParsedFunc(null, contents, resolvedFilename);
                } else {
                    // import (multiple) parse trees apparently get altered and can't be cached.
                    // TODO: investigate why this is
                    if (this.files[resolvedFilename]
                        && !this.files[resolvedFilename].options.multiple
                        && !this.multiple) {
                        fileParsedFunc(null, this.files[resolvedFilename].root, resolvedFilename);
                    }
                    else {
                        new Parser(newEnv, this, newFileInfo).parse(contents, (e, root) => {
                            fileParsedFunc(e, root, resolvedFilename);
                        })
                    }
                }
            };

            let promise;
            const context = utils.clone(this.context);

            if (tryAppendExtension) {
                context.ext = importOptions.isPlugin ? ".js" : ".less";
            }

            if (importOptions.isPlugin) {
                promise = pluginLoader.loadPlugin(path, currentFileInfo.currentDirectory, context, environment, fileManager);
            }
            else {
                promise = fileManager.loadFile(path, currentFileInfo.currentDirectory, context, environment, (err, loadedFile) => {
                    if (err) {
                        fileParsedFunc(err);
                    } else {
                        loadFileCallback(loadedFile);
                    }
                });
            }
            if (promise) {
                promise.then(loadFileCallback, fileParsedFunc);
            }
        }

    }

    return ImportManager;
}
