import { describe, it, expect } from 'vitest';
import URL from './url';

describe('URL', () => {
    describe('construction', () => {
        it('should initialize with provided values', () => {
            const value = { type: 'Anonymous', value: 'test.png' };
            const index = 1;
            const fileInfo = { filename: 'test.less' };
            const url = new URL(value, index, fileInfo);

            expect(url.value).toBe(value);
            expect(url._index).toBe(index);
            expect(url._fileInfo).toBe(fileInfo);
            expect(url.isEvald).toBeUndefined();
        });

        it('should handle empty URL values', () => {
            const value = { type: 'Anonymous', value: '' };
            const url = new URL(value, 0, {});
            expect(url.value).toBe(value);
        });

        it('should handle null/undefined values', () => {
            const url1 = new URL(null, 0, {});
            const url2 = new URL(undefined, 0, {});
            expect(url1.value).toBeNull();
            expect(url2.value).toBeUndefined();
        });
    });

    describe('genCSS', () => {
        it('should generate correct CSS output', () => {
            const url = new URL({
                type: 'Anonymous',
                value: 'test.png',
                genCSS: (_, output) => output.add('test.png')
            });

            const output = {
                add: (chunk) => chunks.push(chunk),
                chunks: []
            };
            const chunks = [];

            url.genCSS({}, output);
            expect(chunks.join('')).toBe('url(test.png)');
        });

        it('should handle quoted URLs', () => {
            const url = new URL({
                type: 'Anonymous',
                value: '"test.png"',
                genCSS: (_, output) => output.add('"test.png"')
            });

            const output = {
                add: (chunk) => chunks.push(chunk),
                chunks: []
            };
            const chunks = [];

            url.genCSS({}, output);
            expect(chunks.join('')).toBe('url("test.png")');
        });
    });

    describe('eval', () => {
        it('should handle path rewriting with rootpath', () => {
            const context = {
                pathRequiresRewrite: () => true,
                rewritePath: (path, rootpath) => rootpath + path,
                normalizePath: (path) => path
            };

            const url = new URL(
                {
                    type: 'Anonymous',
                    value: 'test.png',
                    eval: () => ({ value: 'test.png' })
                },
                0,
                { rootpath: '/assets/' }
            );

            const result = url.eval(context);
            expect(result.value.value).toBe('/assets/test.png');
        });

        it('should escape special characters in rootpath', () => {
            const testCases = [
                {
                    rootpath: 'path with spaces/',
                    expected: 'path\\ with\\ spaces/test.png'
                },
                {
                    rootpath: 'path(with)parentheses/',
                    expected: 'path\\(with\\)parentheses/test.png'
                },
                {
                    rootpath: 'path"with"quotes/',
                    expected: 'path\\"with\\"quotes/test.png'
                },
                {
                    rootpath: "path'with'quotes/",
                    expected: "path\\'with\\'quotes/test.png"
                },
                {
                    rootpath: 'path\\with\\backslashes/',
                    expected: 'path\\with\\backslashes/test.png'
                }
            ];

            testCases.forEach(({ rootpath, expected }) => {
                const context = {
                    pathRequiresRewrite: () => true,
                    rewritePath: (path, rootpath) => rootpath + path,
                    normalizePath: (path) => path
                };

                const url = new URL(
                    {
                        type: 'Anonymous',
                        value: 'test.png',
                        eval: () => ({ value: 'test.png' })
                    },
                    0,
                    { rootpath }
                );

                const result = url.eval(context);
                expect(result.value.value).toBe(expected);
            });
        });

        it('should handle URL arguments', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path,
                urlArgs: 'v=1.0.0'
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png',
                eval: () => ({ value: 'test.png' })
            });

            const result = url.eval(context);
            expect(result.value.value).toBe('test.png?v=1.0.0');
        });

        it('should handle URL arguments with existing query parameters', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path,
                urlArgs: 'v=1.0.0'
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png?param=1',
                eval: () => ({ value: 'test.png?param=1' })
            });

            const result = url.eval(context);
            expect(result.value.value).toBe('test.png?param=1&v=1.0.0');
        });

        it('should handle URL arguments with hash', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path,
                urlArgs: 'v=1.0.0'
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png#section',
                eval: () => ({ value: 'test.png#section' })
            });

            const result = url.eval(context);
            expect(result.value.value).toBe('test.png?v=1.0.0#section');
        });

        it('should not add URL arguments to data URLs', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path,
                urlArgs: 'v=1.0.0'
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'data:image/png;base64,test',
                eval: () => ({ value: 'data:image/png;base64,test' })
            });

            const result = url.eval(context);
            expect(result.value.value).toBe('data:image/png;base64,test');
        });

        it('should set isEvald to true after evaluation', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path,
                urlArgs: 'v=1.0.0'
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png',
                eval: () => ({ value: 'test.png' })
            });

            const result = url.eval(context);
            expect(result.isEvald).toBe(true);
        });

        it('should handle complex URL paths', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path,
                urlArgs: 'v=1.0.0'
            };

            const testCases = [
                {
                    input: 'test.png?param1=1&param2=2',
                    expected: 'test.png?param1=1&param2=2&v=1.0.0'
                },
                {
                    input: 'test.png#section1#section2',
                    expected: 'test.png?v=1.0.0#section1#section2'
                },
                {
                    input: 'test.png?param=1#section',
                    expected: 'test.png?param=1&v=1.0.0#section'
                }
            ];

            testCases.forEach(({ input, expected }) => {
                const url = new URL({
                    type: 'Anonymous',
                    value: input,
                    eval: () => ({ value: input })
                });

                const result = url.eval(context);
                expect(result.value.value).toBe(expected);
            });
        });

        it('should handle path normalization', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path.replace(/\/+/g, '/'),
                urlArgs: ''
            };

            const testCases = [
                {
                    input: 'test//path.png',
                    expected: 'test/path.png'
                },
                {
                    input: './test.png',
                    expected: './test.png'
                },
                {
                    input: '../test.png',
                    expected: '../test.png'
                }
            ];

            testCases.forEach(({ input, expected }) => {
                const url = new URL({
                    type: 'Anonymous',
                    value: input,
                    eval: () => ({ value: input })
                });

                const result = url.eval(context);
                expect(result.value.value).toBe(expected);
            });
        });

        it('should handle multiple evaluations', () => {
            const context = {
                pathRequiresRewrite: () => false,
                normalizePath: (path) => path,
                urlArgs: 'v=1.0.0'
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png',
                eval: () => ({ value: 'test.png' })
            });

            const result1 = url.eval(context);
            const result2 = url.eval(context);
            expect(result1.value.value).toBe('test.png?v=1.0.0');
            expect(result2.value.value).toBe('test.png?v=1.0.0');
        });
    });

    describe('accept', () => {
        it('should visit the value with the visitor', () => {
            const visitor = {
                visit: (value) => ({ ...value, visited: true })
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png'
            });

            url.accept(visitor);
            expect(url.value.visited).toBe(true);
        });

        it('should handle visitor returning null', () => {
            const visitor = {
                visit: () => null
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png'
            });

            url.accept(visitor);
            expect(url.value).toBeNull();
        });

        it('should handle visitor modifying value type', () => {
            const visitor = {
                visit: () => ({ type: 'Modified', value: 'modified.png' })
            };

            const url = new URL({
                type: 'Anonymous',
                value: 'test.png'
            });

            url.accept(visitor);
            expect(url.value.type).toBe('Modified');
            expect(url.value.value).toBe('modified.png');
        });
    });
});
