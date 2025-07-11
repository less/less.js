import { describe, it, expect, beforeEach, vi } from 'vitest';
import SourceMapOutputFactory from './source-map-output.js';

describe('SourceMapOutput', () => {
    let mockEnvironment;
    let SourceMapOutput;
    let mockSourceMapGenerator;
    let mockRootNode;

    beforeEach(() => {
        // Mock source map generator
        mockSourceMapGenerator = {
            addMapping: vi.fn(),
            setSourceContent: vi.fn(),
            toJSON: vi.fn(() => ({ version: 3, sources: ['test.less'], mappings: 'AAAA' }))
        };

        // Mock environment
        mockEnvironment = {
            getSourceMapGenerator: vi.fn(() => function MockSourceMapGenerator() {
                return mockSourceMapGenerator;
            }),
            encodeBase64: vi.fn((str) => Buffer.from(str).toString('base64'))
        };

        // Mock root node
        mockRootNode = {
            genCSS: vi.fn()
        };

        SourceMapOutput = SourceMapOutputFactory(mockEnvironment);
    });

    describe('constructor', () => {
        it('should initialize with basic options', () => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: { 'test.less': 'body { color: red; }' },
                contentsIgnoredCharsMap: {},
                outputFilename: 'output.css'
            };

            const sourceMapOutput = new SourceMapOutput(options);
            
            expect(sourceMapOutput._css).toEqual([]);
            expect(sourceMapOutput._rootNode).toBe(mockRootNode);
            expect(sourceMapOutput._contentsMap).toBe(options.contentsMap);
            expect(sourceMapOutput._outputFilename).toBe('output.css');
            expect(sourceMapOutput._lineNumber).toBe(0);
            expect(sourceMapOutput._column).toBe(0);
        });

        it('should normalize Windows paths in sourceMapFilename', () => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {},
                sourceMapFilename: 'C:\\path\\to\\map.css.map'
            };

            const sourceMapOutput = new SourceMapOutput(options);
            expect(sourceMapOutput._sourceMapFilename).toBe('C:/path/to/map.css.map');
        });

        it('should normalize and add trailing slash to sourceMapRootpath', () => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {},
                sourceMapRootpath: 'C:\\src\\styles'
            };

            const sourceMapOutput = new SourceMapOutput(options);
            expect(sourceMapOutput._sourceMapRootpath).toBe('C:/src/styles/');
        });

        it('should handle sourceMapRootpath that already has trailing slash', () => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {},
                sourceMapRootpath: '/src/styles/'
            };

            const sourceMapOutput = new SourceMapOutput(options);
            expect(sourceMapOutput._sourceMapRootpath).toBe('/src/styles/');
        });

        it('should set empty sourceMapRootpath when not provided', () => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {}
            };

            const sourceMapOutput = new SourceMapOutput(options);
            expect(sourceMapOutput._sourceMapRootpath).toBe('');
        });

        it('should normalize Windows paths in sourceMapBasepath', () => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {},
                sourceMapBasepath: 'C:\\project\\src'
            };

            const sourceMapOutput = new SourceMapOutput(options);
            expect(sourceMapOutput._sourceMapBasepath).toBe('C:/project/src');
        });
    });

    describe('removeBasepath', () => {
        let sourceMapOutput;

        beforeEach(() => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {},
                sourceMapBasepath: '/project/src'
            };
            sourceMapOutput = new SourceMapOutput(options);
        });

        it('should remove basepath when path starts with basepath', () => {
            const result = sourceMapOutput.removeBasepath('/project/src/styles/main.less');
            expect(result).toBe('styles/main.less');
        });

        it('should remove basepath and leading slash/backslash', () => {
            sourceMapOutput._sourceMapBasepath = '/project/src';
            expect(sourceMapOutput.removeBasepath('/project/src/main.less')).toBe('main.less');
            expect(sourceMapOutput.removeBasepath('/project/src\\main.less')).toBe('main.less');
        });

        it('should return original path when basepath does not match', () => {
            const result = sourceMapOutput.removeBasepath('/other/path/main.less');
            expect(result).toBe('/other/path/main.less');
        });

        it('should handle empty basepath', () => {
            sourceMapOutput._sourceMapBasepath = '';
            const result = sourceMapOutput.removeBasepath('/path/to/file.less');
            expect(result).toBe('/path/to/file.less');
        });
    });

    describe('normalizeFilename', () => {
        let sourceMapOutput;

        beforeEach(() => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {},
                sourceMapBasepath: '/project/src',
                sourceMapRootpath: '/assets/'
            };
            sourceMapOutput = new SourceMapOutput(options);
        });

        it('should normalize Windows paths to forward slashes', () => {
            const result = sourceMapOutput.normalizeFilename('C:\\project\\src\\styles\\main.less');
            expect(result).toBe('/assets/C:/project/src/styles/main.less');
        });

        it('should combine rootpath with filename after removing basepath', () => {
            const result = sourceMapOutput.normalizeFilename('/project/src/main.less');
            expect(result).toBe('/assets/main.less');
        });

        it('should handle empty rootpath', () => {
            sourceMapOutput._sourceMapRootpath = '';
            const result = sourceMapOutput.normalizeFilename('/project/src/main.less');
            expect(result).toBe('main.less');
        });
    });

    describe('add', () => {
        let sourceMapOutput;

        beforeEach(() => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {
                    'test.less': 'body {\n  color: red;\n}'
                },
                contentsIgnoredCharsMap: {}
            };
            sourceMapOutput = new SourceMapOutput(options);
        });

        it('should ignore empty chunks', () => {
            sourceMapOutput.add('');
            sourceMapOutput.add(null);
            sourceMapOutput.add(undefined);
            
            expect(sourceMapOutput._css).toEqual([]);
        });

        it('should add chunk without file info', () => {
            sourceMapOutput.add('body { color: blue; }');
            
            expect(sourceMapOutput._css).toEqual(['body { color: blue; }']);
            expect(sourceMapOutput._column).toBe(21);
            expect(sourceMapOutput._lineNumber).toBe(0);
        });

        it('should handle multi-line chunks', () => {
            sourceMapOutput.add('body {\n  color: blue;\n}');
            
            expect(sourceMapOutput._lineNumber).toBe(2);
            expect(sourceMapOutput._column).toBe(1);
        });

        it('should add chunk with file info and create mapping', () => {
            sourceMapOutput._sourceMapGenerator = mockSourceMapGenerator;
            const fileInfo = { filename: 'test.less' };
            
            sourceMapOutput.add('body { color: blue; }', fileInfo, 5);
            
            expect(mockSourceMapGenerator.addMapping).toHaveBeenCalledWith({
                generated: { line: 1, column: 0 },
                original: { line: 1, column: 5 },
                source: 'test.less'
            });
        });

        it('should handle mapLines option', () => {
            sourceMapOutput._sourceMapGenerator = mockSourceMapGenerator;
            const fileInfo = { filename: 'test.less' };
            
            sourceMapOutput.add('line1\nline2\nline3', fileInfo, 0, true);
            
            expect(mockSourceMapGenerator.addMapping).toHaveBeenCalledTimes(3);
            expect(mockSourceMapGenerator.addMapping).toHaveBeenNthCalledWith(1, {
                generated: { line: 1, column: 0 },
                original: { line: 1, column: 0 },
                source: 'test.less'
            });
            expect(mockSourceMapGenerator.addMapping).toHaveBeenNthCalledWith(2, {
                generated: { line: 2, column: 0 },
                original: { line: 2, column: 0 },
                source: 'test.less'
            });
        });

        it('should handle ignored characters', () => {
            sourceMapOutput._contentsIgnoredCharsMap = { 'test.less': 5 };
            sourceMapOutput._sourceMapGenerator = mockSourceMapGenerator;
            const fileInfo = { filename: 'test.less' };
            
            sourceMapOutput.add('color: blue;', fileInfo, 10);
            
            expect(mockSourceMapGenerator.addMapping).toHaveBeenCalledWith({
                generated: { line: 1, column: 0 },
                original: { line: 2, column: 3 },
                source: 'test.less'
            });
        });

        it('should handle negative index after ignored chars adjustment', () => {
            sourceMapOutput._contentsIgnoredCharsMap = { 'test.less': 10 };
            sourceMapOutput._sourceMapGenerator = mockSourceMapGenerator;
            const fileInfo = { filename: 'test.less' };
            
            sourceMapOutput.add('color: blue;', fileInfo, 5);
            
            expect(mockSourceMapGenerator.addMapping).toHaveBeenCalledWith({
                generated: { line: 1, column: 0 },
                original: { line: 1, column: 0 },
                source: 'test.less'
            });
        });

        it('should handle missing content in contentsMap', () => {
            const fileInfo = { filename: 'missing.less' };
            
            sourceMapOutput.add('body { color: blue; }', fileInfo, 0);
            
            expect(sourceMapOutput._css).toEqual(['body { color: blue; }']);
        });
    });

    describe('isEmpty', () => {
        let sourceMapOutput;

        beforeEach(() => {
            const options = {
                rootNode: mockRootNode,
                contentsMap: {},
                contentsIgnoredCharsMap: {}
            };
            sourceMapOutput = new SourceMapOutput(options);
        });

        it('should return true when no CSS has been added', () => {
            expect(sourceMapOutput.isEmpty()).toBe(true);
        });

        it('should return false when CSS has been added', () => {
            sourceMapOutput.add('body { color: red; }');
            expect(sourceMapOutput.isEmpty()).toBe(false);
        });
    });

    describe('toCSS', () => {
        let sourceMapOutput;
        let mockContext;

        beforeEach(() => {
            mockContext = {};
            const options = {
                rootNode: mockRootNode,
                contentsMap: {
                    'test.less': 'body { color: red; }'
                },
                contentsIgnoredCharsMap: {},
                outputFilename: 'output.css',
                outputSourceFiles: true
            };
            sourceMapOutput = new SourceMapOutput(options);
        });

        it('should generate CSS and source map', () => {
            mockRootNode.genCSS.mockImplementation((context, output) => {
                output.add('body { color: red; }');
            });

            const css = sourceMapOutput.toCSS(mockContext);
            
            expect(mockRootNode.genCSS).toHaveBeenCalledWith(mockContext, sourceMapOutput);
            expect(css).toBe('body { color: red; }');
            expect(sourceMapOutput.sourceMap).toBeDefined();
        });

        it('should set source content when outputSourceFiles is true', () => {
            mockRootNode.genCSS.mockImplementation((context, output) => {
                output.add('body { color: red; }');
            });

            sourceMapOutput.toCSS(mockContext);
            
            expect(mockSourceMapGenerator.setSourceContent).toHaveBeenCalledWith(
                'test.less',
                'body { color: red; }'
            );
        });

        it('should handle ignored characters in source content', () => {
            sourceMapOutput._contentsIgnoredCharsMap = { 'test.less': 5 };
            sourceMapOutput._contentsMap = { 'test.less': '/* */body { color: red; }' };
            
            mockRootNode.genCSS.mockImplementation((context, output) => {
                output.add('body { color: red; }');
            });

            sourceMapOutput.toCSS(mockContext);
            
            expect(mockSourceMapGenerator.setSourceContent).toHaveBeenCalledWith(
                'test.less',
                'body { color: red; }'
            );
        });

        it('should set sourceMapURL from options', () => {
            sourceMapOutput.sourceMapURL = 'custom.map';
            
            mockRootNode.genCSS.mockImplementation((context, output) => {
                output.add('body { color: red; }');
            });

            sourceMapOutput.toCSS(mockContext);
            
            expect(sourceMapOutput.sourceMapURL).toBe('custom.map');
        });

        it('should use sourceMapFilename as URL when no sourceMapURL', () => {
            sourceMapOutput._sourceMapFilename = 'output.css.map';
            
            mockRootNode.genCSS.mockImplementation((context, output) => {
                output.add('body { color: red; }');
            });

            sourceMapOutput.toCSS(mockContext);
            
            expect(sourceMapOutput.sourceMapURL).toBe('output.css.map');
        });

        it('should return empty string when no CSS generated', () => {
            const css = sourceMapOutput.toCSS(mockContext);
            expect(css).toBe('');
            expect(sourceMapOutput.sourceMap).toBeUndefined();
        });

        it('should not set source content when outputSourceFiles is false', () => {
            sourceMapOutput._outputSourceFiles = false;
            
            mockRootNode.genCSS.mockImplementation((context, output) => {
                output.add('body { color: red; }');
            });

            sourceMapOutput.toCSS(mockContext);
            
            expect(mockSourceMapGenerator.setSourceContent).not.toHaveBeenCalled();
        });
    });
});