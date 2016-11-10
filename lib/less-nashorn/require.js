if (typeof require === 'undefined') {
    var loadedModules = {};
    var requireWrap = (
        function (__dir, __file, args) {
            return function (path) {
                var fullPath;
                // Map some of the node require's to the nashorn implementations so test cases do not need to be modified
                if (path === "promise")
                    fullPath = libLessNashornPath.resolve('promise-nashorn.js');
                else if (path === "fs")
                    fullPath = libLessNashornPath.resolve('fs.js');
                else if (path === "os")
                    fullPath = libLessNashornPath.resolve('os.js');
                else if (path === "path")
                    fullPath = libLessNashornPath.resolve('path.js');
                else if (path === "process")
                    fullPath = libLessNashornPath.resolve('process.js');
                else if (path === "console")
                    fullPath = libLessNashornPath.resolve('console.js');
                else {
                    fullPath = __dir.resolve(path).normalize();
                    if (java.nio.file.Files.isDirectory(fullPath))
                        fullPath = fullPath.resolve("index.js");
                    else if (!java.nio.file.Files.isRegularFile(fullPath) && !fullPath.endsWith(".js"))
                        fullPath = java.nio.file.Paths.get(fullPath.toString() + ".js");
                    fullPath = __rootDir.relativize(fullPath.toAbsolutePath()).normalize();
                }
                var loadedModule = loadedModules[fullPath.toString()];
                if (loadedModule) {
                    return loadedModule;
                }
                var scope = {
                    require: null,
                    module: {exports: {}},
                    exports: null,
                    __dir: __rootDir.relativize(fullPath.getParent().toAbsolutePath()).normalize(),
                    __file: fullPath,
                    arguments: args
                };
                scope.require = requireWrap(scope.__dir, scope.__file, scope.arguments);
                scope.exports = scope.module.exports;
                var moduleCode = java.nio.file.Files.readAllBytes(fullPath);
                try {
                    var call = eval("//# sourceURL="+fullPath+"\nfunction(require, module, exports, __dir, __file, arguments) { " + new java.lang.String(moduleCode) + " }")
                    call.apply(scope, [scope.require, scope.module, scope.exports, scope.__dir, scope.__file, scope.arguments]);
                }
                catch (e) {
                    if (e instanceof java.lang.Throwable)
                        throw new Error(fullPath + (e.lineNumber ? " on line " + (e.lineNumber - 1):"") + " : " + e.toString());
                    throw new Error(fullPath + " on line " + (e.lineNumber - 1) + " : " + e.message);
                }
                loadedModules[fullPath.toString()] = scope.module.exports;
                return scope.module.exports;
            };
        });
    require = requireWrap(__dir, __file, arguments);
}