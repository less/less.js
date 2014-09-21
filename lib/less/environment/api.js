module.exports = {
    /**
      * Warns the user about something
      * @param {String} msg - the message about the warning
      */
    warn: function(msg) {
    },
    /**
      * gets the path from the filename, e.g. "http://wwe.files.com/ha/ha.less" would return
      * "http://wwe.files.com/ha/"
      * If the filename is a file e.g. "file.less" it should return the empty string ""
      * @param {String} filename - the filename to extract the path.
      * @returns {String}
      */
    getPath: function (filename) {
    },
    /**
      * Returns whether the path is absolute, e.g. "/file.less" = true, "file.less" = false
      * @param {String} filename - the filename
      * @returns {Boolean}
      */
    isPathAbsolute: function(filename) {
    },
    /**
      * Loads a file for an import aynscronously (or syncronously)
      * @param {String} filename - the filename
      * @param {String} currentDirectory - the current directory we are in
      * @param {Object} options - the environment or options object
      * @param {Function} callback - a function to callback when finished,
      *                   taking the format callback(error, contents, fullfilename, reserved)
      *                   where error is { type: {string}, message: {string} }, contents is {string} and fullfilename is {string}
      *                   for reserved, see less-browser/index.js which uses this argument for cache information
      * @returns {Boolean}
      */
    loadFile: function(filename, currentDirectory, options, callback) {
    },
    supportsDataURI: function() {
    }
};
