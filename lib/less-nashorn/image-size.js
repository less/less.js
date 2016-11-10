module.exports = function(environment) {
    var Dimension = require("../less/tree/dimension"),
        Expression = require("../less/tree/expression"),
        functionRegistry = require("./../less/functions/function-registry");

    function imageSize(functionContext, filePathNode) {
        var filePath = filePathNode.value;
        var currentFileInfo = functionContext.currentFileInfo;
        var currentDirectory = currentFileInfo.relativeUrls ?
            currentFileInfo.currentDirectory : currentFileInfo.entryPath;

        var fragmentStart = filePath.indexOf('#');
        var fragment = '';
        if (fragmentStart !== -1) {
            fragment = filePath.slice(fragmentStart);
            filePath = filePath.slice(0, fragmentStart);
        }

        var fileManager = environment.getFileManager(filePath, currentDirectory, functionContext.context, environment, true);

        if (!fileManager) {
            throw {
                type: "File",
                message: "Can not set up FileManager for " + filePathNode
            };
        }

        var fileSync = fileManager.loadFileSync(filePath, currentDirectory, functionContext.context, environment);

        if (fileSync.error) {
            throw fileSync.error;
        }

        var inputByteStream = new java.io.ByteArrayInputStream((fileSync.contents instanceof java.lang.String) ? fileSync.contents.getBytes() : fileSync.contents);
        if (/\.svg$/i.test(filePath))
        {
            var xml = javax.xml.parsers.DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(inputByteStream);
            if (xml.getDocumentElement().getAttribute('width') && xml.getDocumentElement().getAttribute('height'))
                return { width : xml.getDocumentElement().getAttribute('width'), height : xml.getDocumentElement().getAttribute('height')};
        }

        var bimg = javax.imageio.ImageIO.read(inputByteStream);
        return { width: bimg.getWidth(), height: bimg.getHeight() };
    }

    var imageFunctions = {
        "image-size": function(filePathNode) {
            var size = imageSize(this, filePathNode);
            return new Expression([
                new Dimension(size.width, "px"),
                new Dimension(size.height, "px")
            ]);
        },
        "image-width": function(filePathNode) {
            var size = imageSize(this, filePathNode);
            return new Dimension(size.width, "px");
        },
        "image-height": function(filePathNode) {
            var size = imageSize(this, filePathNode);
            return new Dimension(size.height, "px");
        }
    };

    functionRegistry.addMultiple(imageFunctions);
};
