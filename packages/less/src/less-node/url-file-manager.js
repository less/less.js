/* eslint-disable no-unused-vars */
/**
 * @todo - remove top eslint rule when FileManagers have JSDoc type
 * and are TS-type-checked
 */
const isUrlRe = /^(?:https?:)?\/\//i;
import url from 'url';
let request;
import AbstractFileManager from '../less/environment/abstract-file-manager.js';
import logger from '../less/logger';

const UrlFileManager = function() {}
UrlFileManager.prototype = Object.assign(new AbstractFileManager(), {
    supports(filename, currentDirectory, options, environment) {
        return isUrlRe.test( filename ) || isUrlRe.test(currentDirectory);
    },

    loadFile(filename, currentDirectory, options, environment) {
        return new Promise((fulfill, reject) => {
            if (request === undefined) {
                try { request = require('needle'); }
                catch (e) { request = null; }
            }
            if (!request) {
                reject({ type: 'File', message: 'optional dependency \'needle\' required to import over http(s)\n' });
                return;
            }

            let urlStr = isUrlRe.test( filename ) ? filename : url.resolve(currentDirectory, filename);

            /** native-request currently has a bug */
            const hackUrlStr = urlStr.indexOf('?') === -1 ? urlStr + '?' : urlStr

            request.get(hackUrlStr, { follow_max: 5 }, (err, resp, body) => {
                if (err || resp && resp.statusCode >= 400) {
                    const message = resp && resp.statusCode === 404
                        ? `resource '${urlStr}' was not found\n`
                        : `resource '${urlStr}' gave this Error:\n  ${err || resp.statusMessage || resp.statusCode}\n`;
                    reject({ type: 'File', message });
                    return;
                }
                if (resp.statusCode >= 300) {
                    reject({ type: 'File', message: `resource '${urlStr}' caused too many redirects` });
                    return;
                }
                body = body.toString('utf8');
                if (!body) {
                    logger.warn(`Warning: Empty body (HTTP ${resp.statusCode}) returned by "${urlStr}"`);
                }
                fulfill({ contents: body || '', filename: urlStr });
            });
        });
    }
});

export default UrlFileManager;
