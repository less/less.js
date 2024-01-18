import Dimension from '../less/tree/dimension';
import Expression from '../less/tree/expression';
import functionRegistry from './../less/functions/function-registry';

export default environment => {

    function imageSize(functionContext, filePathNode) {
        let filePath;
        
        if (filePathNode.type === 'Url') {
            filePath = filePathNode.value.value;
        }
        else if (filePathNode.type === 'Quoted') {
            filePath = filePathNode.value;
        }

        if (typeof filePath !== 'string') {
            throw {
                type :'Argument',
                message: 'invalid argument for \'image-size\' function'
            }
        }

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

        const sizeOf = require('image-size');
        return sizeOf(fileSync.filename);
    }

    const imageFunctions = {
        'image-size': function(filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Expression([
                new Dimension(size.width, 'px'),
                new Dimension(size.height, 'px')
            ]);
        },
        'image-width': function(filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Dimension(size.width, 'px');
        },
        'image-height': function(filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Dimension(size.height, 'px');
        }
    };

    functionRegistry.addMultiple(imageFunctions);
};
