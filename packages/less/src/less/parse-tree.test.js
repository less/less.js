import { describe, it, expect, vi, beforeEach } from 'vitest';
import parseTreeFactory from './parse-tree.js';

// Mock dependencies
vi.mock('./less-error', () => ({
    default: class LessError extends Error {
        constructor(e, imports) {
            super(e.message || e);
            this.name = 'LessError';
            this.type = e.type || 'Syntax';
            this.filename = e.filename;
            this.index = e.index;
            this.line = e.line;
            this.column = e.column;
            this.callLine = e.callLine;
            this.callExtract = e.callExtract;
            this.extract = e.extract;
            this.imports = imports;
        }
    }
}));

vi.mock('./transform-tree', () => ({
    default: vi.fn()
}));

vi.mock('./logger', () => ({
    default: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn()
    }
}));

// Import mocked modules
import LessError from './less-error';
import transformTree from './transform-tree';
import logger from './logger';

describe('ParseTree', () => {
    let ParseTree;
    let mockSourceMapBuilder;
    let mockRoot;
    let mockImports;
    let mockEvaldRoot;
    let mockOptions;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock SourceMapBuilder
        mockSourceMapBuilder = function(sourceMapOptions) {
            this.sourceMapOptions = sourceMapOptions;
            this.toCSS = vi.fn();
            this.getExternalSourceMap = vi.fn();
        };

        // Create ParseTree class with mocked SourceMapBuilder
        ParseTree = parseTreeFactory(mockSourceMapBuilder);

        // Setup common test data
        mockRoot = { type: 'root', value: 'test' };
        mockImports = {
            files: {
                'main.less': { filename: 'main.less' },
                'import1.less': { filename: 'import1.less' },
                'import2.less': { filename: 'import2.less' }
            },
            rootFilename: 'main.less'
        };

        // Setup mock evaluated root
        mockEvaldRoot = {
            toCSS: vi.fn().mockReturnValue('body { color: red; }')
        };

        // Setup default options
        mockOptions = {
            compress: false,
            strictUnits: true,
            dumpLineNumbers: 'comments'
        };

        // Setup default transformTree behavior
        transformTree.mockReturnValue(mockEvaldRoot);
    });

    describe('constructor', () => {
        it('should initialize with root and imports', () => {
            const parseTree = new ParseTree(mockRoot, mockImports);
            
            expect(parseTree.root).toBe(mockRoot);
            expect(parseTree.imports).toBe(mockImports);
        });
    });

    describe('toCSS', () => {
        describe('basic functionality', () => {
            it('should transform tree and return CSS', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const result = parseTree.toCSS(mockOptions);

                expect(transformTree).toHaveBeenCalledWith(mockRoot, mockOptions);
                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith({
                    compress: false,
                    dumpLineNumbers: 'comments',
                    strictUnits: true,
                    numPrecision: 8
                });
                expect(result.css).toBe('body { color: red; }');
                expect(result.imports).toEqual(['import1.less', 'import2.less']);
            });

            it('should handle minimal options', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const minimalOptions = {};
                const result = parseTree.toCSS(minimalOptions);

                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith({
                    compress: false,
                    dumpLineNumbers: undefined,
                    strictUnits: false,
                    numPrecision: 8
                });
                expect(result.css).toBe('body { color: red; }');
            });
        });

        describe('compress option', () => {
            it('should warn when compress option is true', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const compressOptions = { ...mockOptions, compress: true };
                
                parseTree.toCSS(compressOptions);

                expect(logger.warn).toHaveBeenCalledWith(
                    'The compress option has been deprecated. ' + 
                    'We recommend you use a dedicated css minifier, for instance see less-plugin-clean-css.'
                );
                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith({
                    compress: true,
                    dumpLineNumbers: 'comments',
                    strictUnits: true,
                    numPrecision: 8
                });
            });

            it('should not warn when compress option is false', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const noCompressOptions = { ...mockOptions, compress: false };
                
                parseTree.toCSS(noCompressOptions);

                expect(logger.warn).not.toHaveBeenCalled();
            });

            it('should handle compress as string "true"', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const compressOptions = { ...mockOptions, compress: 'true' };
                
                parseTree.toCSS(compressOptions);

                expect(logger.warn).toHaveBeenCalled();
                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith(
                    expect.objectContaining({ compress: true })
                );
            });
        });

        describe('source map generation', () => {
            it('should generate source map when sourceMap option is provided', () => {
                const sourceMapOptions = { 
                    ...mockOptions, 
                    sourceMap: { 
                        outputFilename: 'output.css',
                        sourceMapFilename: 'output.css.map'
                    } 
                };

                const mockSourceMapInstance = new mockSourceMapBuilder(sourceMapOptions.sourceMap);
                mockSourceMapInstance.toCSS.mockReturnValue('body { color: red; }\n/*# sourceMappingURL=output.css.map */');
                mockSourceMapInstance.getExternalSourceMap.mockReturnValue('{"version":3,"sources":["main.less"],"mappings":"AAAA"}');
                
                // Override the mock to use our instance
                mockSourceMapBuilder = vi.fn().mockImplementation(() => mockSourceMapInstance);
                ParseTree = parseTreeFactory(mockSourceMapBuilder);
                const parseTreeWithSourceMap = new ParseTree(mockRoot, mockImports);
                
                const result = parseTreeWithSourceMap.toCSS(sourceMapOptions);

                expect(mockSourceMapBuilder).toHaveBeenCalledWith(sourceMapOptions.sourceMap);
                expect(mockSourceMapInstance.toCSS).toHaveBeenCalledWith(
                    mockEvaldRoot,
                    {
                        compress: false,
                        dumpLineNumbers: 'comments',
                        strictUnits: true,
                        numPrecision: 8
                    },
                    mockImports
                );
                expect(result.css).toBe('body { color: red; }\n/*# sourceMappingURL=output.css.map */');
                expect(result.map).toBe('{"version":3,"sources":["main.less"],"mappings":"AAAA"}');
            });

            it('should not generate source map when sourceMap option is not provided', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const result = parseTree.toCSS(mockOptions);

                expect(result.map).toBeUndefined();
                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith({
                    compress: false,
                    dumpLineNumbers: 'comments',
                    strictUnits: true,
                    numPrecision: 8
                });
            });
        });

        describe('plugin post-processors', () => {
            it('should apply post-processors in order', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const processor1 = {
                    process: vi.fn().mockImplementation(css => css + '\n/* Processed by 1 */')
                };
                const processor2 = {
                    process: vi.fn().mockImplementation(css => css + '\n/* Processed by 2 */')
                };
                
                const optionsWithPlugins = {
                    ...mockOptions,
                    pluginManager: {
                        getPostProcessors: vi.fn().mockReturnValue([processor1, processor2])
                    }
                };

                const result = parseTree.toCSS(optionsWithPlugins);

                expect(processor1.process).toHaveBeenCalledWith(
                    'body { color: red; }',
                    { sourceMap: undefined, options: optionsWithPlugins, imports: mockImports }
                );
                expect(processor2.process).toHaveBeenCalledWith(
                    'body { color: red; }\n/* Processed by 1 */',
                    { sourceMap: undefined, options: optionsWithPlugins, imports: mockImports }
                );
                expect(result.css).toBe('body { color: red; }\n/* Processed by 1 */\n/* Processed by 2 */');
            });

            it('should pass sourceMapBuilder to post-processors when using source maps', () => {
                const mockSourceMapInstance = new mockSourceMapBuilder({ outputFilename: 'test.css' });
                mockSourceMapInstance.toCSS.mockReturnValue('body { color: red; }');
                mockSourceMapInstance.getExternalSourceMap.mockReturnValue('{"version":3}');
                
                mockSourceMapBuilder = vi.fn().mockImplementation(() => mockSourceMapInstance);
                ParseTree = parseTreeFactory(mockSourceMapBuilder);
                
                const parseTree = new ParseTree(mockRoot, mockImports);
                const processor = {
                    process: vi.fn().mockImplementation((css, opts) => {
                        expect(opts.sourceMap).toBe(mockSourceMapInstance);
                        return css;
                    })
                };
                
                const optionsWithPlugins = {
                    ...mockOptions,
                    sourceMap: { outputFilename: 'test.css' },
                    pluginManager: {
                        getPostProcessors: vi.fn().mockReturnValue([processor])
                    }
                };

                parseTree.toCSS(optionsWithPlugins);

                expect(processor.process).toHaveBeenCalled();
            });

            it('should handle empty post-processors array', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const optionsWithPlugins = {
                    ...mockOptions,
                    pluginManager: {
                        getPostProcessors: vi.fn().mockReturnValue([])
                    }
                };

                const result = parseTree.toCSS(optionsWithPlugins);

                expect(result.css).toBe('body { color: red; }');
            });

            it('should handle pluginManager without post-processors', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const optionsWithPlugins = {
                    ...mockOptions,
                    pluginManager: {}
                };

                expect(() => parseTree.toCSS(optionsWithPlugins)).toThrow();
            });
        });

        describe('error handling', () => {
            it('should wrap transformTree errors in LessError', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const originalError = new Error('Transform failed');
                originalError.type = 'Transform';
                originalError.filename = 'test.less';
                originalError.line = 10;
                
                transformTree.mockImplementation(() => {
                    throw originalError;
                });

                expect(() => parseTree.toCSS(mockOptions)).toThrow(LessError);
                
                try {
                    parseTree.toCSS(mockOptions);
                } catch (e) {
                    expect(e.imports).toBe(mockImports);
                    expect(e.message).toBe('Transform failed');
                    expect(e.type).toBe('Transform');
                    expect(e.filename).toBe('test.less');
                    expect(e.line).toBe(10);
                }
            });

            it('should wrap toCSS errors in LessError', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const cssError = new Error('CSS generation failed');
                cssError.type = 'CSS';
                
                mockEvaldRoot.toCSS.mockImplementation(() => {
                    throw cssError;
                });

                expect(() => parseTree.toCSS(mockOptions)).toThrow(LessError);
                
                try {
                    parseTree.toCSS(mockOptions);
                } catch (e) {
                    expect(e.imports).toBe(mockImports);
                    expect(e.message).toBe('CSS generation failed');
                    expect(e.type).toBe('CSS');
                }
            });

            it('should wrap sourceMapBuilder.toCSS errors in LessError', () => {
                const mockSourceMapInstance = new mockSourceMapBuilder({ outputFilename: 'test.css' });
                const sourceMapError = new Error('Source map generation failed');
                
                mockSourceMapInstance.toCSS.mockImplementation(() => {
                    throw sourceMapError;
                });
                
                mockSourceMapBuilder = vi.fn().mockImplementation(() => mockSourceMapInstance);
                ParseTree = parseTreeFactory(mockSourceMapBuilder);
                
                const parseTree = new ParseTree(mockRoot, mockImports);
                const optionsWithSourceMap = {
                    ...mockOptions,
                    sourceMap: { outputFilename: 'test.css' }
                };

                expect(() => parseTree.toCSS(optionsWithSourceMap)).toThrow(LessError);
                
                try {
                    parseTree.toCSS(optionsWithSourceMap);
                } catch (e) {
                    expect(e.imports).toBe(mockImports);
                    expect(e.message).toBe('Source map generation failed');
                }
            });

            it('should handle post-processor errors', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const processorError = new Error('Post-processor failed');
                
                const processor = {
                    process: vi.fn().mockImplementation(() => {
                        throw processorError;
                    })
                };
                
                const optionsWithPlugins = {
                    ...mockOptions,
                    pluginManager: {
                        getPostProcessors: vi.fn().mockReturnValue([processor])
                    }
                };

                expect(() => parseTree.toCSS(optionsWithPlugins)).toThrow('Post-processor failed');
            });
        });

        describe('imports handling', () => {
            it('should return all imports except root filename', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const result = parseTree.toCSS(mockOptions);

                expect(result.imports).toEqual(['import1.less', 'import2.less']);
                expect(result.imports).not.toContain('main.less');
            });

            it('should handle no imports', () => {
                const parseTree = new ParseTree(mockRoot, {
                    files: { 'main.less': { filename: 'main.less' } },
                    rootFilename: 'main.less'
                });
                const result = parseTree.toCSS(mockOptions);

                expect(result.imports).toEqual([]);
            });

            it('should handle empty imports object', () => {
                const parseTree = new ParseTree(mockRoot, {
                    files: {},
                    rootFilename: 'main.less'
                });
                const result = parseTree.toCSS(mockOptions);

                expect(result.imports).toEqual([]);
            });

            it('should handle imports with inherited properties', () => {
                const baseImports = { 
                    'base.less': { filename: 'base.less' }
                };
                const imports = {
                    files: Object.create(baseImports),
                    rootFilename: 'main.less'
                };
                imports.files['main.less'] = { filename: 'main.less' };
                imports.files['import1.less'] = { filename: 'import1.less' };

                const parseTree = new ParseTree(mockRoot, imports);
                const result = parseTree.toCSS(mockOptions);

                // Should only include own properties, not inherited ones
                expect(result.imports).toEqual(['import1.less']);
                expect(result.imports).not.toContain('base.less');
            });

            it('should handle rootFilename not in files', () => {
                const parseTree = new ParseTree(mockRoot, {
                    files: {
                        'import1.less': { filename: 'import1.less' },
                        'import2.less': { filename: 'import2.less' }
                    },
                    rootFilename: 'nonexistent.less'
                });
                const result = parseTree.toCSS(mockOptions);

                expect(result.imports).toEqual(['import1.less', 'import2.less']);
            });
        });

        describe('options edge cases', () => {
            it('should handle strictUnits as string', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const options = { ...mockOptions, strictUnits: 'true' };
                
                parseTree.toCSS(options);

                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith(
                    expect.objectContaining({ strictUnits: true })
                );
            });

            it('should handle all boolean options as strings', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const options = { 
                    compress: '1',
                    strictUnits: 'yes',
                    dumpLineNumbers: false
                };
                
                parseTree.toCSS(options);

                expect(logger.warn).toHaveBeenCalled(); // compress is truthy
                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith({
                    compress: true,
                    dumpLineNumbers: false,
                    strictUnits: true,
                    numPrecision: 8
                });
            });

            it('should always set numPrecision to 8', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const options = { numPrecision: 10 }; // Try to override
                
                parseTree.toCSS(options);

                expect(mockEvaldRoot.toCSS).toHaveBeenCalledWith(
                    expect.objectContaining({ numPrecision: 8 })
                );
            });
        });

        describe('result object structure', () => {
            it('should return object with css and imports properties', () => {
                const parseTree = new ParseTree(mockRoot, mockImports);
                const result = parseTree.toCSS(mockOptions);

                expect(result).toHaveProperty('css');
                expect(result).toHaveProperty('imports');
                expect(Object.keys(result)).toEqual(['css', 'imports']);
            });

            it('should include map property when sourceMap is enabled', () => {
                const mockSourceMapInstance = new mockSourceMapBuilder({});
                mockSourceMapInstance.toCSS.mockReturnValue('css with map');
                mockSourceMapInstance.getExternalSourceMap.mockReturnValue('map data');
                
                mockSourceMapBuilder = vi.fn().mockImplementation(() => mockSourceMapInstance);
                ParseTree = parseTreeFactory(mockSourceMapBuilder);
                
                const parseTree = new ParseTree(mockRoot, mockImports);
                const result = parseTree.toCSS({ ...mockOptions, sourceMap: {} });

                expect(result).toHaveProperty('css');
                expect(result).toHaveProperty('imports');
                expect(result).toHaveProperty('map');
                expect(Object.keys(result).sort()).toEqual(['css', 'imports', 'map']);
            });
        });
    });
});