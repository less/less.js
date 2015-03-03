var plugin = function(less) {

    var FileManager = less.FileManager;

    function TestFileManager() {
    };

    TestFileManager = new FileManager();

    TestFileManager.loadFile = function (filename, currentDirectory, options, environment, callback) {
        if (filename.match(/.*\.test$/)) {
            return less.environment.fileManagers[0].loadFile("colors.test", currentDirectory, options, environment, callback);
        }
        return less.environment.fileManagers[0].loadFile(filename, currentDirectory, options, environment, callback);
    };

    return TestFileManager;
};

var AddFilePlugin = {
    install: function(less, pluginManager) {
        less.environment.addFileManager(new plugin(less));
    }
};

var less = {logLevel: 4,
    errorReporting: "console",
    plugins: [AddFilePlugin]
    };
