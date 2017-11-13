import path from 'path';
import fs from './fs';
import AbstractFileManager from "../less/environment/abstract-file-manager";

const PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;

export default class FileManager extends AbstractFileManager {
    constructor() {
        super();
        this.files = Object.create(null);
    }

    supports(filename, currentDirectory, options, environment) {
        return true;
    }

    supportsSync(filename, currentDirectory, options, environment) {
        return true;
    }

    loadFile(filename, currentDirectory, options, environment, callback) {
        let fullFilename;
        const isAbsoluteFilename = this.isPathAbsolute(filename);
        const filenamesTried = [];
        const prefix = filename.slice(0, 1);
        const explicit = prefix === "." || prefix === "/";
        let result = null;

        options = options || {};

        const paths = isAbsoluteFilename ? [''] : [currentDirectory];

        if (options.paths) { paths.push.apply(paths, options.paths); }

        // Search node_modules
        if (!explicit) { paths.push.apply(paths, this.modulePaths); }

        if (!isAbsoluteFilename && !paths.includes('.')) { paths.push('.'); }

        const prefixes = options.prefixes || [''];
        const fileParts = this.extractUrlParts(filename);
        
        if (options.syncImport) {
            if (options.syncImport) {
                getFileData(returnData, returnData);
                if (callback) {
                    callback(result.error, result);
                }
                else {
                    return result;
                }
            }
        }
        else {
            // promise is guaranteed to be asyncronous
            // which helps as it allows the file handle
            // to be closed before it continues with the next file
            return new PromiseConstructor(getFileData);
        }

        function returnData(data) {
            if (!data.filename) {
                result = { error: data };
            }
            else {
                result = data;
            }
        }

        const self = this;
        function getFileData(fulfill, reject) {
            (function tryPathIndex(i) {
                if (i < paths.length) {
                    (function tryPrefix(j) {
                        if (j < prefixes.length) {
                            fullFilename = fileParts.rawPath + prefixes[j] + fileParts.filename;
    
                            if (paths[i]) {
                                fullFilename = path.join(paths[i], fullFilename);
                            }
    
                            if (paths[i].indexOf('node_modules') > -1) {
                                try {
                                    fullFilename = require.resolve(fullFilename);
                                }
                                catch (e) {}
                            }
                            
                            fullFilename = options.ext ? self.tryAppendExtension(fullFilename, options.ext) : fullFilename;
    
                            if (self.files[fullFilename]) {
                                fulfill({ contents: self.files[fullFilename], filename: fullFilename});
                            }
                            else {
                                var readFileArgs = [fullFilename];
                                if (!options.rawBuffer) {
                                    readFileArgs.push('utf-8');
                                }
                                if (options.syncImport) {
                                    try {
                                        const data = fs.readFileSync(...readFileArgs);
                                        self.files[fullFilename] = data;
                                        fulfill({ contents: data, filename: fullFilename});
                                    }
                                    catch (e) {
                                        filenamesTried.push(fullFilename);
                                        return tryPrefix(j + 1);
                                    }
                                }
                                else {
                                    readFileArgs.push((e, data) => {
                                        if (e) { 
                                            filenamesTried.push(fullFilename);
                                            return tryPrefix(j + 1);
                                        }
                                        self.files[fullFilename] = data;
                                        fulfill({ contents: data, filename: fullFilename});
                                    });
                                    fs.readFile(...readFileArgs);
                                }
    
                            }
    
                        }
                        else {
                            tryPathIndex(i + 1);
                        }
                    })(0);
                } else {
                    reject({ type: 'File', message: "'" + filename + "' wasn't found. Tried - " + filenamesTried.join(",") });
                }
            }(0));
        }
    }

    loadFileSync(filename, currentDirectory, options, environment) {
        options.syncImport = true;
        return this.loadFile(filename, currentDirectory, options, environment);
    }
}
