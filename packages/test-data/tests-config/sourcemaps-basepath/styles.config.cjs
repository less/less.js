module.exports = {
    language: {
        less: {
            sourceMap: {
                // Test sourceMapBasepath by setting it to a path that should be removed from source paths
                // Since the actual file is in packages/test-data/tests-config/sourcemaps-basepath/,
                // setting basepath to that directory should remove it from the sourcemap sources
                sourceMapBasepath: require('path').dirname(require.resolve('./sourcemaps-basepath.less')),
                sourceMapRootpath: 'testweb/'
            }
        }
    }
};

