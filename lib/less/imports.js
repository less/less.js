var contexts = require("./contexts"),
    Parser = require('./parser/parser');

// TODO - why does environment need env passed everywhere?
// Now we have one import manager per parse, can we move things from env to the import manager
// and then move the import manager onto env (if required there - if not, keep seperate)

module.exports = function(environment) {
    var ImportManager = function(env) {
        this.rootFilename = env && env.filename;
        this.paths = env.paths || [];  // Search paths, when importing
        this.queue = []; // Files which haven't been imported yet
        this.files = env.files;        // Holds the imported parse trees
        this.contents = env.contents; // Holds the imported file contents
        this.contentsIgnoredChars = env.contentsIgnoredChars; // lines inserted, not in the original less
        this.mime = env.mime;
        this.error = null;
        this.env = env;
    };
    ImportManager.prototype.getAbsolutePath = function(env, filename) {
        // proxy needed for "DebugInfo"
        // I hope one day we can remove this function
        return environment.getAbsolutePath(env, filename);
    };
    ImportManager.prototype.push = function (path, currentFileInfo, importOptions, callback) {
        var parserImports = this;
        this.queue.push(path);

        var fileParsedFunc = function (e, root, fullPath) {
            parserImports.queue.splice(parserImports.queue.indexOf(path), 1); // Remove the path from the queue

            var importedPreviously = fullPath === parserImports.rootFilename;

            parserImports.files[fullPath] = root;                        // Store the root

            if (e && !parserImports.error) { parserImports.error = e; }

            callback(e, root, importedPreviously, fullPath);
        };

        var newFileInfo = {
            relativeUrls: this.env.relativeUrls,
            entryPath: currentFileInfo.entryPath,
            rootpath: currentFileInfo.rootpath,
            rootFilename: currentFileInfo.rootFilename
        };

        environment.loadFile(this.env, path, currentFileInfo.currentDirectory, function loadFileCallback(e, contents, resolvedFilename) {
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
            newFileInfo.currentDirectory = environment.getPath(parserImports.env, resolvedFilename);
            if(newFileInfo.relativeUrls) {
                newFileInfo.rootpath = environment.join((parserImports.env.rootpath || ""), environment.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));
                if (!environment.isPathAbsolute(parserImports.env, newFileInfo.rootpath) && environment.alwaysMakePathsAbsolute()) {
                    newFileInfo.rootpath = environment.join(newFileInfo.entryPath, newFileInfo.rootpath);
                }
            }
            newFileInfo.filename = resolvedFilename;

            var newEnv = new contexts.parseEnv(parserImports.env);

            newEnv.currentFileInfo = newFileInfo;
            newEnv.processImports = false;
            newEnv.contents[resolvedFilename] = contents;

            if (currentFileInfo.reference || importOptions.reference) {
                newFileInfo.reference = true;
            }

            if (importOptions.inline) {
                fileParsedFunc(null, contents, resolvedFilename);
            } else {
                new(Parser)(newEnv, parserImports).parse(contents, function (e, root) {
                    fileParsedFunc(e, root, resolvedFilename);
                });
            }
        });
    };
    return ImportManager;
};
