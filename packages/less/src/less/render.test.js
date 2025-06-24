import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as utils from './utils';
import createRender from './render';

vi.mock('./utils', () => ({
    copyOptions: vi.fn((opts1, opts2) => {
        return { ...opts1, ...opts2 };
    })
}));

describe('render', () => {
    let mockEnvironment;
    let mockParseTree;
    let MockParseTreeConstructor;
    let render;
    let mockContext;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockEnvironment = {};
        
        mockParseTree = {
            toCSS: vi.fn().mockReturnValue({ css: 'body { color: red; }', map: null })
        };
        
        MockParseTreeConstructor = vi.fn().mockImplementation(() => mockParseTree);
        
        mockContext = {
            parse: vi.fn(),
            options: { sourceMap: false }
        };
        
        render = createRender(mockEnvironment, MockParseTreeConstructor);
        render = render.bind(mockContext);
    });

    describe('with callback', () => {
        it('should handle options as callback (second parameter)', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            render(input, callback);
            
            expect(utils.copyOptions).toHaveBeenCalledWith(mockContext.options, {});
            expect(mockContext.parse).toHaveBeenCalledWith(
                input,
                expect.objectContaining({ sourceMap: false }),
                expect.any(Function)
            );
            expect(callback).toHaveBeenCalledWith(null, { css: 'body { color: red; }', map: null });
        });

        it('should handle options and callback (three parameters)', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            const options = { compress: true };
            
            mockContext.parse.mockImplementation((input, opts, cb) => {
                cb(null, { type: 'Root' }, [], opts);
            });
            
            render(input, options, callback);
            
            expect(utils.copyOptions).toHaveBeenCalledWith(mockContext.options, options);
            expect(mockContext.parse).toHaveBeenCalledWith(
                input,
                expect.objectContaining({ sourceMap: false, compress: true }),
                expect.any(Function)
            );
            expect(callback).toHaveBeenCalledWith(null, { css: 'body { color: red; }', map: null });
        });

        it('should handle parse errors', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            const parseError = new Error('Parse error');
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(parseError);
            });
            
            render(input, {}, callback);
            
            expect(callback).toHaveBeenCalledWith(parseError);
            expect(MockParseTreeConstructor).not.toHaveBeenCalled();
        });

        it('should handle toCSS errors', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            const toCSSError = new Error('toCSS error');
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            mockParseTree.toCSS.mockImplementation(() => {
                throw toCSSError;
            });
            
            render(input, {}, callback);
            
            expect(callback).toHaveBeenCalledWith(toCSSError);
        });

        it('should create ParseTree with correct arguments', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            const mockRoot = { type: 'Root', rules: [] };
            const mockImports = [{ path: 'import.less' }];
            const mockOptions = { sourceMap: true };
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, mockRoot, mockImports, mockOptions);
            });
            
            render(input, {}, callback);
            
            expect(MockParseTreeConstructor).toHaveBeenCalledWith(mockRoot, mockImports);
            expect(mockParseTree.toCSS).toHaveBeenCalledWith(mockOptions);
        });
    });

    describe('with Promise', () => {
        it('should return a Promise when no callback is provided', async () => {
            const input = '.class { color: blue; }';
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            const result = render(input, {});
            
            expect(result).toBeInstanceOf(Promise);
            const output = await result;
            expect(output).toEqual({ css: 'body { color: red; }', map: null });
        });

        it('should resolve with result on success', async () => {
            const input = '.class { color: blue; }';
            const expectedResult = { css: 'compiled css', map: 'source map' };
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            mockParseTree.toCSS.mockReturnValue(expectedResult);
            
            const result = await render(input, {});
            
            expect(result).toEqual(expectedResult);
        });

        it('should reject with parse error', async () => {
            const input = '.class { color: blue; }';
            const parseError = new Error('Parse error');
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(parseError);
            });
            
            await expect(render(input, {})).rejects.toThrow('Parse error');
        });

        it('should reject with toCSS error', async () => {
            const input = '.class { color: blue; }';
            const toCSSError = new Error('toCSS error');
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            mockParseTree.toCSS.mockImplementation(() => {
                throw toCSSError;
            });
            
            await expect(render(input, {})).rejects.toThrow('toCSS error');
        });

        it('should handle options without callback', async () => {
            const input = '.class { color: blue; }';
            const options = { compress: true, sourceMap: true };
            
            mockContext.parse.mockImplementation((input, opts, cb) => {
                cb(null, { type: 'Root' }, [], opts);
            });
            
            await render(input, options);
            
            expect(utils.copyOptions).toHaveBeenCalledWith(mockContext.options, options);
            expect(mockContext.parse).toHaveBeenCalledWith(
                input,
                expect.objectContaining({ compress: true, sourceMap: true }),
                expect.any(Function)
            );
        });

        it('should maintain context when using Promise', async () => {
            const input = '.class { color: blue; }';
            const customContext = {
                parse: vi.fn(),
                options: { custom: 'option' }
            };
            
            customContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            const customRender = createRender(mockEnvironment, MockParseTreeConstructor);
            const boundRender = customRender.bind(customContext);
            
            await boundRender(input);
            
            expect(customContext.parse).toHaveBeenCalled();
            expect(utils.copyOptions).toHaveBeenCalledWith(customContext.options, {});
        });
    });

    describe('edge cases', () => {
        it('should handle null options', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            render(input, null, callback);
            
            expect(utils.copyOptions).toHaveBeenCalledWith(mockContext.options, {});
        });

        it('should handle undefined options', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            render(input, undefined, callback);
            
            expect(utils.copyOptions).toHaveBeenCalledWith(mockContext.options, {});
        });

        it('should handle empty input', () => {
            const callback = vi.fn();
            const input = '';
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], options);
            });
            
            render(input, callback);
            
            expect(mockContext.parse).toHaveBeenCalledWith(input, expect.any(Object), expect.any(Function));
        });

        it('should preserve this context through promise chain', async () => {
            const input = '.class { color: blue; }';
            let capturedThis;
            
            mockContext.parse.mockImplementation(function(input, options, cb) {
                capturedThis = this;
                cb(null, { type: 'Root' }, [], options);
            });
            
            await render(input);
            
            expect(capturedThis).toBe(mockContext);
        });

        it('should pass through options from parse callback', () => {
            const callback = vi.fn();
            const input = '.class { color: blue; }';
            const modifiedOptions = { sourceMap: true, modified: true };
            
            mockContext.parse.mockImplementation((input, options, cb) => {
                cb(null, { type: 'Root' }, [], modifiedOptions);
            });
            
            render(input, {}, callback);
            
            expect(mockParseTree.toCSS).toHaveBeenCalledWith(modifiedOptions);
        });
    });
});