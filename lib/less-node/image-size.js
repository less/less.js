import Dimension from "../less/tree/dimension";
import Expression from "../less/tree/expression";
import functionRegistry from "./../less/functions/function-registry";
import sizeOf from "image-size";

export default function (environment) {

    function imageSize(functionContext, filePathNode) {
        let filePath = filePathNode.value;
        const currentFileInfo = functionContext.currentFileInfo;
        const currentDirectory = currentFileInfo.relativeUrls ?
        currentFileInfo.currentDirectory : currentFileInfo.entryPath;

        const fragmentStart = filePath.indexOf('#');
        if (fragmentStart !== -1) {
            filePath = filePath.slice(0, fragmentStart);
        }

        const fileManager = environment.getFileManager(filePath, currentDirectory, functionContext.context, environment, true);

        if (!fileManager) {
            throw {
                type: "File",
                message: "Can not set up FileManager for " + filePathNode
            };
        }

        const fileSync = fileManager.loadFileSync(filePath, currentDirectory, functionContext.context, environment);

        if (fileSync.error) {
            throw fileSync.error;
        }

        return sizeOf(fileSync.filename);
    }

    const imageFunctions = {
        "image-size"(filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Expression([
                new Dimension(size.width, "px"),
                new Dimension(size.height, "px")
            ]);
        },
        "image-width"(filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Dimension(size.width, "px");
        },
        "image-height"(filePathNode) {
            const size = imageSize(this, filePathNode);
            return new Dimension(size.height, "px");
        }
    };

    functionRegistry.addMultiple(imageFunctions);
}
