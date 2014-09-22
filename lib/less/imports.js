var contexts = require("./contexts"),
    Parser = require('./parser/parser');

module.exports = function(environment) {

    // FileInfo = {
    //  'relativeUrls' - option - whether to adjust URL's to be relative
    //  'filename' - full resolved filename of current file
    //  'rootpath' - path to append to normal URLs for this node
    //  'currentDirectory' - path to the current file, absolute
    //  'rootFilename' - filename of the base file
    //  'entryPath' - absolute path to the entry file
    //  'reference' - whether the file should not be output and only output parts that are referenced

    var ImportManager = function(env, rootFileInfo) {
        this.rootFilename = rootFileInfo.filename;
        this.paths = env.paths || [];  // Search paths, when importing
        this.contents = {};             // map - filename to contents of all the files
        this.contentsIgnoredChars = {}; // map - filename to lines at the begining of each file to ignore
        this.mime = env.mime;
        this.error = null;
        this.env = env;
        // Deprecated? Unused outside of here, could be useful.
        this.queue = [];        // Files which haven't been imported yet
        this.files = [];        // Holds the imported parse trees.
    };
    ImportManager.prototype.getAbsolutePath = function(filename) {
        // proxy needed for "DebugInfo"
        // I hope one day we can remove this function
        return environment.getAbsolutePath(filename);
    };
    ImportManager.prototype.push = function (path, currentFileInfo, importOptions, callback) {
        var parserImports = this;
        this.queue.push(path);

        var fileParsedFunc = function (e, root, fullPath) {
            parserImports.queue.splice(parserImports.queue.indexOf(path), 1); // Remove the path from the queue

            var importedEqualsRoot = fullPath === parserImports.rootFilename;

            parserImports.files[fullPath] = root;

            if (e && !parserImports.error) { parserImports.error = e; }

            callback(e, root, importedEqualsRoot, fullPath);
        };

        var newFileInfo = {
            relativeUrls: this.env.relativeUrls,
            entryPath: currentFileInfo.entryPath,
            rootpath: currentFileInfo.rootpath,
            rootFilename: currentFileInfo.rootFilename
        };

        environment.loadFile(path, currentFileInfo.currentDirectory, this.env, function loadFileCallback(e, contents, resolvedFilename) {
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
            newFileInfo.currentDirectory = environment.getPath(resolvedFilename);
            if(newFileInfo.relativeUrls) {
                newFileInfo.rootpath = environment.join((parserImports.env.rootpath || ""), environment.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));
                if (!environment.isPathAbsolute(newFileInfo.rootpath) && environment.alwaysMakePathsAbsolute()) {
                    newFileInfo.rootpath = environment.join(newFileInfo.entryPath, newFileInfo.rootpath);
                }
            }
            newFileInfo.filename = resolvedFilename;

            var newEnv = new contexts.parseEnv(parserImports.env);

            newEnv.processImports = false;
            parserImports.contents[resolvedFilename] = contents;

            if (currentFileInfo.reference || importOptions.reference) {
                newFileInfo.reference = true;
            }

            if (importOptions.inline) {
                fileParsedFunc(null, contents, resolvedFilename);
            } else {
                new Parser(newEnv, parserImports, newFileInfo).parse(contents, function (e, root) {
                    fileParsedFunc(e, root, resolvedFilename);
                });
            }
        });
    };
    return ImportManager;
};
