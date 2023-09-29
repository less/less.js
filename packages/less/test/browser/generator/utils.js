/**
 * utils for covert browser paths,
 * fix https://github.com/less/less.js/pull/4213 
 * 
 * @param {string} path 
 * @returns {string}
 */
function forceCovertToBrowserPath (path) {
    return (path || '').replace(/\\/g, '/');
}

module.exports = {
    forceCovertToBrowserPath
}
