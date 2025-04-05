import { describe, it, expect, vi } from 'vitest';
import Element from './element';
import Node from './node';
import Paren from './paren';
import Combinator from './combinator';

describe('Element', () => {
    describe('constructor', () => {
        it('should create Element with string combinator', () => {
            const element = new Element('>', 'div', false);
            expect(element.combinator).toBeInstanceOf(Combinator);
            expect(element.combinator.value).toBe('>');
            expect(element.value).toBe('div');
            expect(element.isVariable).toBe(false);
        });

        it('should create Element with Combinator instance', () => {
            const combinator = new Combinator('+');
            const element = new Element(combinator, 'span', false);
            expect(element.combinator).toBe(combinator);
            expect(element.value).toBe('span');
        });

        it('should trim string values', () => {
            const element = new Element('>', '  p  ', false);
            expect(element.value).toBe('p');
        });

        it('should handle empty value', () => {
            const element = new Element('>', null, false);
            expect(element.value).toBe('');
        });

        it('should handle non-string values', () => {
            const obj = { type: 'test' };
            const element = new Element('>', obj, false);
            expect(element.value).toBe(obj);
        });

        it('should set isVariable flag', () => {
            const element = new Element('>', 'var', true);
            expect(element.isVariable).toBe(true);
        });

        it('should inherit from Node', () => {
            const element = new Element('>', 'div', false);
            expect(element).toBeInstanceOf(Node);
        });

        it('should handle undefined value', () => {
            const element = new Element('>', undefined, false);
            expect(element.value).toBe('');
        });

        it('should handle empty string value', () => {
            const element = new Element('>', '', false);
            expect(element.value).toBe('');
        });

        it('should handle space combinator specially', () => {
            const element = new Element(' ', 'div', false);
            expect(element.combinator.value).toBe(' ');
            expect(element.combinator.emptyOrWhitespace).toBe(true);
        });

        it('should store file info and index', () => {
            const fileInfo = { filename: 'test.less' };
            const element = new Element('>', 'div', false, 42, fileInfo);
            expect(element._fileInfo).toBe(fileInfo);
            expect(element._index).toBe(42);
        });

        it('should copy visibility info', () => {
            const visInfo = { visibilityBlocks: 1, nodeVisible: true };
            const element = new Element('>', 'div', false, 1, {}, visInfo);
            expect(element.visibilityInfo()).toEqual(visInfo);
        });

        it('should handle malformed fileInfo', () => {
            const element = new Element('>', 'div', false, 1, null);
            expect(element._fileInfo).toBeNull();

            const element2 = new Element('>', 'div', false, 1, undefined);
            expect(element2._fileInfo).toBeUndefined();
        });

        it('should handle malformed visibilityInfo', () => {
            const element = new Element('>', 'div', false, 1, {}, null);
            expect(element.visibilityInfo()).toEqual({});

            const element2 = new Element(
                '>',
                'div',
                false,
                1,
                {},
                { visibilityBlocks: 'invalid' }
            );
            expect(element2.visibilityInfo()).toEqual({
                visibilityBlocks: 'invalid'
            });
        });

        it('should handle invalid index', () => {
            const element = new Element('>', 'div', false, 'not-a-number');
            expect(element._index).toBe('not-a-number');
        });
    });

    describe('accept', () => {
        it('should visit combinator', () => {
            const element = new Element('>', 'div', false);
            const visitor = {
                visit: () => new Combinator('+')
            };
            element.accept(visitor);
            expect(element.combinator.value).toBe('+');
        });

        it('should visit object values', () => {
            const value = { type: 'test' };
            const element = new Element('>', value, false);
            const visitor = {
                visit: () => ({ type: 'visited' })
            };
            element.accept(visitor);
            expect(element.value.type).toBe('visited');
        });

        it('should not visit string values', () => {
            const element = new Element('>', 'div', false);
            const visitor = {
                visit: () => 'visited'
            };
            element.accept(visitor);
            expect(element.value).toBe('div');
        });

        it('should handle undefined value', () => {
            const element = new Element('>', undefined, false);
            const visitor = {
                visit: () => 'visited'
            };
            element.accept(visitor);
            expect(element.value).toBe('');
        });

        it('should handle null value', () => {
            const element = new Element('>', null, false);
            const visitor = {
                visit: () => 'visited'
            };
            element.accept(visitor);
            expect(element.value).toBe('');
        });

        it('should handle undefined/null values', () => {
            const element = new Element('>', undefined, false);
            const visitor = {
                visit: () => 'visited'
            };
            element.accept(visitor);
            expect(element.value).toBe('');
        });
    });

    describe('eval', () => {
        it('should create new Element with same properties', () => {
            const element = new Element('>', 'div', false, 1, {
                filename: 'test.less'
            });
            const result = element.eval({});
            expect(result).toBeInstanceOf(Element);
            expect(result).not.toBe(element);
            expect(result.value).toBe('div');
            expect(result.isVariable).toBe(false);
            expect(result.getIndex()).toBe(1);
        });

        it('should eval value if it has eval method', () => {
            const value = {
                eval: () => 'evaluated'
            };
            const element = new Element('>', value, false);
            const result = element.eval({});
            expect(result.value).toBe('evaluated');
        });

        it('should handle eval returning null', () => {
            const value = {
                eval: () => null
            };
            const element = new Element('>', value, false);
            const result = element.eval({});
            expect(result.value).toBe('');
        });

        it('should handle value without eval method', () => {
            const element = new Element('>', 'div', false);
            const result = element.eval({});
            expect(result.value).toBe('div');
        });

        it('should preserve visibility info during eval', () => {
            const visInfo = { visibilityBlocks: 1, nodeVisible: true };
            const element = new Element('>', 'div', false, 1, {}, visInfo);
            const result = element.eval({});
            expect(result.visibilityInfo()).toEqual(visInfo);
        });

        it('should preserve file info during eval', () => {
            const fileInfo = { filename: 'test.less' };
            const element = new Element('>', 'div', false, 1, fileInfo);
            const result = element.eval({});
            expect(result.fileInfo()).toEqual(fileInfo);
        });

        it('should handle value.eval throwing error', () => {
            const value = {
                eval: () => {
                    throw new Error('eval error');
                }
            };
            const element = new Element('>', value, false);
            expect(() => element.eval({})).toThrow('eval error');
        });

        it('should handle value.eval returning unexpected types', () => {
            const tests = [
                { evalReturn: undefined, expected: '' },
                { evalReturn: () => {}, expectedType: 'function' },
                {
                    evalReturn: Symbol('test'),
                    expectedType: 'symbol',
                    expectedDescription: 'test'
                },
                { evalReturn: 42, expected: 42 },
                { evalReturn: false, expected: '' }
            ];

            tests.forEach(
                ({
                    evalReturn,
                    expected,
                    expectedType,
                    expectedDescription
                }) => {
                    const value = {
                        eval: () => evalReturn
                    };
                    const element = new Element('>', value, false);
                    const result = element.eval({});

                    if (expectedType === 'function') {
                        expect(typeof result.value).toBe('function');
                    } else if (expectedType === 'symbol') {
                        expect(typeof result.value).toBe('symbol');
                        expect(result.value.description).toBe(
                            expectedDescription
                        );
                    } else {
                        expect(result.value).toBe(expected);
                    }
                }
            );
        });
    });

    describe('clone', () => {
        it('should create exact copy with all properties', () => {
            const fileInfo = { filename: 'test.less' };
            const visInfo = { visibilityBlocks: 1, nodeVisible: true };
            const element = new Element('>', 'div', true, 1, fileInfo);
            element.copyVisibilityInfo(visInfo);

            const clone = element.clone();
            expect(clone).toBeInstanceOf(Element);
            expect(clone).not.toBe(element);
            expect(clone.combinator.value).toBe(element.combinator.value);
            expect(clone.value).toBe(element.value);
            expect(clone.isVariable).toBe(element.isVariable);
            expect(clone.getIndex()).toBe(element.getIndex());
            expect(clone.fileInfo()).toEqual(element.fileInfo());
            expect(clone.visibilityInfo()).toEqual(element.visibilityInfo());
        });
    });

    describe('toCSS', () => {
        it('should combine combinator and value CSS', () => {
            const element = new Element('>', 'div', false);
            expect(element.toCSS()).toBe(' > div');
        });

        it('should handle Paren values', () => {
            const parenValue = {
                genCSS: (context, output) => output.add('test')
            };
            const paren = new Paren(parenValue);
            const element = new Element('>', paren, false);
            const result = element.toCSS();
            expect(result).toBe(' > (test)');
        });

        it('should return empty string for empty value with & combinator', () => {
            const element = new Element('&', '', false);
            expect(element.toCSS()).toBe('');
        });

        it('should handle values with toCSS method', () => {
            const value = { toCSS: () => 'custom' };
            const element = new Element('>', value, false);
            expect(element.toCSS()).toBe(' > custom');
        });

        it('should handle firstSelector context with Paren value', () => {
            const mockContext = { firstSelector: false };
            const parenValue = {
                genCSS: (ctx, output) => output.add('test'),
                toCSS: (ctx) => {
                    expect(ctx.firstSelector).toBe(true);
                    return 'test';
                }
            };
            const paren = new Paren(parenValue);
            const element = new Element('>', paren, false);
            element.toCSS(mockContext);
            expect(mockContext.firstSelector).toBe(false);
        });

        it('should handle different combinator types', () => {
            const tests = [
                { combinator: ' ', expected: ' div' },
                { combinator: '|', expected: '|div' },
                { combinator: '>', expected: ' > div' },
                { combinator: '+', expected: ' + div' },
                { combinator: '~', expected: ' ~ div' }
            ];

            tests.forEach(({ combinator, expected }) => {
                const element = new Element(combinator, 'div', false);
                expect(element.toCSS()).toBe(expected);
            });
        });

        it('should handle empty values', () => {
            const element = new Element('>', '', false);
            expect(element.toCSS()).toBe(' > ');
        });

        it('should handle & combinator with empty value', () => {
            const element = new Element('&', '', false);
            expect(element.toCSS()).toBe('');
        });

        it('should handle value.toCSS throwing error', () => {
            const value = {
                toCSS: () => {
                    throw new Error('toCSS error');
                }
            };
            const element = new Element('>', value, false);
            expect(() => element.toCSS()).toThrow('toCSS error');
        });

        it('should handle value.toCSS returning unexpected types', () => {
            const tests = [
                { cssReturn: undefined, expected: ' > undefined' },
                { cssReturn: null, expected: ' > null' },
                { cssReturn: 42, expected: ' > 42' },
                { cssReturn: false, expected: ' > false' },
                { cssReturn: {}, expected: ' > [object Object]' }
            ];

            tests.forEach(({ cssReturn, expected }) => {
                const value = {
                    toCSS: () => cssReturn
                };
                const element = new Element('>', value, false);
                expect(element.toCSS()).toBe(expected);
            });
        });

        it('should handle Paren value with throwing methods', () => {
            const parenValue = {
                genCSS: () => {
                    throw new Error('genCSS error');
                }
            };
            const paren = new Paren(parenValue);
            const element = new Element('>', paren, false);
            expect(() => element.toCSS()).toThrow('genCSS error');
        });
    });

    describe('genCSS', () => {
        it('should add CSS with file info and index', () => {
            const fileInfo = { filename: 'test.less' };
            const element = new Element('>', 'div', false, 42, fileInfo);
            const output = {
                add: vi.fn()
            };
            element.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith(' > div', fileInfo, 42);
        });

        it('should handle output.add throwing error', () => {
            const element = new Element('>', 'div', false);
            const output = {
                add: () => {
                    throw new Error('add error');
                }
            };
            expect(() => element.genCSS({}, output)).toThrow('add error');
        });

        it('should handle null/undefined output', () => {
            const element = new Element('>', 'div', false);
            expect(() => element.genCSS({}, null)).toThrow();
            expect(() => element.genCSS({}, undefined)).toThrow();
        });
    });

    describe('edge cases', () => {
        it('should handle circular references', () => {
            const obj = {};
            Object.assign(obj, { self: obj });
            const element = new Element('>', obj, false);
            expect(() => element.toCSS()).not.toThrow();
        });

        it('should handle very long values', () => {
            const longString = 'a'.repeat(10000);
            const element = new Element('>', longString, false);
            expect(() => element.toCSS()).not.toThrow();
            expect(element.toCSS()).toBe(` > ${longString}`);
        });

        it('should handle special characters in values', () => {
            const specialChars = '!@#$%^&*()_+{}[]|\\:;"\'<>,.?/~`';
            const element = new Element('>', specialChars, false);
            expect(() => element.toCSS()).not.toThrow();
            expect(element.toCSS()).toBe(` > ${specialChars}`);
        });

        it('should handle emoji and unicode characters', () => {
            const unicodeChars = '🌟 你好 привет مرحبا';
            const element = new Element('>', unicodeChars, false);
            expect(() => element.toCSS()).not.toThrow();
            expect(element.toCSS()).toBe(` > ${unicodeChars}`);
        });
    });
});
