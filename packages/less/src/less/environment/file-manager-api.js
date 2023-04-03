export default {
    /**
     * Given the full path to a file, return the path component
     * Provided by AbstractFileManager
     * @param {string} _filename
     * @returns {string}
     */
    getPath: function(_filename) {
    },
    /**
     * Append a .less extension if appropriate. Only called if less thinks one could be added.
     * Provided by AbstractFileManager
     * @param _filename
     * @returns {string}
     */
    tryAppendLessExtension: function(_filename) {
    },
    /**
     * Whether the rootpath should be converted to be absolute.
     * The browser ovverides this to return true because urls must be absolute.
     * Provided by AbstractFileManager (returns false)
     * @returns {bool}
     */
    alwaysMakePathsAbsolute: function() {
    },
    /**
     * Returns whether a path is absolute
     * Provided by AbstractFileManager
     * @param {string} _path
     * @returns {bool}
     */
    isPathAbsolute: function(_path) {
    },
    /**
     * joins together 2 paths
     * Provided by AbstractFileManager
     * @param {string} _basePath
     * @param {string} _laterPath
     */
    join: function(_basePath, _laterPath) {
    },
    /**
     * Returns the difference between 2 paths
     * E.g. url = a/ baseUrl = a/b/ returns ../
     * url = a/b/ baseUrl = a/ returns b/
     * Provided by AbstractFileManager
     * @param {string} _url
     * @param {string} _baseUrl
     * @returns {string}
     */
    pathDiff: function(_url, _baseUrl) {
    },
    /**
     * Returns whether this file manager supports this file for syncronous file retrieval
     * If true is returned, loadFileSync will then be called with the file.
     * Provided by AbstractFileManager (returns false)
     * @param {string} _filename
     * @param {string} _currentDirectory
     * @param {object} _options
     * @param {less.environment.environment} _environment
     * @returns {bool}
     */
    supportsSync: function(_filename, _currentDirectory, _options, _environment) {
    },
    /**
     *
     * @param {string} _filename
     * @param {string} _currentDirectory
     * @param {object} _options
     * @param {less.environment.environment} _environment
     * @returns {bool}
     */
    supports: function(_filename, _currentDirectory, _options, _environment) {
    },
    /**
     * Loads a file asynchronously. Expects a promise that either rejects with an error or fulfills with an
     * object containing
     *  { filename: - full resolved path to file
     *    contents: - the contents of the file, as a string }
     *
     * @param {string} _filename
     * @param {string} _currentDirectory
     * @param {object} _options
     * @param {less.environment.environment} _environment
     * @returns {Promise}
     */
    loadFile: function(_filename, _currentDirectory, _options, _environment) {
    },
    /**
     * Loads a file synchronously. Expects an immediate return with an object containing
     *  { error: - error object if an error occurs
     *    filename: - full resolved path to file
     *    contents: - the contents of the file, as a string }
     *
     * @param {string} _filename
     * @param {string} _currentDirectory
     * @param {object} _options
     * @param {less.environment.environment} _environment
     * @returns {object} should be an object containing error or contents and filename
     */
    loadFileSync: function(_filename, _currentDirectory, _options, _environment) {
    }
};
