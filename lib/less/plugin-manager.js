import * as utils from './utils';

/**
 * Plugin Manager
 */
class PluginManager {
    constructor(less) {
        this.less = less;
        this.visitors = [];
        this.preProcessors = [];
        this.postProcessors = [];
        this.installedPlugins = [];
        this.fileManagers = [];
        this.iterator = -1;
        this.pluginCache = {};
        this.Loader = new less.PluginLoader(less);
    }

    /**
     * Adds all the plugins in the array
     * @param {Array} plugins
     */
    addPlugins(plugins) {
        if (plugins) {
            for (let i = 0; i < plugins.length; i++) {
                this.addPlugin(plugins[i]);
            }
        }
    }

    /**
     *
     * @param plugin
     * @param {String} filename
     */
    addPlugin(plugin, filename, functionRegistry) {
        this.installedPlugins.push(plugin);
        if (filename) {
            this.pluginCache[filename] = plugin;
        }
        if (plugin.install) {
            plugin.install(this.less, this, functionRegistry || this.less.functions.functionRegistry);
        }
    }

    /**
     *
     * @param filename
     */
    get(filename) {
        return this.pluginCache[filename];
    }

    /**
     * Adds a visitor. The visitor object has options on itself to determine
     * when it should run.
     * @param visitor
     */
    addVisitor(visitor) {
        let proto;
        // 2.x to 3.x visitor compatibility
        try {
            proto = utils.getPrototype(visitor);
            upgradeVisitors(proto, 'Directive', 'AtRule');
            upgradeVisitors(proto, 'Rule', 'Declaration');
        }
        catch (e) {}

        this.visitors.push(visitor);
    }

    /**
     * Adds a pre processor object
     * @param {object} preProcessor
     * @param {number} priority - guidelines 1 = before import, 1000 = import, 2000 = after import
     */
    addPreProcessor(preProcessor, priority) {
        let indexToInsertAt;
        for (indexToInsertAt = 0; indexToInsertAt < this.preProcessors.length; indexToInsertAt++) {
            if (this.preProcessors[indexToInsertAt].priority >= priority) {
                break;
            }
        }
        this.preProcessors.splice(indexToInsertAt, 0, {preProcessor, priority});
    }

    /**
     * Adds a post processor object
     * @param {object} postProcessor
     * @param {number} priority - guidelines 1 = before compression, 1000 = compression, 2000 = after compression
     */
    addPostProcessor(postProcessor, priority) {
        let indexToInsertAt;
        for (indexToInsertAt = 0; indexToInsertAt < this.postProcessors.length; indexToInsertAt++) {
            if (this.postProcessors[indexToInsertAt].priority >= priority) {
                break;
            }
        }
        this.postProcessors.splice(indexToInsertAt, 0, {postProcessor, priority});
    }

    /**
     *
     * @param manager
     */
    addFileManager(manager) {
        this.fileManagers.push(manager);
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    getPreProcessors() {
        const preProcessors = [];
        for (let i = 0; i < this.preProcessors.length; i++) {
            preProcessors.push(this.preProcessors[i].preProcessor);
        }
        return preProcessors;
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    getPostProcessors() {
        const postProcessors = [];
        for (let i = 0; i < this.postProcessors.length; i++) {
            postProcessors.push(this.postProcessors[i].postProcessor);
        }
        return postProcessors;
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    getVisitors() {
        return this.visitors;
    }

    visitor() {
        return {
            first: () => {
                this.iterator = -1;
                return this.visitors[this.iterator];
            },
            get: () => {
                this.iterator += 1;
                return this.visitors[this.iterator];
            }
        };
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    getFileManagers() {
        return this.fileManagers;
    }
}

let pm;
export default function PluginManagerFactory(less, newFactory) {
    if (newFactory || !pm) {
        pm = new PluginManager(less);
    }
    return pm;
}

/**
 * Deprecate eventually 
 */
function upgradeVisitors(visitor, oldType, newType) {

    if (visitor['visit' + oldType] && !visitor['visit' + newType]) {
        visitor['visit' + newType] = visitor['visit' + oldType];
    }
    if (visitor['visit' + oldType + 'Out'] && !visitor['visit' + newType + 'Out']) {
        visitor['visit' + newType + 'Out'] = visitor['visit' + oldType + 'Out'];
    }
}
