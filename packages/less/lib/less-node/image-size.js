import { createRequire } from 'module';
import fs from 'fs';
import Dimension from '../less/tree/dimension.js';
import Expression from '../less/tree/expression.js';
import functionRegistry from './../less/functions/function-registry.js';

const require = createRequire(import.meta.url);

export default environment => {

    function imageSize(functionContext, filePathNode) {
        let filePath = filePathNode.value;
        const currentFileInfo = functionContext.currentFileInfo;
        const currentDirectory = currentFileInfo.rewriteUrls ?
            currentFileInfo.currentDirectory : currentFileInfo.entryPath;

        const fragmentStart = filePath.indexOf('#');
        if (fragmentStart !== -1) {
            filePath = filePath.slice(0, fragmentStart);
        }

        const fileManager = environment.getFileManager(filePath, currentDirectory, functionContext.context, environment, true);

        if (!fileManager) {
            throw {
                type: 'File',
                message: `Can not set up FileManager for ${filePathNode}`
            };
        }

        const fileSync = fileManager.loadFileSync(filePath, currentDirectory, functionContext.context, environment);

        if (fileSync.error) {
            throw fileSync.error;
        }

        let probe;
        try {
            probe = require('probe-image-size/sync');
        } catch (_) {
            return { width: 0, height: 0 };
        }

        // Read the file as raw bytes via its resolved filename to ensure binary
        // integrity — the file manager may return string contents for text-mode
        // reads which corrupts binary image data and causes probe to return null.
        const contents = fs.readFileSync(fileSync.filename);

        const size = probe(contents);

        if (!size) {
            throw {
                type: 'File',
                message: `Unrecognised image format for '${filePath}'`
            };
        }

        return {
            width: size.width,
            height: size.height
        };
    }

    const imageFunctions = {
        'image-size': function (filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Expression([
                new Dimension(size.width, 'px'),
                new Dimension(size.height, 'px')
            ]);
        },
        'image-width': function (filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Dimension(size.width, 'px');
        },
        'image-height': function (filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Dimension(size.height, 'px');
        }
    };

    functionRegistry.addMultiple(imageFunctions);
};