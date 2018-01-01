// Cache system is a bit outdated and could do with work

export default function (window, options, logger) {
    let cache = null;
    if (options.env !== 'development') {
        try {
            cache = (typeof window.localStorage === 'undefined') ? null : window.localStorage;
        } catch (_) {}
    }
    return {
        setCSS(path, lastModified, modifyVars, styles) {
            if (cache) {
                logger.info('saving ' + path + ' to cache.');
                try {
                    cache.setItem(path, styles);
                    cache.setItem(path + ':timestamp', lastModified);
                    if (modifyVars) {
                        cache.setItem(path + ':vars', JSON.stringify(modifyVars));
                    }
                } catch (e) {
                    // TODO - could do with adding more robust error handling
                    logger.error('failed to save "' + path + '" to local storage for caching.');
                }
            }
        },
        getCSS(path, webInfo, modifyVars) {
            const css       = cache && cache.getItem(path);
            const timestamp = cache && cache.getItem(path + ':timestamp');
            const vars      = cache && cache.getItem(path + ':vars');

            modifyVars = modifyVars || {};

            if (timestamp && webInfo.lastModified &&
                (new Date(webInfo.lastModified).valueOf() ===
                    new Date(timestamp).valueOf()) &&
                (!modifyVars && !vars || JSON.stringify(modifyVars) === vars)) {
                // Use local copy
                return css;
            }
        }
    };
}
