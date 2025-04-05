import { describe, it, expect, beforeEach } from 'vitest';
import Variable from './variable';
import Call from './call';
import Node from './node';

describe('Variable', () => {
    let mockContext;
    let mockFileInfo;

    beforeEach(() => {
        mockFileInfo = {
            filename: 'test.less'
        };
        mockContext = {
            frames: [
                {
                    functionRegistry: {
                        get: () => null
                    }
                }
            ],
            importantScope: [{ important: false }],
            inCalc: false,
            enterCalc: () => {},
            exitCalc: () => {},
            mathOn: true
        };
    });

    describe('Variable creation', () => {
        it('should create a Variable instance with correct properties', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            expect(variable.name).toBe('@color');
            expect(variable._index).toBe(1);
            expect(variable._fileInfo).toBe(mockFileInfo);
            expect(variable.type).toBe('Variable');
        });

        it('should handle undefined parameters', () => {
            const variable = new Variable('@color');
            expect(variable.name).toBe('@color');
            expect(variable._index).toBeUndefined();
            expect(variable._fileInfo).toBeUndefined();
            expect(variable.type).toBe('Variable');
        });
    });

    describe('Variable evaluation', () => {
        it('should evaluate a simple variable', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            const mockValue = { eval: () => ({ value: 'red' }) };
            mockContext.frames = [
                {
                    functionRegistry: {
                        get: () => null
                    },
                    variable: (name) =>
                        name === '@color' ? { value: mockValue } : null
                }
            ];

            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'red' });
        });

        it('should search through multiple frames', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            const mockValue = { eval: () => ({ value: 'blue' }) };
            mockContext.frames = [
                {
                    functionRegistry: { get: () => null },
                    variable: () => null
                },
                {
                    functionRegistry: { get: () => null },
                    variable: (name) =>
                        name === '@color' ? { value: mockValue } : null
                }
            ];

            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'blue' });
        });

        it('should handle variables with @@ prefix', () => {
            const variable = new Variable('@@var', 1, mockFileInfo);
            const innerValue = { eval: () => ({ value: 'color' }) };
            const outerValue = { eval: () => ({ value: 'red' }) };

            mockContext.frames = [
                {
                    functionRegistry: {
                        get: () => null
                    },
                    variable: (name) => {
                        if (name === '@var') return { value: innerValue };
                        if (name === '@color') return { value: outerValue };
                        return null;
                    }
                }
            ];

            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'red' });
        });

        it('should handle multiple @@ prefix levels', () => {
            const variable = new Variable('@@@var', 1, mockFileInfo);
            const firstValue = { eval: () => ({ value: 'color' }) };
            const secondValue = { eval: () => ({ value: 'primary' }) };
            const finalValue = { eval: () => ({ value: 'blue' }) };

            mockContext.frames = [
                {
                    functionRegistry: {
                        get: () => null
                    },
                    variable: (name) => {
                        if (name === '@var') return { value: firstValue };
                        if (name === '@color') return { value: secondValue };
                        if (name === '@primary') return { value: finalValue };
                        return null;
                    }
                }
            ];

            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'blue' });
        });

        it('should propagate file info to evaluated result', () => {
            const sourceFileInfo = { filename: 'source.less' };
            const variable = new Variable('@color', 42, sourceFileInfo);

            // Create a Node instance that will properly receive file info
            class MockNode extends Node {
                constructor() {
                    super();
                    this.value = 'red';
                    this._fileInfo = sourceFileInfo;
                    this._index = 42;
                }
            }
            const resultNode = new MockNode();

            const mockValue = {
                eval: () => resultNode
            };
            mockContext.frames = [
                {
                    functionRegistry: { get: () => null },
                    variable: () => ({ value: mockValue })
                }
            ];

            const result = variable.eval(mockContext);
            expect(result.fileInfo()).toEqual(sourceFileInfo);
            expect(result.getIndex()).toBe(42);
        });

        it('should throw error for recursive variable definition', () => {
            const variable = new Variable('@recursive', 1, mockFileInfo);
            variable.evaluating = true;

            expect(() => variable.eval(mockContext)).toThrowError(
                'Recursive variable definition for @recursive'
            );
        });

        it('should throw error for undefined variable', () => {
            const variable = new Variable('@undefined', 1, mockFileInfo);
            mockContext.frames = [
                {
                    functionRegistry: {
                        get: () => null
                    },
                    variable: () => null
                }
            ];

            expect(() => variable.eval(mockContext)).toThrowError(
                'variable @undefined is undefined'
            );
        });

        it('should handle variables in calc context', () => {
            const variable = new Variable('@number', 1, mockFileInfo);
            const mockValue = {
                eval: () => ({ value: 42 })
            };
            mockContext.inCalc = true;
            mockContext.frames = [
                {
                    functionRegistry: {
                        get: () => null
                    },
                    variable: (name) =>
                        name === '@number' ? { value: mockValue } : null
                }
            ];

            const result = variable.eval(mockContext);
            expect(result).toBeInstanceOf(Call);
            expect(result.name).toBe('_SELF');
            expect(result.args[0]).toEqual({ value: 42 });
        });

        it('should handle variables with important flag', () => {
            const variable = new Variable('@important', 1, mockFileInfo);
            const mockValue = { eval: () => ({ value: 'important!' }) };
            mockContext.frames = [
                {
                    functionRegistry: {
                        get: () => null
                    },
                    variable: (name) =>
                        name === '@important'
                            ? { value: mockValue, important: true }
                            : null
                }
            ];

            variable.eval(mockContext);
            expect(mockContext.importantScope[0].important).toBe(true);
        });
    });

    describe('find method', () => {
        it('should find first matching item in array', () => {
            const variable = new Variable('@test', 1, mockFileInfo);
            const arr = [1, 2, 3, 4, 5];
            const result = variable.find(arr, (item) =>
                item === 3 ? item : null
            );
            expect(result).toBe(3);
        });

        it('should return null if no match found', () => {
            const variable = new Variable('@test', 1, mockFileInfo);
            const arr = [1, 2, 3, 4, 5];
            const result = variable.find(arr, (item) =>
                item === 6 ? item : null
            );
            expect(result).toBeNull();
        });

        it('should handle empty array', () => {
            const variable = new Variable('@test', 1, mockFileInfo);
            const result = variable.find([], (item) => item);
            expect(result).toBeNull();
        });

        it('should handle non-array input gracefully', () => {
            const variable = new Variable('@test', 1, mockFileInfo);
            const result = variable.find('not an array', () => false);
            expect(result).toBeNull();
        });
    });

    describe('Edge cases for variable names', () => {
        it('should handle empty variable name', () => {
            const variable = new Variable('', 1, mockFileInfo);
            mockContext.frames = [
                {
                    variable: () => null
                }
            ];
            // Empty variable names should throw undefined variable error
            expect(() => variable.eval(mockContext)).toThrowError(
                'variable  is undefined'
            );
        });

        it('should handle special characters in variable names', () => {
            const variable = new Variable('@special!#$%', 1, mockFileInfo);
            const mockValue = { eval: () => ({ value: 'special' }) };
            mockContext.frames = [
                {
                    variable: (name) =>
                        name === '@special!#$%' ? { value: mockValue } : null
                }
            ];
            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'special' });
        });

        it('should handle very long variable names', () => {
            const longName = '@' + 'a'.repeat(1000);
            const variable = new Variable(longName, 1, mockFileInfo);
            const mockValue = { eval: () => ({ value: 'long' }) };
            mockContext.frames = [
                {
                    variable: (name) =>
                        name === longName ? { value: mockValue } : null
                }
            ];
            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'long' });
        });
    });

    describe('Context variations', () => {
        it('should handle empty frames array', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            mockContext.frames = [];
            expect(() => variable.eval(mockContext)).toThrowError(
                'variable @color is undefined'
            );
        });

        it('should respect frame precedence with duplicate variables', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            mockContext.frames = [
                {
                    variable: () => ({
                        value: { eval: () => ({ value: 'red' }) }
                    })
                },
                {
                    variable: () => ({
                        value: { eval: () => ({ value: 'blue' }) }
                    })
                }
            ];
            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'red' });
        });

        it('should handle importantScope with important flag', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            // Ensure importantScope has at least one element
            mockContext.importantScope = [{ important: false }];
            const mockValue = { eval: () => ({ value: 'red' }) };
            mockContext.frames = [
                {
                    variable: () => ({ value: mockValue, important: true })
                }
            ];
            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'red' });
            // Verify the important flag was set
            expect(mockContext.importantScope[0].important).toBe(true);
        });

        it('should handle importantScope without important flag', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            mockContext.importantScope = [{ important: false }];
            const mockValue = { eval: () => ({ value: 'red' }) };
            mockContext.frames = [
                {
                    variable: () => ({ value: mockValue })
                }
            ];
            const result = variable.eval(mockContext);
            expect(result).toEqual({ value: 'red' });
            // Verify the important flag remains unchanged
            expect(mockContext.importantScope[0].important).toBe(false);
        });
    });

    describe('Error handling', () => {
        it('should handle invalid fileInfo', () => {
            const variable = new Variable('@color', 1, null);
            mockContext.frames = [
                {
                    variable: () => ({
                        value: { eval: () => ({ value: 'red' }) }
                    })
                }
            ];
            expect(() => variable.eval(mockContext)).not.toThrow();
        });

        it('should handle null context', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            expect(() => variable.eval(null)).toThrowError();
        });

        it('should handle malformed variable values', () => {
            const variable = new Variable('@color', 1, mockFileInfo);
            mockContext.frames = [
                {
                    variable: () => ({ value: null })
                }
            ];
            expect(() => variable.eval(mockContext)).toThrowError();
        });
    });
});
