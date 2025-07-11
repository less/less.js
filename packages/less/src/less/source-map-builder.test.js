import { describe, it, expect, beforeEach, vi } from 'vitest';
import SourceMapBuilderFactory from './source-map-builder.js';

describe('SourceMapBuilder', () => {
    let mockSourceMapOutput;
    let mockEnvironment;
    let SourceMapBuilder;
    let mockRootNode;
    let mockImports;

    beforeEach(() => {
        // Mock SourceMapOutput class
        mockSourceMapOutput = {
            toCSS: vi.fn(() => 'body { color: red; }'),
            sourceMap: '{"version":3,"sources":["test.less"],"mappings":"AAAA"}',
            sourceMapURL: 'test.css.map',
            normalizeFilename: vi.fn((filename) => filename.replace(/\\/g, '/')),
            removeBasepath: vi.fn((path) => path.replace('/project/', ''))
        };

        function MockSourceMapOutputClass() {
            return mockSourceMapOutput;
        }

        // Mock environment
        mockEnvironment = {
            encodeBase64: vi.fn((str) => Buffer.from(str).toString('base64'))
        };

        // Mock root node
        mockRootNode = {};

        // Mock imports
        mockImports = {
            contents: { 'test.less': 'body { color: red; }' },
            contentsIgnoredChars: {}
        };

        SourceMapBuilder = SourceMapBuilderFactory(MockSourceMapOutputClass, mockEnvironment);
    });

    describe('constructor', () => {
        it('should initialize with options', () => {
            const options = {
                sourceMapFilename: 'output.css.map',
                sourceMapURL: 'custom.map'
            };

            const builder = new SourceMapBuilder(options);
            expect(builder.options).toBe(options);
        });

        it('should handle empty options', () => {
            const builder = new SourceMapBuilder({});
            expect(builder.options).toEqual({});
        });
    });

    describe('toCSS', () => {
        let builder;
        let options;

        beforeEach(() => {
            options = {
                sourceMapFilename: 'output.css.map',
                sourceMapURL: 'custom.map',
                sourceMapOutputFilename: 'output.css',
                sourceMapBasepath: '/project/',
                sourceMapRootpath: '/assets/',
                outputSourceFiles: true,
                sourceMapGenerator: {},
                sourceMapFileInline: false,
                disableSourcemapAnnotation: false
            };
            builder = new SourceMapBuilder(options);
        });

        it('should create SourceMapOutput with correct options', () => {
            const css = builder.toCSS(mockRootNode, {}, mockImports);

            expect(mockSourceMapOutput.toCSS).toHaveBeenCalledWith({});
            expect(css).toContain('body { color: red; }');
        });

        it('should set sourceMap and sourceMapURL from output', () => {
            builder.toCSS(mockRootNode, {}, mockImports);

            expect(builder.sourceMap).toBe(mockSourceMapOutput.sourceMap);
            expect(builder.sourceMapURL).toBe(mockSourceMapOutput.sourceMapURL);
        });

        it('should normalize sourceMapInputFilename when provided', () => {
            builder.options.sourceMapInputFilename = 'C:\\project\\input.less';
            
            builder.toCSS(mockRootNode, {}, mockImports);

            expect(mockSourceMapOutput.normalizeFilename).toHaveBeenCalledWith('C:\\project\\input.less');
            expect(builder.sourceMapInputFilename).toBe('C:/project/input.less');
        });

        it('should remove basepath from sourceMapURL when both are defined', () => {
            builder.options.sourceMapBasepath = '/project/';
            mockSourceMapOutput.sourceMapURL = '/project/styles/output.css.map';
            
            builder.toCSS(mockRootNode, {}, mockImports);

            expect(mockSourceMapOutput.removeBasepath).toHaveBeenCalledWith('/project/styles/output.css.map');
            expect(builder.sourceMapURL).toBe('styles/output.css.map');
        });

        it('should not remove basepath when sourceMapBasepath is undefined', () => {
            builder.options.sourceMapBasepath = undefined;
            mockSourceMapOutput.sourceMapURL = '/project/styles/output.css.map';
            
            builder.toCSS(mockRootNode, {}, mockImports);

            expect(mockSourceMapOutput.removeBasepath).not.toHaveBeenCalled();
            expect(builder.sourceMapURL).toBe('/project/styles/output.css.map');
        });

        it('should not remove basepath when sourceMapURL is undefined', () => {
            builder.options.sourceMapBasepath = '/project/';
            mockSourceMapOutput.sourceMapURL = undefined;
            
            builder.toCSS(mockRootNode, {}, mockImports);

            expect(mockSourceMapOutput.removeBasepath).not.toHaveBeenCalled();
        });

        it('should append CSS appendage to result', () => {
            mockSourceMapOutput.sourceMapURL = 'test.css.map';
            
            const css = builder.toCSS(mockRootNode, {}, mockImports);

            expect(css).toBe('body { color: red; }/*# sourceMappingURL=test.css.map */');
        });
    });

    describe('getCSSAppendage', () => {
        let builder;

        beforeEach(() => {
            builder = new SourceMapBuilder({});
            builder.sourceMapURL = 'test.css.map';
        });

        it('should return source map comment with URL', () => {
            const appendage = builder.getCSSAppendage();
            expect(appendage).toBe('/*# sourceMappingURL=test.css.map */');
        });

        it('should return inline source map when sourceMapFileInline is true', () => {
            builder.options = { sourceMapFileInline: true };
            builder.sourceMap = '{"version":3}';
            mockEnvironment.encodeBase64.mockReturnValue('eyJ2ZXJzaW9uIjozfQ==');
            
            const appendage = builder.getCSSAppendage();
            
            expect(mockEnvironment.encodeBase64).toHaveBeenCalledWith('{"version":3}');
            expect(appendage).toBe('/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ== */');
        });

        it('should return empty string when sourceMapFileInline is true but no sourceMap', () => {
            builder.options = { sourceMapFileInline: true };
            builder.sourceMap = undefined;
            
            const appendage = builder.getCSSAppendage();
            expect(appendage).toBe('');
        });

        it('should return empty string when disableSourcemapAnnotation is true', () => {
            builder.options = { disableSourcemapAnnotation: true };
            
            const appendage = builder.getCSSAppendage();
            expect(appendage).toBe('');
        });

        it('should return empty string when no sourceMapURL', () => {
            builder.sourceMapURL = undefined;
            
            const appendage = builder.getCSSAppendage();
            expect(appendage).toBe('');
        });

        it('should return empty string when sourceMapURL is null', () => {
            builder.sourceMapURL = null;
            
            const appendage = builder.getCSSAppendage();
            expect(appendage).toBe('');
        });

        it('should return empty string when sourceMapURL is empty string', () => {
            builder.sourceMapURL = '';
            
            const appendage = builder.getCSSAppendage();
            expect(appendage).toBe('');
        });
    });

    describe('getExternalSourceMap', () => {
        it('should return the sourceMap', () => {
            const builder = new SourceMapBuilder({});
            builder.sourceMap = '{"version":3}';
            
            expect(builder.getExternalSourceMap()).toBe('{"version":3}');
        });

        it('should return undefined when no sourceMap', () => {
            const builder = new SourceMapBuilder({});
            
            expect(builder.getExternalSourceMap()).toBeUndefined();
        });
    });

    describe('setExternalSourceMap', () => {
        it('should set the sourceMap', () => {
            const builder = new SourceMapBuilder({});
            const sourceMap = '{"version":3}';
            
            builder.setExternalSourceMap(sourceMap);
            
            expect(builder.sourceMap).toBe(sourceMap);
        });
    });

    describe('isInline', () => {
        it('should return true when sourceMapFileInline is true', () => {
            const builder = new SourceMapBuilder({ sourceMapFileInline: true });
            expect(builder.isInline()).toBe(true);
        });

        it('should return false when sourceMapFileInline is false', () => {
            const builder = new SourceMapBuilder({ sourceMapFileInline: false });
            expect(builder.isInline()).toBe(false);
        });

        it('should return falsy when sourceMapFileInline is undefined', () => {
            const builder = new SourceMapBuilder({});
            expect(builder.isInline()).toBeFalsy();
        });
    });

    describe('getSourceMapURL', () => {
        it('should return the sourceMapURL', () => {
            const builder = new SourceMapBuilder({});
            builder.sourceMapURL = 'test.css.map';
            
            expect(builder.getSourceMapURL()).toBe('test.css.map');
        });

        it('should return undefined when no sourceMapURL', () => {
            const builder = new SourceMapBuilder({});
            
            expect(builder.getSourceMapURL()).toBeUndefined();
        });
    });

    describe('getOutputFilename', () => {
        it('should return sourceMapOutputFilename from options', () => {
            const builder = new SourceMapBuilder({ sourceMapOutputFilename: 'output.css' });
            
            expect(builder.getOutputFilename()).toBe('output.css');
        });

        it('should return undefined when no sourceMapOutputFilename', () => {
            const builder = new SourceMapBuilder({});
            
            expect(builder.getOutputFilename()).toBeUndefined();
        });
    });

    describe('getInputFilename', () => {
        it('should return sourceMapInputFilename', () => {
            const builder = new SourceMapBuilder({});
            builder.sourceMapInputFilename = 'input.less';
            
            expect(builder.getInputFilename()).toBe('input.less');
        });

        it('should return undefined when no sourceMapInputFilename', () => {
            const builder = new SourceMapBuilder({});
            
            expect(builder.getInputFilename()).toBeUndefined();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete workflow with all options', () => {
            const options = {
                sourceMapFilename: 'output.css.map',
                sourceMapURL: 'custom.map',
                sourceMapOutputFilename: 'output.css',
                sourceMapInputFilename: 'input.less',
                sourceMapBasepath: '/project/',
                sourceMapRootpath: '/assets/',
                outputSourceFiles: true,
                sourceMapFileInline: false,
                disableSourcemapAnnotation: false
            };

            const builder = new SourceMapBuilder(options);
            mockSourceMapOutput.sourceMapURL = '/project/assets/output.css.map';
            
            const css = builder.toCSS(mockRootNode, {}, mockImports);

            expect(css).toBe('body { color: red; }/*# sourceMappingURL=assets/output.css.map */');
            expect(builder.sourceMap).toBe(mockSourceMapOutput.sourceMap);
            expect(builder.sourceMapURL).toBe('assets/output.css.map');
            expect(builder.getInputFilename()).toBe('input.less');
        });

        it('should handle inline source map workflow', () => {
            const options = { sourceMapFileInline: true };
            const builder = new SourceMapBuilder(options);
            builder.sourceMap = '{"version":3}';
            mockEnvironment.encodeBase64.mockReturnValue('eyJ2ZXJzaW9uIjozfQ==');
            
            const css = builder.toCSS(mockRootNode, {}, mockImports);

            expect(css).toBe('body { color: red; }/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ== */');
            expect(builder.isInline()).toBe(true);
        });

        it('should handle disabled source map annotation', () => {
            const options = { disableSourcemapAnnotation: true };
            const builder = new SourceMapBuilder(options);
            builder.sourceMapURL = 'test.css.map';
            
            const css = builder.toCSS(mockRootNode, {}, mockImports);

            expect(css).toBe('body { color: red; }');
        });
    });
});