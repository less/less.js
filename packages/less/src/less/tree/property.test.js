import { expect } from 'vitest';
import Property from './property';
import Declaration from './declaration';
import Value from './value';
import Anonymous from './anonymous';

describe('Property', () => {
    describe('constructor', () => {
        it('should initialize with name, index and fileInfo', () => {
            const name = 'test-property';
            const index = 42;
            const fileInfo = { filename: 'test.less' };
            const property = new Property(name, index, fileInfo);

            expect(property.name).toBe(name);
            expect(property._index).toBe(index);
            expect(property._fileInfo).toBe(fileInfo);
        });

        it('should handle empty name', () => {
            const property = new Property('', 0, { filename: 'test.less' });
            expect(property.name).toBe('');
        });

        it('should handle negative index', () => {
            const property = new Property('test', -1, {
                filename: 'test.less'
            });
            expect(property._index).toBe(-1);
        });

        it('should handle undefined fileInfo', () => {
            const property = new Property('test', 0, undefined);
            expect(property._fileInfo).toBeUndefined();
        });

        it('should handle null name', () => {
            const property = new Property(null, 0, { filename: 'test.less' });
            expect(property.name).toBeNull();
        });

        it('should handle undefined index', () => {
            const property = new Property('test', undefined, {
                filename: 'test.less'
            });
            expect(property._index).toBeUndefined();
        });

        it('should handle null fileInfo', () => {
            const property = new Property('test', 0, null);
            expect(property._fileInfo).toBeNull();
        });
    });

    describe('eval', () => {
        const createContext = (frames = []) => ({
            frames,
            importantScope: [{}],
            pluginManager: {
                less: {
                    visitors: {
                        ToCSSVisitor: {
                            prototype: {
                                _mergeRules: (arr) => arr
                            }
                        }
                    }
                }
            }
        });

        it('should throw error for recursive property reference', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            property.evaluating = true;

            expect(() => property.eval(createContext())).toThrow(
                expect.objectContaining({
                    type: 'Name',
                    message: 'Recursive property reference for test',
                    filename: 'test.less',
                    index: 0
                })
            );
        });

        it('should throw error for undefined property', () => {
            const property = new Property('undefined-property', 0, {
                filename: 'test.less'
            });
            const context = createContext();

            expect(() => property.eval(context)).toThrow(
                expect.objectContaining({
                    type: 'Name',
                    message: "Property 'undefined-property' is undefined",
                    filename: 'test.less',
                    index: 0
                })
            );
        });

        it('should evaluate property from frames', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value = new Value([new Anonymous('value')]);
            const declaration = new Declaration(
                'test',
                value,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) => {
                    if (name === 'test') {
                        return [declaration];
                    }
                    return null;
                }
            };

            const context = createContext([frame]);
            const result = property.eval(context);

            // The value is returned as a Node object
            expect(result).toEqual(
                expect.objectContaining({
                    value: 'value',
                    allowRoot: true,
                    rulesetLike: false
                })
            );
        });

        it('should handle important flag in property evaluation', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value = new Value([new Anonymous('value')]);
            const declaration = new Declaration(
                'test',
                value,
                '!important',
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) => {
                    if (name === 'test') {
                        return [declaration];
                    }
                    return null;
                }
            };

            const importantScope = { important: false };
            const context = createContext([frame]);
            context.importantScope = [importantScope];

            property.eval(context);
            expect(importantScope.important).toBe(' !important');
        });

        it('should handle multiple declarations with merge', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value1 = new Value([new Anonymous('value1')]);
            const value2 = new Value([new Anonymous('value2')]);
            const declaration1 = new Declaration(
                'test',
                value1,
                false,
                true,
                0,
                { filename: 'test.less' }
            );
            const declaration2 = new Declaration(
                'test',
                value2,
                false,
                true,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) => {
                    if (name === 'test') {
                        return [declaration1, declaration2];
                    }
                    return null;
                }
            };

            const context = createContext([frame]);
            const result = property.eval(context);

            // The value is returned as a Node object
            expect(result).toEqual(
                expect.objectContaining({
                    value: 'value2',
                    allowRoot: true,
                    rulesetLike: false
                })
            );
        });

        it('should handle empty frames array', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const context = createContext([]);

            expect(() => property.eval(context)).toThrow(
                expect.objectContaining({
                    type: 'Name',
                    message: "Property 'test' is undefined"
                })
            );
        });

        it('should handle multiple frames with same property', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value1 = new Value([new Anonymous('value1')]);
            const value2 = new Value([new Anonymous('value2')]);
            const declaration1 = new Declaration(
                'test',
                value1,
                false,
                false,
                0,
                { filename: 'test.less' }
            );
            const declaration2 = new Declaration(
                'test',
                value2,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame1 = {
                property: (name) => (name === 'test' ? [declaration1] : null)
            };
            const frame2 = {
                property: (name) => (name === 'test' ? [declaration2] : null)
            };

            const context = createContext([frame1, frame2]);
            const result = property.eval(context);
            expect(result.value).toBe('value1'); // Should take first frame's value
        });

        it('should handle multiple frames with different properties', () => {
            const property = new Property('test2', 0, {
                filename: 'test.less'
            });
            const value1 = new Value([new Anonymous('value1')]);
            const value2 = new Value([new Anonymous('value2')]);
            const declaration1 = new Declaration(
                'test1',
                value1,
                false,
                false,
                0,
                { filename: 'test.less' }
            );
            const declaration2 = new Declaration(
                'test2',
                value2,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame1 = {
                property: (name) => (name === 'test1' ? [declaration1] : null)
            };
            const frame2 = {
                property: (name) => (name === 'test2' ? [declaration2] : null)
            };

            const context = createContext([frame1, frame2]);
            const result = property.eval(context);
            expect(result.value).toBe('value2');
        });

        it('should handle single declaration with merge flag', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value = new Value([new Anonymous('value')]);
            const declaration = new Declaration('test', value, false, true, 0, {
                filename: 'test.less'
            });

            const frame = {
                property: (name) => (name === 'test' ? [declaration] : null)
            };

            const context = createContext([frame]);
            const result = property.eval(context);
            expect(result.value).toBe('value');
        });

        it('should handle multiple declarations without merge', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value1 = new Value([new Anonymous('value1')]);
            const value2 = new Value([new Anonymous('value2')]);
            const declaration1 = new Declaration(
                'test',
                value1,
                false,
                false,
                0,
                { filename: 'test.less' }
            );
            const declaration2 = new Declaration(
                'test',
                value2,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) =>
                    name === 'test' ? [declaration1, declaration2] : null
            };

            const context = createContext([frame]);
            const result = property.eval(context);
            expect(result.value).toBe('value2'); // Takes last declaration when merge is false
        });

        it('should handle property with null value', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value = new Value([new Anonymous(null)]);
            const declaration = new Declaration(
                'test',
                value,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) => (name === 'test' ? [declaration] : null)
            };

            const context = createContext([frame]);
            const result = property.eval(context);
            expect(result.value).toBeNull();
        });

        it('should handle property with undefined value', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value = new Value([new Anonymous(undefined)]);
            const declaration = new Declaration(
                'test',
                value,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) => (name === 'test' ? [declaration] : null)
            };

            const context = createContext([frame]);
            const result = property.eval(context);
            expect(result.value).toBeUndefined();
        });

        it('should handle property with empty string value', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value = new Value([new Anonymous('')]);
            const declaration = new Declaration(
                'test',
                value,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) => (name === 'test' ? [declaration] : null)
            };

            const context = createContext([frame]);
            const result = property.eval(context);
            expect(result.value).toBe('');
        });

        it('should handle properties with mixed merge flags', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value1 = new Value([new Anonymous('value1')]);
            const value2 = new Value([new Anonymous('value2')]);
            const declaration1 = new Declaration(
                'test',
                value1,
                false,
                true,
                0,
                { filename: 'test.less' }
            );
            const declaration2 = new Declaration(
                'test',
                value2,
                false,
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) =>
                    name === 'test' ? [declaration1, declaration2] : null
            };

            const context = createContext([frame]);
            const result = property.eval(context);
            expect(result.value).toBe('value2');
        });

        it('should handle multiple important flags', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const value1 = new Value([new Anonymous('value1')]);
            const value2 = new Value([new Anonymous('value2')]);
            const declaration1 = new Declaration(
                'test',
                value1,
                '!important',
                false,
                0,
                { filename: 'test.less' }
            );
            const declaration2 = new Declaration(
                'test',
                value2,
                '!important',
                false,
                0,
                { filename: 'test.less' }
            );

            const frame = {
                property: (name) =>
                    name === 'test' ? [declaration1, declaration2] : null
            };

            const importantScope = { important: false };
            const context = createContext([frame]);
            context.importantScope = [importantScope];

            property.eval(context);
            expect(importantScope.important).toBe(' !important');
        });
    });

    describe('find', () => {
        it('should find first matching item in array', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const arr = [1, 2, 3, 4];
            let found = false;
            const result = property.find(arr, (item) => {
                if (item === 3) {
                    found = true;
                    return item;
                }
                return null;
            });
            expect(found).toBe(true);
            expect(result).toBe(3);
        });

        it('should return null if no match found', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const arr = [1, 2, 3, 4];
            const result = property.find(arr, (item) => item > 5);
            expect(result).toBeNull();
        });

        it('should return null for empty array', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const result = property.find([], () => true);
            expect(result).toBeNull();
        });

        it('should handle callback returning undefined', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const arr = [1, 2, 3];
            const result = property.find(arr, () => undefined);
            expect(result).toBeNull();
        });

        it('should handle array with null values', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const arr = [null, 2, null];
            const result = property.find(arr, (item) => {
                if (item === 2) {
                    return item;
                }
                return null;
            });
            expect(result).toBe(2);
        });

        it('should handle callback throwing error', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const arr = [1, 2, 3];
            expect(() => {
                property.find(arr, () => {
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
        });

        it('should handle array with undefined values', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const arr = [undefined, 2, undefined];
            const result = property.find(arr, (item) => {
                if (item === 2) {
                    return item;
                }
                return null;
            });
            expect(result).toBe(2);
        });

        it('should handle array with mixed types', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const arr = [1, 'string', true, null];
            const result = property.find(arr, (item) => {
                if (typeof item === 'string') {
                    return item;
                }
                return null;
            });
            expect(result).toBe('string');
        });

        it('should handle array with objects', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const obj = { key: 'value' };
            const arr = [1, obj, 3];
            const result = property.find(arr, (item) => {
                if (typeof item === 'object' && item !== null) {
                    return item;
                }
                return null;
            });
            expect(result).toBe(obj);
        });

        it('should handle array with functions', () => {
            const property = new Property('test', 0, { filename: 'test.less' });
            const func = () => {};
            const arr = [1, func, 3];
            const result = property.find(arr, (item) => {
                if (typeof item === 'function') {
                    return item;
                }
                return null;
            });
            expect(result).toBe(func);
        });
    });
});
