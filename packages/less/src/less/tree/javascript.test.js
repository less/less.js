import { describe, it, expect } from 'vitest';
import JavaScript from './javascript';
import Dimension from './dimension';
import Quoted from './quoted';
import Anonymous from './anonymous';

describe('JavaScript', () => {
    const mockContext = {
        javascriptEnabled: true,
        frames: [
            {
                variables: () => ({}),
                variable: () => null
            }
        ]
    };

    describe('constructor', () => {
        it('should initialize with provided values', () => {
            const js = new JavaScript('1 + 1', true, 0, {
                filename: 'test.less'
            });
            expect(js.expression).toBe('1 + 1');
            expect(js.escaped).toBe(true);
            expect(js._index).toBe(0);
            expect(js._fileInfo).toEqual({ filename: 'test.less' });
        });
    });

    describe('eval', () => {
        it('should throw error when javascript is not enabled', () => {
            const js = new JavaScript('1 + 1');
            expect(() => js.eval({ javascriptEnabled: false })).toThrow(
                'Inline JavaScript is not enabled. Is it set in your options?'
            );
        });

        it('should evaluate number expressions and return Dimension', () => {
            const js = new JavaScript('1 + 1');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(2);
        });

        it('should handle NaN values', () => {
            const js = new JavaScript('parseInt("not a number")');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe(NaN);
        });

        it('should evaluate string expressions and return Quoted', () => {
            const js = new JavaScript('"hello" + " world"');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello world');
            expect(result.quote).toBe('"');
        });

        it('should evaluate array expressions and return Anonymous with comma-separated values', () => {
            const js = new JavaScript('[1, 2, 3]');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('1, 2, 3');
        });

        it('should evaluate boolean expressions and return Anonymous', () => {
            const js = new JavaScript('true');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe(true);
        });

        it('should evaluate null and return Anonymous', () => {
            const js = new JavaScript('null');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe(null);
        });

        it('should evaluate undefined and return Anonymous', () => {
            const js = new JavaScript('undefined');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe(undefined);
        });

        it('should handle JavaScript errors gracefully', () => {
            const js = new JavaScript('undefinedVariable');
            expect(() => js.eval(mockContext)).toThrow(
                /JavaScript evaluation error/
            );
        });

        it('should handle syntax errors gracefully', () => {
            const js = new JavaScript('{ invalid syntax }');
            expect(() => js.eval(mockContext)).toThrow(
                /JavaScript evaluation error/
            );
        });

        it('should handle variable interpolation', () => {
            const context = {
                ...mockContext,
                frames: [
                    {
                        variables: () => ({
                            '@color': {
                                value: {
                                    eval: () => ({
                                        toCSS: () => 'red'
                                    }),
                                    toCSS: () => 'red'
                                }
                            }
                        }),
                        variable: (name) => {
                            if (name === '@color') {
                                return {
                                    value: {
                                        eval: () => ({
                                            toCSS: () => 'red'
                                        }),
                                        toCSS: () => 'red'
                                    }
                                };
                            }
                            return null;
                        }
                    }
                ]
            };
            const js = new JavaScript('"@{color}"');
            const result = js.eval(context);
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('red');
        });

        it('should handle empty string expressions', () => {
            const js = new JavaScript('');
            expect(() => js.eval(mockContext)).toThrow(
                /JavaScript evaluation error/
            );
        });

        it('should handle special number cases', () => {
            const tests = [
                { expr: 'Infinity', expected: Infinity },
                { expr: '-Infinity', expected: -Infinity },
                { expr: 'Number.MAX_VALUE', expected: Number.MAX_VALUE },
                { expr: 'Number.MIN_VALUE', expected: Number.MIN_VALUE }
            ];

            tests.forEach(({ expr, expected }) => {
                const js = new JavaScript(expr);
                const result = js.eval(mockContext);
                expect(result).toBeInstanceOf(Dimension);
                expect(result.value).toBe(expected);
            });
        });

        it('should handle complex array cases', () => {
            const tests = [
                { expr: '[]', expected: '' },
                { expr: '[1, [2, 3], 4]', expected: '1, 2,3, 4' },
                { expr: '[null, undefined, NaN]', expected: ', , NaN' },
                { expr: '[1, "two", true]', expected: '1, two, true' }
            ];

            tests.forEach(({ expr, expected }) => {
                const js = new JavaScript(expr);
                const result = js.eval(mockContext);
                expect(result).toBeInstanceOf(Anonymous);
                expect(result.value).toBe(expected);
            });
        });

        it('should handle object expressions', () => {
            const js = new JavaScript('({a: 1, b: 2})');
            const result = js.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toEqual({ a: 1, b: 2 });
        });

        it('should handle escaped vs non-escaped strings differently', () => {
            const escaped = new JavaScript('"hello"', true);
            const nonEscaped = new JavaScript('"hello"', false);

            const escapedResult = escaped.eval(mockContext);
            const nonEscapedResult = nonEscaped.eval(mockContext);

            expect(escapedResult.escaped).toBe(true);
            expect(nonEscapedResult.escaped).toBe(false);
        });

        it('should handle multiple context frames with variable precedence', () => {
            const context = {
                ...mockContext,
                frames: [
                    {
                        variables: () => ({
                            '@color': {
                                value: {
                                    eval: () => ({
                                        toCSS: () => 'red',
                                        value: 'red'
                                    }),
                                    toCSS: () => 'red'
                                }
                            }
                        }),
                        variable: (name) => {
                            if (name === '@color') {
                                return {
                                    value: {
                                        eval: () => ({
                                            toCSS: () => 'red',
                                            value: 'red'
                                        }),
                                        toCSS: () => 'red'
                                    }
                                };
                            }
                            return null;
                        }
                    },
                    {
                        variables: () => ({
                            '@color': {
                                value: {
                                    eval: () => ({
                                        toCSS: () => 'blue',
                                        value: 'blue'
                                    }),
                                    toCSS: () => 'blue'
                                }
                            }
                        }),
                        variable: (name) => {
                            if (name === '@color') {
                                return {
                                    value: {
                                        eval: () => ({
                                            toCSS: () => 'blue',
                                            value: 'blue'
                                        }),
                                        toCSS: () => 'blue'
                                    }
                                };
                            }
                            return null;
                        }
                    }
                ]
            };

            const js = new JavaScript('"@{color}"');
            const result = js.eval(context);
            expect(result.value).toBe('red'); // Should use the first frame's value
        });

        it('should provide specific error messages for different error types', () => {
            const syntaxError = new JavaScript('{ invalid syntax }');
            const referenceError = new JavaScript('undefinedVariable');

            try {
                syntaxError.eval(mockContext);
                expect(true).toBe(false); // This will fail if we reach here
            } catch (error) {
                expect(error.message).toContain('Unexpected identifier');
            }

            try {
                referenceError.eval(mockContext);
                expect(true).toBe(false); // This will fail if we reach here
            } catch (error) {
                expect(error.message).toContain('is not defined');
            }
        });
    });
});
