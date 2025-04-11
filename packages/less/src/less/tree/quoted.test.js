import { describe, it, expect } from 'vitest';
import Quoted from './quoted';

// Mock Declaration class - used internally by Property
/* eslint-disable no-unused-vars */
class Declaration {
    constructor(
        name,
        value,
        important,
        merge,
        index,
        currentFileInfo,
        inline,
        variable
    ) {
        this.name = name;
        this.value = value;
        this.important = important;
        this.merge = merge;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.inline = inline || false;
        this.variable =
            variable !== undefined
                ? variable
                : name.charAt && name.charAt(0) === '@';
        this.allowRoot = true;
    }
}
/* eslint-enable no-unused-vars */

describe('Quoted', () => {
    describe('constructor', () => {
        it('should initialize with default escaped value when not provided', () => {
            const quoted = new Quoted('"', 'test');
            expect(quoted.escaped).toBe(true);
            expect(quoted.value).toBe('test');
            expect(quoted.quote).toBe('"');
        });

        it('should initialize with provided escaped value', () => {
            const quoted = new Quoted('"', 'test', false);
            expect(quoted.escaped).toBe(false);
        });

        it('should initialize with empty string when content is not provided', () => {
            const quoted = new Quoted('"');
            expect(quoted.value).toBe('');
        });

        it('should set index and fileInfo when provided', () => {
            const index = 42;
            const fileInfo = { filename: 'test.less' };
            const quoted = new Quoted('"', 'test', true, index, fileInfo);
            expect(quoted._index).toBe(index);
            expect(quoted._fileInfo).toBe(fileInfo);
        });
    });

    describe('genCSS', () => {
        it('should output value without quotes when escaped is true', () => {
            const quoted = new Quoted('"', 'test', true);
            const output = { add: (chunk) => chunks.push(chunk) };
            const chunks = [];
            quoted.genCSS({}, output);
            expect(chunks).toEqual(['test']);
        });

        it('should output value with quotes when escaped is false', () => {
            const quoted = new Quoted('"', 'test', false);
            const output = { add: (chunk) => chunks.push(chunk) };
            const chunks = [];
            quoted.genCSS({}, output);
            expect(chunks).toEqual(['"', 'test', '"']);
        });
    });

    describe('containsVariables', () => {
        it('should return true when value contains variable interpolation', () => {
            const quoted = new Quoted('"', 'test @{var} test');
            expect(quoted.containsVariables()).toBeTruthy();
        });

        it('should return false when value does not contain variable interpolation', () => {
            const quoted = new Quoted('"', 'test');
            expect(quoted.containsVariables()).toBeFalsy();
        });
    });

    describe('eval', () => {
        it('should replace variables in the value', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            expect(name).toBe('@var');
                            return {
                                value: new Quoted('"', 'replaced', true)
                            };
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{var} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test replaced test');
        });

        it('should replace properties in the value', () => {
            const context = {
                frames: [
                    {
                        property: (name) => {
                            expect(name).toBe('$prop');
                            return [
                                {
                                    name: 'prop',
                                    value: new Quoted('"', 'replaced', true),
                                    important: false,
                                    merge: false,
                                    index: 0,
                                    currentFileInfo: {},
                                    inline: false,
                                    variable: false
                                }
                            ];
                        }
                    }
                ],
                pluginManager: {
                    less: {
                        visitors: {
                            ToCSSVisitor: {
                                prototype: {
                                    _mergeRules: () => {}
                                }
                            }
                        }
                    }
                }
            };
            const quoted = new Quoted('"', 'test ${prop} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test replaced test');
        });

        it('should handle multiple variable replacements', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            expect(['@var1', '@var2']).toContain(name);
                            return {
                                value: new Quoted('"', 'replaced', true)
                            };
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{var1} test @{var2} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test replaced test replaced test');
        });

        it('should preserve quotes and escaped status', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            expect(name).toBe('@var');
                            return {
                                value: new Quoted('"', 'replaced', true)
                            };
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{var} test', false);
            const result = quoted.eval(context);
            expect(result.quote).toBe('"');
            expect(result.escaped).toBe(false);
        });

        it('should handle nested variable interpolation', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            if (name === '@outer') {
                                return {
                                    value: new Quoted('"', 'inner', true)
                                };
                            }
                            if (name === '@inner') {
                                return {
                                    value: new Quoted('"', 'value', true)
                                };
                            }
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{@{outer}} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test value test');
        });

        it('should handle empty variable interpolation', () => {
            const context = {
                frames: [
                    {
                        variable: () => {
                            return { value: new Quoted('"', '', true) };
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test @{} test');
        });

        it('should handle mixed variable and property interpolation', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            expect(name).toBe('@var');
                            return {
                                value: new Quoted('"', 'var-value', true)
                            };
                        },
                        property: (name) => {
                            expect(name).toBe('$prop');
                            return [
                                {
                                    name: 'prop',
                                    value: new Quoted('"', 'prop-value', true),
                                    important: false,
                                    merge: false,
                                    index: 0,
                                    currentFileInfo: {},
                                    inline: false,
                                    variable: false
                                }
                            ];
                        }
                    }
                ],
                pluginManager: {
                    less: {
                        visitors: {
                            ToCSSVisitor: {
                                prototype: {
                                    _mergeRules: () => {}
                                }
                            }
                        }
                    }
                }
            };
            const quoted = new Quoted('"', 'test @{var} and ${prop} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test var-value and prop-value test');
        });

        it('should handle empty context', () => {
            const quoted = new Quoted('"', 'test @{var} test');
            const context = {
                frames: [
                    {
                        variable: () => null
                    }
                ]
            };
            expect(() => quoted.eval(context)).toThrow(
                'variable @var is undefined'
            );
        });

        it('should handle undefined context', () => {
            const quoted = new Quoted('"', 'test @{var} test');
            const context = {
                frames: [
                    {
                        variable: () => null
                    }
                ]
            };
            expect(() => quoted.eval(context)).toThrow(
                'variable @var is undefined'
            );
        });
    });

    describe('compare', () => {
        it('should compare values when both are unescaped quoted strings', () => {
            const quoted1 = new Quoted('"', 'test', false);
            const quoted2 = new Quoted("'", 'test', false);
            expect(quoted1.compare(quoted2)).toBe(0);
        });

        it('should return undefined when comparing with non-quoted type', () => {
            const quoted = new Quoted('"', 'test');
            const other = { type: 'Other', toCSS: () => 'different' };
            expect(quoted.compare(other)).toBeUndefined();
        });

        it('should return undefined when comparing escaped and unescaped quotes with different values', () => {
            const quoted1 = new Quoted('"', 'test1', true);
            const quoted2 = new Quoted('"', 'test2', false);
            expect(quoted1.compare(quoted2)).toBeUndefined();
        });

        it('should return 0 when comparing escaped and unescaped quotes with same values', () => {
            const quoted1 = new Quoted('"', 'test', true);
            const quoted2 = new Quoted('"', 'test', false);
            // Mock toCSS to return the same value for both
            quoted1.toCSS = () => 'test';
            quoted2.toCSS = () => 'test';
            expect(quoted1.compare(quoted2)).toBe(0);
        });

        it('should return undefined when comparing with null', () => {
            const quoted = new Quoted('"', 'test');
            const mockNull = { type: undefined };
            expect(quoted.compare(mockNull)).toBeUndefined();
        });

        it('should return undefined when comparing with undefined', () => {
            const quoted = new Quoted('"', 'test');
            const mockUndefined = { type: undefined };
            expect(quoted.compare(mockUndefined)).toBeUndefined();
        });

        it('should return undefined when comparing with non-object', () => {
            const quoted = new Quoted('"', 'test');
            const mockNonObject = { type: undefined };
            expect(quoted.compare(mockNonObject)).toBeUndefined();
        });

        it('should return undefined when comparing with object without type', () => {
            const quoted = new Quoted('"', 'test');
            expect(quoted.compare({})).toBeUndefined();
        });
    });

    describe('constructor edge cases', () => {
        it('should handle empty quotes', () => {
            const quoted = new Quoted('"', '');
            expect(quoted.value).toBe('');
            expect(quoted.quote).toBe('"');
        });

        it('should handle whitespace-only content', () => {
            const quoted = new Quoted('"', '   ');
            expect(quoted.value).toBe('   ');
        });

        it('should handle special characters in content', () => {
            const quoted = new Quoted('"', '!@#$%^&*()');
            expect(quoted.value).toBe('!@#$%^&*()');
        });

        it('should handle undefined fileInfo and index', () => {
            const quoted = new Quoted('"', 'test', true, undefined, undefined);
            expect(quoted._index).toBeUndefined();
            expect(quoted._fileInfo).toBeUndefined();
        });

        it('should handle null or undefined str argument', () => {
            expect(() => new Quoted(null, 'test')).toThrow();
            expect(() => new Quoted(undefined, 'test')).toThrow();
        });

        it('should handle non-string str argument', () => {
            expect(() => new Quoted(123, 'test')).toThrow();
            expect(() => new Quoted({}, 'test')).toThrow();
            expect(() => new Quoted([], 'test')).toThrow();
        });

        it('should handle non-string content argument', () => {
            const quoted = new Quoted('"', 123);
            expect(quoted.value).toBe(123);
            const obj = { toString: () => 'test' };
            const quotedObj = new Quoted('"', obj);
            expect(quotedObj.value).toBe(obj);
            expect(quotedObj.value.toString()).toBe('test');
        });

        it('should handle non-boolean escaped argument', () => {
            const quoted = new Quoted('"', 'test', 'true');
            expect(quoted.escaped).toBe('true');
            const quoted2 = new Quoted('"', 'test', 0);
            expect(quoted2.escaped).toBe(0);
        });
    });

    describe('genCSS edge cases', () => {
        it('should handle value containing the quote character', () => {
            const quoted = new Quoted('"', 'test " quote', false);
            const output = { add: (chunk) => chunks.push(chunk) };
            const chunks = [];
            quoted.genCSS({}, output);
            expect(chunks).toEqual(['"', 'test " quote', '"']);
        });

        it('should handle value containing newlines and special characters', () => {
            const quoted = new Quoted('"', 'test\n\t\r\f', false);
            const output = { add: (chunk) => chunks.push(chunk) };
            const chunks = [];
            quoted.genCSS({}, output);
            expect(chunks).toEqual(['"', 'test\n\t\r\f', '"']);
        });

        it('should handle value containing CSS special characters', () => {
            const quoted = new Quoted('"', 'test {}[]()<>;:,.', false);
            const output = { add: (chunk) => chunks.push(chunk) };
            const chunks = [];
            quoted.genCSS({}, output);
            expect(chunks).toEqual(['"', 'test {}[]()<>;:,.', '"']);
        });
    });

    describe('containsVariables edge cases', () => {
        it('should handle multiple variable interpolations', () => {
            const quoted = new Quoted('"', 'test @{var1} @{var2} @{var3}');
            expect(quoted.containsVariables()).toBeTruthy();
        });

        it('should handle property interpolations', () => {
            const quoted = new Quoted('"', 'test ${prop1} ${prop2}');
            expect(quoted.containsVariables()).toBeFalsy();
        });

        it('should handle invalid variable syntax', () => {
            const quoted = new Quoted('"', 'test @{invalid syntax}');
            expect(quoted.containsVariables()).toBeFalsy();
        });

        it('should handle escaped variable syntax', () => {
            const quoted = new Quoted('"', 'test \\@{var}');
            expect(quoted.containsVariables()).toBeTruthy();
        });

        it('should handle nested variable interpolations', () => {
            const quoted = new Quoted('"', 'test @{@{outer}}');
            expect(quoted.containsVariables()).toBeTruthy();
        });
    });

    describe('eval edge cases', () => {
        it('should handle variable replacement with non-string values', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            expect(name).toBe('@var');
                            return {
                                value: new Quoted('"', '123', true)
                            };
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{var} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test 123 test');
        });

        it('should handle property replacement with non-string values', () => {
            const context = {
                frames: [
                    {
                        property: (name) => {
                            expect(name).toBe('$prop');
                            return [
                                {
                                    name: 'prop',
                                    value: new Quoted('"', 'replaced', true),
                                    important: false,
                                    merge: false,
                                    index: 0,
                                    currentFileInfo: {},
                                    inline: false,
                                    variable: false
                                }
                            ];
                        }
                    }
                ],
                pluginManager: {
                    less: {
                        visitors: {
                            ToCSSVisitor: {
                                prototype: {
                                    _mergeRules: () => {}
                                }
                            }
                        }
                    }
                }
            };
            const quoted = new Quoted('"', 'test ${prop} test');
            const result = quoted.eval(context);
            expect(result.value).toBe('test replaced test');
        });

        it('should handle variable replacement with null/undefined values', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            expect(name).toBe('@var');
                            return {
                                value: null
                            };
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{var} test');
            expect(() => quoted.eval(context)).toThrow(
                "Cannot read properties of null (reading 'eval')"
            );
        });

        it('should handle property replacement with null/undefined values', () => {
            const context = {
                frames: [
                    {
                        property: (name) => {
                            expect(name).toBe('$prop');
                            return [
                                {
                                    name: 'prop',
                                    value: null,
                                    important: false,
                                    merge: false,
                                    index: 0,
                                    currentFileInfo: {},
                                    inline: false,
                                    variable: false
                                }
                            ];
                        }
                    }
                ],
                pluginManager: {
                    less: {
                        visitors: {
                            ToCSSVisitor: {
                                prototype: {
                                    _mergeRules: () => {}
                                }
                            }
                        }
                    }
                }
            };
            const quoted = new Quoted('"', 'test ${prop} test');
            expect(() => quoted.eval(context)).toThrow();
        });

        it('should handle invalid variable names', () => {
            const context = {
                frames: [
                    {
                        variable: (name) => {
                            expect(name).toBe('@invalid-name');
                            return null;
                        }
                    }
                ]
            };
            const quoted = new Quoted('"', 'test @{invalid-name} test');
            expect(() => quoted.eval(context)).toThrow(
                'variable @invalid-name is undefined'
            );
        });

        it('should handle invalid property names', () => {
            const context = {
                frames: [
                    {
                        property: (name) => {
                            expect(name).toBe('$invalid-name');
                            return [];
                        }
                    }
                ],
                pluginManager: {
                    less: {
                        visitors: {
                            ToCSSVisitor: {
                                prototype: {
                                    _mergeRules: () => {}
                                }
                            }
                        }
                    }
                }
            };
            const quoted = new Quoted('"', 'test ${invalid-name} test');
            expect(() => quoted.eval(context)).toThrow();
        });
    });

    describe('compare edge cases', () => {
        it('should handle objects with toCSS returning different values', () => {
            const quoted = new Quoted('"', 'test');
            const other = {
                type: 'Quoted',
                toCSS: () => 'different'
            };
            expect(quoted.compare(other)).toBeUndefined();
        });

        it('should handle objects with toCSS throwing errors', () => {
            const quoted = new Quoted('"', 'test');
            const other = {
                type: 'Quoted',
                toCSS: () => {
                    throw new Error('test error');
                }
            };
            expect(() => quoted.compare(other)).toThrow('test error');
        });

        it('should handle objects with toCSS returning non-string values', () => {
            const quoted = new Quoted('"', 'test');
            const other = {
                type: 'Quoted',
                toCSS: () => 123
            };
            expect(quoted.compare(other)).toBeUndefined();
        });

        it('should handle objects with toCSS returning null/undefined', () => {
            const quoted = new Quoted('"', 'test');
            const other = {
                type: 'Quoted',
                toCSS: () => null
            };
            expect(quoted.compare(other)).toBeUndefined();
        });

        it('should handle objects with toCSS returning empty strings', () => {
            const quoted = new Quoted('"', 'test');
            const other = {
                type: 'Quoted',
                toCSS: () => ''
            };
            expect(quoted.compare(other)).toBeUndefined();
        });

        it('should handle objects with toCSS returning whitespace-only strings', () => {
            const quoted = new Quoted('"', 'test');
            const other = {
                type: 'Quoted',
                toCSS: () => '   '
            };
            expect(quoted.compare(other)).toBeUndefined();
        });
    });
});
