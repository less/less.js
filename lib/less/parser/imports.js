var contexts = require("../contexts.js");
module.exports = function(environment, env, Parser) {
    var rootFilename = env && env.filename;
    return {
        paths: env.paths || [],  // Search paths, when importing
            queue: [],               // Files which haven't been imported yet
        files: env.files,        // Holds the imported parse trees
        contents: env.contents,  // Holds the imported file contents
        contentsIgnoredChars: env.contentsIgnoredChars, // lines inserted, not in the original less
        mime:  env.mime,         // MIME type of .less files
        error: null,             // Error in parsing/evaluating an import
        push: function (path, currentFileInfo, importOptions, callback) {
            var parserImports = this;
            this.queue.push(path);

            var fileParsedFunc = function (e, root, fullPath) {
                parserImports.queue.splice(parserImports.queue.indexOf(path), 1); // Remove the path from the queue

                var importedPreviously = fullPath === rootFilename;

                parserImports.files[fullPath] = root;                        // Store the root

                if (e && !parserImports.error) { parserImports.error = e; }

                callback(e, root, importedPreviously, fullPath);
            };

            var newFileInfo = {
                relativeUrls: env.relativeUrls,
                entryPath: currentFileInfo.entryPath,
                rootpath: currentFileInfo.rootpath,
                rootFilename: currentFileInfo.rootFilename
            };

            environment.loadFile(env, path, currentFileInfo.currentDirectory, function loadFileCallback(e, contents, resolvedFilename) {
                if (e) {
                    fileParsedFunc(e);
                    return;
                }

                // Pass on an updated rootpath if path of imported file is relative and file
                // is in a (sub|sup) directory
                //
                // Examples:
                // - If path of imported file is 'module/nav/nav.less' and rootpath is 'less/',
                //   then rootpath should become 'less/module/nav/'
                // - If path of imported file is '../mixins.less' and rootpath is 'less/',
                //   then rootpath should become 'less/../'
                newFileInfo.currentDirectory = environment.getPath(env, resolvedFilename);
                if(newFileInfo.relativeUrls) {
                    newFileInfo.rootpath = environment.join((env.rootpath || ""), environment.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));
                    if (!environment.isPathAbsolute(env, newFileInfo.rootpath) && environment.alwaysMakePathsAbsolute()) {
                        newFileInfo.rootpath = environment.join(newFileInfo.entryPath, newFileInfo.rootpath);
                    }
                }
                newFileInfo.filename = resolvedFilename;

                var newEnv = new contexts.parseEnv(env);

                newEnv.currentFileInfo = newFileInfo;
                newEnv.processImports = false;
                newEnv.contents[resolvedFilename] = contents;

                if (currentFileInfo.reference || importOptions.reference) {
                    newFileInfo.reference = true;
                }

                if (importOptions.inline) {
                    fileParsedFunc(null, contents, resolvedFilename);
                } else {
                    new(Parser)(newEnv).parse(contents, function (e, root) {
                        fileParsedFunc(e, root, resolvedFilename);
                    });
                }
            });
        }
    };
};
