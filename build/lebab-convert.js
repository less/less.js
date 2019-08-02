/** @todo - REMOVE - original script to convert project to ES6 */

const transform = require("lebab").transform;
const readGlob = require("read-glob");
const fs = require("fs");
const path = require("path");

readGlob("./../bin/lessc").subscribe({
    next(result) {
        if (result.path.indexOf("source-map/") === -1) {
            try {
                const { code, warnings } = transform(
                    result.contents.toString(),
                    [
                        "arrow",
                        "arrow-return",
                        "arg-rest",
                        "arg-spread",
                        "obj-shorthand",
                        "multi-var",
                        "let",
                        "class",
                        "commonjs",
                        "template",
                        "default-param"
                    ]
                );

                fs.writeFileSync(path.join(result.cwd, result.path), code);
            } catch (e) {
                console.error(e);
            }
        }
    }
});
