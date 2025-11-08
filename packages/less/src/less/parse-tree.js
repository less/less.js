import LessError from './less-error';
import transformTree from './transform-tree';
import logger from './logger';

export default function(SourceMapBuilder) {
    class ParseTree {
        constructor(root, imports) {
            this.root = root;
            this.imports = imports;
        }

        toCSS(options) {
            let evaldRoot;
            const result = {};
            let sourceMapBuilder;
            try {
                evaldRoot = transformTree(this.root, options);
            } catch (e) {
                throw new LessError(e, this.imports);
            }

            try {
                const compress = Boolean(options.compress);
                if (compress) {
                    logger.warn('The compress option has been deprecated. ' + 
                        'We recommend you use a dedicated css minifier, for instance see less-plugin-clean-css.');
                }

                const toCSSOptions = {
                    compress,
                    dumpLineNumbers: options.dumpLineNumbers,
                    strictUnits: Boolean(options.strictUnits),
                    numPrecision: 8};

                if (options.sourceMap) {
                    // Normalize sourceMap option: if it's just true, convert to object
                    if (options.sourceMap === true) {
                        options.sourceMap = {};
                    }
                    const sourceMapOpts = options.sourceMap;
                    
                    // Set sourceMapInputFilename if not set and filename is available
                    if (!sourceMapOpts.sourceMapInputFilename && options.filename) {
                        sourceMapOpts.sourceMapInputFilename = options.filename;
                    }
                    
                    // Default sourceMapBasepath to the input file's directory if not set
                    // This matches the behavior documented and implemented in bin/lessc
                    if (sourceMapOpts.sourceMapBasepath === undefined && options.filename) {
                        // Get directory from filename using string manipulation (works cross-platform)
                        const lastSlash = Math.max(options.filename.lastIndexOf('/'), options.filename.lastIndexOf('\\'));
                        if (lastSlash >= 0) {
                            sourceMapOpts.sourceMapBasepath = options.filename.substring(0, lastSlash);
                        } else {
                            // No directory separator found, use current directory
                            sourceMapOpts.sourceMapBasepath = '.';
                        }
                    }
                    
                    // Handle sourceMapFullFilename (CLI-specific: --source-map=filename)
                    // This is converted to sourceMapFilename and sourceMapOutputFilename
                    if (sourceMapOpts.sourceMapFullFilename && !sourceMapOpts.sourceMapFileInline) {
                        // This case is handled by lessc before calling render
                        // We just need to ensure sourceMapFilename is set if sourceMapFullFilename is provided
                        if (!sourceMapOpts.sourceMapFilename && !sourceMapOpts.sourceMapURL) {
                            // Extract just the basename for the sourceMappingURL comment
                            const mapBase = sourceMapOpts.sourceMapFullFilename.split(/[/\\]/).pop();
                            sourceMapOpts.sourceMapFilename = mapBase;
                        }
                    } else if (!sourceMapOpts.sourceMapFilename && !sourceMapOpts.sourceMapURL) {
                        // If sourceMapFilename is not set and sourceMapURL is not set,
                        // derive it from the output filename (if available) or input filename
                        if (sourceMapOpts.sourceMapOutputFilename) {
                            // Use output filename + .map
                            sourceMapOpts.sourceMapFilename = sourceMapOpts.sourceMapOutputFilename + '.map';
                        } else if (options.filename) {
                            // Fallback to input filename + .css.map
                            const inputBase = options.filename.replace(/\.[^/.]+$/, '');
                            sourceMapOpts.sourceMapFilename = inputBase + '.css.map';
                        }
                    }
                    
                    // Default sourceMapOutputFilename if not set
                    if (!sourceMapOpts.sourceMapOutputFilename) {
                        if (options.filename) {
                            const inputBase = options.filename.replace(/\.[^/.]+$/, '');
                            sourceMapOpts.sourceMapOutputFilename = inputBase + '.css';
                        } else {
                            sourceMapOpts.sourceMapOutputFilename = 'output.css';
                        }
                    }
                    
                    sourceMapBuilder = new SourceMapBuilder(sourceMapOpts);
                    result.css = sourceMapBuilder.toCSS(evaldRoot, toCSSOptions, this.imports);
                } else {
                    result.css = evaldRoot.toCSS(toCSSOptions);
                }
            } catch (e) {
                throw new LessError(e, this.imports);
            }

            if (options.pluginManager) {
                const postProcessors = options.pluginManager.getPostProcessors();
                for (let i = 0; i < postProcessors.length; i++) {
                    result.css = postProcessors[i].process(result.css, { sourceMap: sourceMapBuilder, options, imports: this.imports });
                }
            }
            if (options.sourceMap) {
                result.map = sourceMapBuilder.getExternalSourceMap();
            }

            result.imports = [];
            for (const file in this.imports.files) {
                if (Object.prototype.hasOwnProperty.call(this.imports.files, file) && file !== this.imports.rootFilename) {
                    result.imports.push(file);
                }
            }
            return result;
        }
    }

    return ParseTree;
}
