const isUrlRe = /^(?:https?:)?\/\//i;
import url from 'url';
let request;
import AbstractFileManager from '../less/environment/abstract-file-manager.js';
import logger from '../less/logger';

class UrlFileManager extends AbstractFileManager {
    supports(filename, currentDirectory, options, environment) {
        return isUrlRe.test( filename ) || isUrlRe.test(currentDirectory);
    }

    loadFile(filename, currentDirectory, options, environment) {
        return new Promise((fulfill, reject) => {
            if (request === undefined) {
                try { request = require('native-request'); }
                catch (e) { request = null; }
            }
            if (!request) {
                reject({ type: 'File', message: 'optional dependency \'native-request\' required to import over http(s)\n' });
                return;
            }

            let urlStr = isUrlRe.test( filename ) ? filename : url.resolve(currentDirectory, filename);
            
            /** native-request currently has a bug */
            const hackUrlStr = urlStr.indexOf('?') === -1 ? urlStr + '?' : urlStr

            request.get(hackUrlStr, (error, body, status) => {
                if (status === 404) {
                    reject({ type: 'File', message: `resource '${urlStr}' was not found\n` });
                    return;
                }
                if (error) {
                    reject({ type: 'File', message: `resource '${urlStr}' gave this Error:\n  ${error}\n` });
                    return;
                }
                if (!body) {
                    logger.warn(`Warning: Empty body (HTTP ${status}) returned by "${urlStr}"`);
                }
                fulfill({ contents: body, filename: urlStr });
            });
        });
    }
}

export default UrlFileManager;
