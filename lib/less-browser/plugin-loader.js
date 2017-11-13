// TODO: Add tests for browser @plugin

import AbstractPluginLoader from "../less/environment/abstract-plugin-loader";

/**
 * Browser Plugin Loader
 */
export default class PluginLoader extends AbstractPluginLoader {
    constructor(less) {
        super();
        this.less = less;
        // shim for browser require?
        this.require = require;
    }

    loadPlugin(filename, basePath, context, environment, fileManager) {
        return fileManager.loadFile(filename, basePath, context, environment)
    }
}
