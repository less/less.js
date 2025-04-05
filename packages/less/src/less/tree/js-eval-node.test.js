import { describe, it, expect } from 'vitest';
import JsEvalNode from './js-eval-node';
import Node from './node';

describe('JsEvalNode', () => {
    let jsEvalNode;
    let mockContext;

    beforeEach(() => {
        jsEvalNode = new JsEvalNode();
        // Setup basic mock context
        mockContext = {
            javascriptEnabled: true,
            frames: [
                {
                    // Implement both variable() and variables() methods
                    variable: (name) => {
                        const vars = {
                            '@color': {
                                value: {
                                    eval: () => ({
                                        toCSS: () => '"#ff0000"' // Quoted for JavaScript string interpolation
                                    })
                                }
                            },
                            '@size': {
                                value: {
                                    eval: () => ({
                                        toCSS: () => '"16px"' // Quoted for JavaScript string interpolation
                                    })
                                }
                            }
                        };
                        return vars[name];
                    },
                    variables: () => ({
                        '@color': {
                            value: {
                                eval: () => ({
                                    toCSS: () => '#ff0000' // Unquoted for toJS() calls
                                })
                            }
                        },
                        '@size': {
                            value: {
                                eval: () => ({
                                    toCSS: () => '16px' // Unquoted for toJS() calls
                                })
                            }
                        }
                    })
                }
            ],
            importantScope: [{ important: null }]
        };
    });

    describe('evaluateJavaScript', () => {
        it('throws error when JavaScript is not enabled', () => {
            mockContext.javascriptEnabled = false;
            expect(() => {
                jsEvalNode.evaluateJavaScript('1 + 1', mockContext);
            }).toThrow('Inline JavaScript is not enabled');
        });

        it('evaluates basic JavaScript expressions', () => {
            const result = jsEvalNode.evaluateJavaScript('1 + 1', mockContext);
            expect(result).toBe(2);
        });

        it('interpolates Less variables in JavaScript expressions', () => {
            jsEvalNode._fileInfo = { filename: 'test.less' };
            const result = jsEvalNode.evaluateJavaScript(
                '"The color is " + @{color}',
                mockContext
            );
            expect(result).toBe('The color is #ff0000');
        });

        it('provides access to Less variables in evaluation context', () => {
            const result = jsEvalNode.evaluateJavaScript(
                'this.color.toJS()',
                mockContext
            );
            expect(result).toBe('#ff0000');
        });

        it('throws error on invalid JavaScript syntax', () => {
            jsEvalNode._fileInfo = { filename: 'test.less' };
            expect(() => {
                jsEvalNode.evaluateJavaScript('invalid syntax )', mockContext);
            }).toThrow('JavaScript evaluation error');
        });

        it('throws error on runtime JavaScript errors', () => {
            jsEvalNode._fileInfo = { filename: 'test.less' };
            expect(() => {
                jsEvalNode.evaluateJavaScript(
                    'undefinedFunction()',
                    mockContext
                );
            }).toThrow('JavaScript evaluation error');
        });

        it('handles multiple variable interpolations', () => {
            jsEvalNode._fileInfo = { filename: 'test.less' };
            const result = jsEvalNode.evaluateJavaScript(
                '"Size: " + @{size} + ", Color: " + @{color}',
                mockContext
            );
            expect(result).toBe('Size: 16px, Color: #ff0000');
        });

        it('handles variable interpolation with expressions', () => {
            mockContext.frames[0].variable = (name) =>
                ({
                    '@prefix': {
                        value: { eval: () => ({ toCSS: () => '"my-"' }) }
                    },
                    '@suffix': {
                        value: { eval: () => ({ toCSS: () => '"value"' }) }
                    }
                }[name]);

            const result = jsEvalNode.evaluateJavaScript(
                '@{prefix} + @{suffix}',
                mockContext
            );
            expect(result).toBe('my-value');
        });

        it('handles empty expressions', () => {
            const result = jsEvalNode.evaluateJavaScript('""', mockContext);
            expect(result).toBe('');
        });

        it('handles expressions returning complex objects', () => {
            const result = jsEvalNode.evaluateJavaScript(
                '({ key: "value" })',
                mockContext
            );
            expect(result).toEqual({ key: 'value' });
        });

        it('handles multiple variable access in same context', () => {
            const result = jsEvalNode.evaluateJavaScript(
                'this.color.toJS() + this.size.toJS()',
                mockContext
            );
            expect(result).toBe('#ff000016px');
        });

        it('handles special characters and escape sequences', () => {
            const result = jsEvalNode.evaluateJavaScript(
                '"\\n" + @{color} + "\\t"',
                mockContext
            );
            expect(result).toBe('\n#ff0000\t');
        });

        it('handles undefined variables in context', () => {
            mockContext.frames[0].variables = () => ({});
            const result = jsEvalNode.evaluateJavaScript(
                'this.undefinedVar',
                mockContext
            );
            expect(result).toBe(undefined);
        });

        it('throws on invalid variable interpolation', () => {
            expect(() => {
                jsEvalNode.evaluateJavaScript('@{nonexistent}', mockContext);
            }).toThrow();
        });

        it('handles special characters in variable names', () => {
            mockContext.frames[0].variable = (name) =>
                ({
                    '@special-name_123': {
                        value: { eval: () => ({ toCSS: () => '"special"' }) }
                    }
                }[name]);

            const result = jsEvalNode.evaluateJavaScript(
                '@{special-name_123}',
                mockContext
            );
            expect(result).toBe('special');
        });

        it('handles missing file info gracefully', () => {
            jsEvalNode._fileInfo = null;
            expect(() => {
                jsEvalNode.evaluateJavaScript('throw new Error()', mockContext);
            }).toThrow('JavaScript evaluation error');
        });

        it('handles numeric and boolean variable values', () => {
            mockContext.frames[0].variable = (name) =>
                ({
                    '@number': {
                        value: { eval: () => ({ toCSS: () => '42' }) }
                    },
                    '@bool': {
                        value: { eval: () => ({ toCSS: () => 'true' }) }
                    }
                }[name]);

            const numResult = jsEvalNode.evaluateJavaScript(
                '@{number} + 1',
                mockContext
            );
            expect(numResult).toBe(43);

            const boolResult = jsEvalNode.evaluateJavaScript(
                '@{bool}',
                mockContext
            );
            expect(boolResult).toBe(true);
        });

        it('handles multiple frames in context', () => {
            mockContext.frames.unshift({
                variables: () => ({
                    '@override': {
                        value: {
                            eval: () => ({
                                toCSS: () => 'frame0'
                            })
                        }
                    }
                })
            });

            const result = jsEvalNode.evaluateJavaScript(
                'this.override.toJS()',
                mockContext
            );
            expect(result).toBe('frame0');
        });

        it('handles complex objects in variable evaluation', () => {
            const complexObj = { foo: 'bar', arr: [1, 2] };
            mockContext.frames[0].variable = (name) =>
                ({
                    '@complex': {
                        value: {
                            eval: () => ({
                                toCSS: () => `(${JSON.stringify(complexObj)})`
                            })
                        }
                    }
                }[name]);

            const result = jsEvalNode.evaluateJavaScript(
                '@{complex}',
                mockContext
            );
            expect(result).toEqual(complexObj);
        });
    });

    describe('jsify', () => {
        it('converts single value to CSS string', () => {
            const obj = {
                value: 'test',
                toCSS: () => 'test'
            };
            expect(jsEvalNode.jsify(obj)).toBe('test');
        });

        it('converts array values to CSS array string', () => {
            const obj = {
                value: [{ toCSS: () => 'red' }, { toCSS: () => 'blue' }]
            };
            expect(jsEvalNode.jsify(obj)).toBe('[red, blue]');
        });

        it('handles single-item arrays', () => {
            const obj = {
                value: [{ toCSS: () => 'red' }],
                toCSS: () => 'red'
            };
            expect(jsEvalNode.jsify(obj)).toBe('red');
        });

        it('handles empty arrays', () => {
            const obj = {
                value: [],
                toCSS: () => ''
            };
            expect(jsEvalNode.jsify(obj)).toBe('');
        });

        it('handles nested arrays', () => {
            const obj = {
                value: [{ toCSS: () => '[1, 2]' }, { toCSS: () => '[3, 4]' }]
            };
            expect(jsEvalNode.jsify(obj)).toBe('[[1, 2], [3, 4]]');
        });

        it('handles objects without toCSS method', () => {
            const obj = {
                value: [{}]
            };
            expect(() => jsEvalNode.jsify(obj)).toThrow();
        });

        it('handles null values', () => {
            const obj = {
                value: null,
                toCSS: () => 'null'
            };
            expect(jsEvalNode.jsify(obj)).toBe('null');
        });

        it('handles malformed value property', () => {
            const obj = {
                toCSS: () => 'default'
            };
            expect(jsEvalNode.jsify(obj)).toBe('default');
        });

        it('handles values with special characters', () => {
            const obj = {
                value: [
                    { toCSS: () => 'test\nline' },
                    { toCSS: () => 'test\t tab' }
                ]
            };
            expect(jsEvalNode.jsify(obj)).toBe('[test\nline, test\t tab]');
        });

        it('handles mixed types in arrays', () => {
            const obj = {
                value: [
                    { toCSS: () => '42' },
                    { toCSS: () => '"string"' },
                    { toCSS: () => 'true' }
                ]
            };
            expect(jsEvalNode.jsify(obj)).toBe('[42, "string", true]');
        });

        it('handles errors in toCSS calls', () => {
            const obj = {
                value: [
                    {
                        toCSS: () => {
                            throw new Error('toCSS failed');
                        }
                    }
                ],
                toCSS: () => {
                    throw new Error('toCSS failed');
                }
            };
            expect(() => jsEvalNode.jsify(obj)).toThrow(/toCSS failed/);
        });

        it('handles large arrays', () => {
            const largeArray = Array(1000).fill({ toCSS: () => '1' });
            const obj = { value: largeArray };
            const result = jsEvalNode.jsify(obj);
            expect(result.split(',').length).toBe(1000);
        });
    });

    describe('integration with Node prototype', () => {
        it('inherits from Node', () => {
            expect(jsEvalNode).toBeInstanceOf(Node);
        });

        it('maintains file info and index from parent Node', () => {
            jsEvalNode._fileInfo = { filename: 'test.less' };
            jsEvalNode._index = 1;

            expect(jsEvalNode.fileInfo()).toEqual({ filename: 'test.less' });
            expect(jsEvalNode.getIndex()).toBe(1);
        });
    });
});
