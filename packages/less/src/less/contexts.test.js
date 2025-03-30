import { describe, it, expect } from 'vitest';
import contexts from './contexts';
import * as Constants from './constants';

describe('contexts', () => {
    describe('Parse context', () => {
        it('should create a Parse context with default options', () => {
            const parseContext = new contexts.Parse({});
            expect(parseContext).toBeDefined();
            expect(parseContext.paths).toBeUndefined();
        });

        it('should copy all specified properties from options', () => {
            const options = {
                paths: ['/test/path'],
                rewriteUrls: Constants.RewriteUrls.ALL,
                rootpath: '/root',
                strictImports: true,
                insecure: true,
                dumpLineNumbers: true,
                compress: true,
                syncImport: true,
                chunkInput: true,
                mime: 'text/less',
                useFileCache: true,
                processImports: true,
                pluginManager: {},
                quiet: true
            };

            const parseContext = new contexts.Parse(options);
            Object.keys(options).forEach((key) => {
                expect(parseContext[key]).toEqual(options[key]);
            });
        });

        it('should convert string paths to array', () => {
            const parseContext = new contexts.Parse({ paths: '/test/path' });
            expect(parseContext.paths).toEqual(['/test/path']);
        });

        it('should handle empty paths array', () => {
            const parseContext = new contexts.Parse({ paths: [] });
            expect(parseContext.paths).toEqual([]);
        });

        it('should handle invalid options gracefully', () => {
            const parseContext = new contexts.Parse({ invalidOption: 'test' });
            expect(parseContext.invalidOption).toBeUndefined();
        });

        it('should initialize pluginManager as undefined if not provided', () => {
            const parseContext = new contexts.Parse({});
            expect(parseContext.pluginManager).toBeUndefined();
        });
    });

    describe('Eval context', () => {
        it('should create an Eval context with default options', () => {
            const evalContext = new contexts.Eval({});
            expect(evalContext).toBeDefined();
            expect(evalContext.frames).toEqual([]);
            expect(evalContext.importantScope).toEqual([]);
            expect(evalContext.inCalc).toBe(false);
            expect(evalContext.mathOn).toBe(true);
        });

        it('should copy all specified properties from options', () => {
            const options = {
                paths: ['/test/path'],
                compress: true,
                math: Constants.Math.PARENS,
                strictUnits: true,
                sourceMap: true,
                importMultiple: true,
                urlArgs: '?v=1',
                javascriptEnabled: true,
                pluginManager: {},
                importantScope: [],
                rewriteUrls: Constants.RewriteUrls.ALL
            };

            const evalContext = new contexts.Eval(options);
            Object.keys(options).forEach((key) => {
                expect(evalContext[key]).toEqual(options[key]);
            });
        });

        describe('calc stack operations', () => {
            it('should handle entering and exiting calc context', () => {
                const evalContext = new contexts.Eval({});

                evalContext.enterCalc();
                expect(evalContext.inCalc).toBe(true);
                expect(evalContext.calcStack).toEqual([true]);

                evalContext.enterCalc();
                expect(evalContext.calcStack).toEqual([true, true]);

                evalContext.exitCalc();
                expect(evalContext.calcStack).toEqual([true]);
                expect(evalContext.inCalc).toBe(true);

                evalContext.exitCalc();
                expect(evalContext.calcStack).toEqual([]);
                expect(evalContext.inCalc).toBe(false);
            });
        });

        describe('parenthesis stack operations', () => {
            it('should handle entering and exiting parenthesis context', () => {
                const evalContext = new contexts.Eval({});

                evalContext.inParenthesis();
                expect(evalContext.parensStack).toEqual([true]);

                evalContext.inParenthesis();
                expect(evalContext.parensStack).toEqual([true, true]);

                evalContext.outOfParenthesis();
                expect(evalContext.parensStack).toEqual([true]);

                evalContext.outOfParenthesis();
                expect(evalContext.parensStack).toEqual([]);
            });
        });

        describe('math operations', () => {
            it('should handle math operations correctly based on settings', () => {
                const evalContext = new contexts.Eval({
                    math: Constants.Math.ALWAYS
                });
                expect(evalContext.isMathOn('+')).toBe(true);
                expect(evalContext.isMathOn('/')).toBe(true);

                evalContext.math = Constants.Math.PARENS_DIVISION;
                expect(evalContext.isMathOn('+')).toBe(true);
                expect(evalContext.isMathOn('/')).toBe(false);

                evalContext.inParenthesis();
                expect(evalContext.isMathOn('/')).toBe(true);

                evalContext.outOfParenthesis();
                evalContext.math = Constants.Math.PARENS;

                expect(evalContext.isMathOn('+')).toBe(0);
                expect(evalContext.isMathOn('/')).toBe(false);

                evalContext.inParenthesis();
                expect(evalContext.isMathOn('+')).toBe(1);
                expect(evalContext.isMathOn('/')).toBe(1);
            });

            it('should handle invalid operators when mathOn is true', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.isMathOn('invalid')).toBe(true);
                expect(evalContext.isMathOn('')).toBe(true);
                expect(evalContext.isMathOn(null)).toBe(true);
                expect(evalContext.isMathOn(undefined)).toBe(true);
            });

            it('should respect mathOn setting', () => {
                const evalContext = new contexts.Eval({});
                evalContext.mathOn = false;
                expect(evalContext.isMathOn('+')).toBe(false);
                expect(evalContext.isMathOn('/')).toBe(false);
                expect(evalContext.isMathOn('invalid')).toBe(false);
            });
        });

        describe('path handling', () => {
            it('should correctly identify relative paths', () => {
                const evalContext = new contexts.Eval({});
                expect(
                    evalContext.pathRequiresRewrite('http://example.com')
                ).toBe(false);
                expect(
                    evalContext.pathRequiresRewrite('https://example.com')
                ).toBe(false);
                expect(evalContext.pathRequiresRewrite('/absolute/path')).toBe(
                    false
                );
                expect(evalContext.pathRequiresRewrite('#hash')).toBe(false);
                expect(evalContext.pathRequiresRewrite('relative/path')).toBe(
                    true
                );
            });

            it('should correctly identify local relative paths', () => {
                const evalContext = new contexts.Eval({
                    rewriteUrls: Constants.RewriteUrls.LOCAL
                });
                expect(evalContext.pathRequiresRewrite('./local/path')).toBe(
                    true
                );
                expect(evalContext.pathRequiresRewrite('../parent/path')).toBe(
                    true
                );
                expect(
                    evalContext.pathRequiresRewrite('not/relative/path')
                ).toBe(false);
            });

            it('should normalize paths correctly', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.normalizePath('a/b/c')).toBe('a/b/c');
                expect(evalContext.normalizePath('a/./b/c')).toBe('a/b/c');
                expect(evalContext.normalizePath('a/../b/c')).toBe('b/c');
                expect(evalContext.normalizePath('./a/b/c')).toBe('a/b/c');
                expect(evalContext.normalizePath('../a/b/c')).toBe('../a/b/c');
            });

            it('should rewrite paths correctly with rootpath', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.rewritePath('path/to/file', '/root')).toBe(
                    '/rootpath/to/file'
                );
                expect(evalContext.rewritePath('./path/to/file', '/root')).toBe(
                    '/root./path/to/file'
                );
                expect(
                    evalContext.rewritePath('../path/to/file', '/root')
                ).toBe('/root../path/to/file');
            });

            it('should handle paths with special characters', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.normalizePath('path/with spaces/file')).toBe(
                    'path/with spaces/file'
                );
                expect(
                    evalContext.normalizePath('path/with@special/chars')
                ).toBe('path/with@special/chars');
                expect(
                    evalContext.normalizePath('path/with%20encoded/chars')
                ).toBe('path/with%20encoded/chars');
            });

            it('should handle Windows-style paths', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.normalizePath('C:\\path\\to\\file')).toBe(
                    'C:\\path\\to\\file'
                );
                expect(evalContext.normalizePath('C:/path/to/file')).toBe(
                    'C:/path/to/file'
                );
            });

            it('should handle URLs with query parameters and hash fragments', () => {
                const evalContext = new contexts.Eval({});
                expect(
                    evalContext.pathRequiresRewrite(
                        'http://example.com?param=value'
                    )
                ).toBe(false);
                expect(
                    evalContext.pathRequiresRewrite(
                        'https://example.com#fragment'
                    )
                ).toBe(false);
                expect(
                    evalContext.pathRequiresRewrite(
                        'http://example.com?param=value#fragment'
                    )
                ).toBe(false);
            });
        });

        describe('frames handling', () => {
            it('should initialize with provided frames', () => {
                const frames = [{ id: 1 }, { id: 2 }];
                const evalContext = new contexts.Eval({}, frames);
                expect(evalContext.frames).toEqual(frames);
            });

            it('should initialize with empty frames array if not provided', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.frames).toEqual([]);
            });
        });

        describe('importantScope handling', () => {
            it('should initialize with provided importantScope', () => {
                const importantScope = ['!important'];
                const evalContext = new contexts.Eval({ importantScope });
                expect(evalContext.importantScope).toEqual(importantScope);
            });

            it('should initialize with empty importantScope array if not provided', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.importantScope).toEqual([]);
            });
        });

        describe('path normalization edge cases', () => {
            it('should preserve multiple consecutive slashes', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.normalizePath('a//b///c')).toBe('a//b///c');
            });

            it('should handle empty path', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.normalizePath('')).toBe('');
            });

            it('should handle root path', () => {
                const evalContext = new contexts.Eval({});
                expect(evalContext.normalizePath('/')).toBe('/');
            });
        });

        describe('url handling', () => {
            it('should handle urlArgs correctly', () => {
                const evalContext = new contexts.Eval({ urlArgs: '?v=1' });
                expect(evalContext.urlArgs).toBe('?v=1');
            });

            it('should handle javascriptEnabled option', () => {
                const evalContext = new contexts.Eval({
                    javascriptEnabled: true
                });
                expect(evalContext.javascriptEnabled).toBe(true);
            });

            it('should handle importMultiple option', () => {
                const evalContext = new contexts.Eval({ importMultiple: true });
                expect(evalContext.importMultiple).toBe(true);
            });
        });

        describe('error handling', () => {
            it('should handle invalid frame structures', () => {
                const evalContext = new contexts.Eval({}, null);
                expect(evalContext.frames).toEqual([]);

                const evalContext2 = new contexts.Eval({}, undefined);
                expect(evalContext2.frames).toEqual([]);
            });

            it('should handle malformed paths', () => {
                const evalContext = new contexts.Eval({});
                expect(() => evalContext.normalizePath(null)).toThrow();
                expect(() => evalContext.normalizePath(undefined)).toThrow();
                expect(evalContext.normalizePath('...')).toBe('...');
                expect(evalContext.normalizePath('..')).toBe('..');
            });

            it('should handle undefined/null inputs in path operations', () => {
                const evalContext = new contexts.Eval({});
                expect(() => evalContext.rewritePath(null, '/root')).toThrow();
                expect(() =>
                    evalContext.rewritePath(undefined, '/root')
                ).toThrow();
                expect(evalContext.rewritePath('path', null)).toBe('path');
                expect(evalContext.rewritePath('path', undefined)).toBe('path');
            });
        });
    });
});
