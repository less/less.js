import { describe, it, expect, beforeEach } from 'vitest';
import booleanFunctions from './boolean.js';
import Anonymous from '../tree/anonymous.js';
import Keyword from '../tree/keyword.js';
import Dimension from '../tree/dimension.js';
import Color from '../tree/color.js';
import Quoted from '../tree/quoted.js';
import Variable from '../tree/variable.js';

describe('Boolean Functions', () => {
    let mockContext;

    beforeEach(() => {
        mockContext = {
            frames: [],
            eval: function (node) {
                return node.eval ? node.eval(this) : node;
            }
        };
    });

    describe('boolean function', () => {
        it('should return Keyword.True for truthy values', () => {
            const result = booleanFunctions.boolean(true);
            expect(result).toBe(Keyword.True);
            expect(result.value).toBe('true');
        });

        it('should return Keyword.False for falsy values', () => {
            const result = booleanFunctions.boolean(false);
            expect(result).toBe(Keyword.False);
            expect(result.value).toBe('false');
        });

        it('should return Keyword.True for truthy numbers', () => {
            const result = booleanFunctions.boolean(1);
            expect(result).toBe(Keyword.True);
            expect(result.value).toBe('true');
        });

        it('should return Keyword.False for zero', () => {
            const result = booleanFunctions.boolean(0);
            expect(result).toBe(Keyword.False);
            expect(result.value).toBe('false');
        });

        it('should return Keyword.True for non-empty strings', () => {
            const result = booleanFunctions.boolean('hello');
            expect(result).toBe(Keyword.True);
            expect(result.value).toBe('true');
        });

        it('should return Keyword.False for empty strings', () => {
            const result = booleanFunctions.boolean('');
            expect(result).toBe(Keyword.False);
            expect(result.value).toBe('false');
        });

        it('should return Keyword.True for objects', () => {
            const result = booleanFunctions.boolean({});
            expect(result).toBe(Keyword.True);
            expect(result.value).toBe('true');
        });

        it('should return Keyword.True for arrays', () => {
            const result = booleanFunctions.boolean([]);
            expect(result).toBe(Keyword.True);
            expect(result.value).toBe('true');
        });

        it('should return Keyword.False for null', () => {
            const result = booleanFunctions.boolean(null);
            expect(result).toBe(Keyword.False);
            expect(result.value).toBe('false');
        });

        it('should return Keyword.False for undefined', () => {
            const result = booleanFunctions.boolean(undefined);
            expect(result).toBe(Keyword.False);
            expect(result.value).toBe('false');
        });

        it('should return Keyword.False for NaN', () => {
            const result = booleanFunctions.boolean(NaN);
            expect(result).toBe(Keyword.False);
            expect(result.value).toBe('false');
        });

        it('should handle Less.js node objects as truthy', () => {
            const trueKeyword = new Keyword('true');
            const falseKeyword = new Keyword('false');

            // Both are objects, so both are truthy in JavaScript
            expect(booleanFunctions.boolean(trueKeyword)).toBe(Keyword.True);
            expect(booleanFunctions.boolean(falseKeyword)).toBe(Keyword.True);
        });

        it('should handle Dimension nodes with non-zero values', () => {
            const dimension = new Dimension(5, 'px');
            const result = booleanFunctions.boolean(dimension);
            expect(result).toBe(Keyword.True);
        });

        it('should handle Anonymous nodes with content', () => {
            const anonymous = new Anonymous('content');
            const result = booleanFunctions.boolean(anonymous);
            expect(result).toBe(Keyword.True);
        });
    });

    describe('if function (aliased as If)', () => {
        beforeEach(() => {
            // Mock eval behavior for test nodes
            mockContext.eval = function (node) {
                if (node && node.eval) {
                    return node.eval(this);
                }
                return node;
            };
        });

        it('should return true value when condition is truthy', () => {
            const condition = {
                eval: () => new Keyword('true')
            };
            const trueValue = {
                eval: () => new Quoted('"', 'success', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'failure', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('success');
        });

        it('should return false value when condition is falsy', () => {
            const condition = {
                eval: () => null // null is falsy
            };
            const trueValue = {
                eval: () => new Quoted('"', 'success', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'failure', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('failure');
        });

        it('should return Anonymous when condition is false and no false value provided', () => {
            const condition = {
                eval: () => null
            };
            const trueValue = {
                eval: () => new Quoted('"', 'success', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue
            );
            expect(result).toBeInstanceOf(Anonymous);
        });

        it('should handle numeric conditions', () => {
            const condition = {
                eval: () => new Dimension(1)
            };
            const trueValue = {
                eval: () => new Quoted('"', 'numeric true', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'numeric false', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('numeric true');
        });

        it('should handle zero Dimension as truthy condition', () => {
            const condition = {
                eval: () => new Dimension(0) // Objects are truthy in JS
            };
            const trueValue = {
                eval: () => new Quoted('"', 'zero true', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'zero false', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('zero true');
        });

        it('should handle empty string Quoted as truthy condition', () => {
            const condition = {
                eval: () => new Quoted('"', '', true) // Objects are truthy in JS
            };
            const trueValue = {
                eval: () => new Quoted('"', 'empty true', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'empty false', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('empty true');
        });

        it('should handle non-empty string as truthy condition', () => {
            const condition = {
                eval: () => new Quoted('"', 'hello', true)
            };
            const trueValue = {
                eval: () => new Quoted('"', 'string true', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'string false', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('string true');
        });

        it('should handle Color objects as truthy', () => {
            const condition = {
                eval: () => new Color([255, 0, 0])
            };
            const trueValue = {
                eval: () => new Quoted('"', 'color true', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'color false', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('color true');
        });

        it('should evaluate nested conditions', () => {
            const nestedCondition = {
                eval: () => new Keyword('true')
            };
            const condition = {
                eval: () => nestedCondition.eval()
            };
            const trueValue = {
                eval: () => new Quoted('"', 'nested true', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'nested false', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('nested true');
        });

        it('should pass context to all eval calls', () => {
            let contextPassed = false;
            const condition = {
                eval: (ctx) => {
                    contextPassed = ctx === mockContext;
                    return new Keyword('true');
                }
            };
            const trueValue = {
                eval: (ctx) => {
                    expect(ctx).toBe(mockContext);
                    return new Quoted('"', 'context passed', true);
                }
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue
            );
            expect(contextPassed).toBe(true);
            expect(result.value).toBe('context passed');
        });

        it('should not evaluate arguments (evalArgs = false)', () => {
            expect(booleanFunctions.if.evalArgs).toBe(false);
        });
    });

    describe('isdefined function', () => {
        beforeEach(() => {
            mockContext.frames = [
                {
                    variable: () => new Quoted('"', 'defined', true)
                }
            ];
        });

        it('should return Keyword.True for defined variables', () => {
            const variable = {
                eval: () => new Quoted('"', 'value', true)
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.True);
            expect(result.value).toBe('true');
        });

        it('should return Keyword.False for undefined variables that throw errors', () => {
            const variable = {
                eval: () => {
                    throw new Error('Variable not found');
                }
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.False);
            expect(result.value).toBe('false');
        });

        it('should handle variables that return null/undefined without throwing', () => {
            const variable = {
                eval: () => null
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.True);
        });

        it('should handle variables that return undefined without throwing', () => {
            const variable = {
                eval: () => undefined
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.True);
        });

        it('should handle complex variable objects', () => {
            const variable = new Variable('@color');
            variable.eval = () => new Color([255, 0, 0]);

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.True);
        });

        it('should handle syntax errors in variable evaluation', () => {
            const variable = {
                eval: () => {
                    throw { type: 'Syntax', message: 'Invalid syntax' };
                }
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.False);
        });

        it('should handle evaluation errors', () => {
            const variable = {
                eval: () => {
                    throw {
                        type: 'Name',
                        message: 'Variable @undefined is undefined'
                    };
                }
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.False);
        });

        it('should handle runtime errors during evaluation', () => {
            const variable = {
                eval: () => {
                    throw new TypeError('Cannot read property of undefined');
                }
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.False);
        });

        it('should pass correct context to variable evaluation', () => {
            let contextPassed = false;
            const variable = {
                eval: (ctx) => {
                    contextPassed = ctx === mockContext;
                    return new Quoted('"', 'context test', true);
                }
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(contextPassed).toBe(true);
            expect(result).toBe(Keyword.True);
        });

        it('should not evaluate arguments (evalArgs = false)', () => {
            expect(booleanFunctions.isdefined.evalArgs).toBe(false);
        });

        it('should handle variables that evaluate to falsy values', () => {
            const variable = {
                eval: () => new Dimension(0)
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.True);
        });

        it('should handle variables that evaluate to empty strings', () => {
            const variable = {
                eval: () => new Quoted('"', '', true)
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.True);
        });

        it('should handle variables that evaluate to Anonymous nodes', () => {
            const variable = {
                eval: () => new Anonymous('')
            };

            const result = booleanFunctions.isdefined(mockContext, variable);
            expect(result).toBe(Keyword.True);
        });
    });

    describe('exports structure', () => {
        it('should export boolean function', () => {
            expect(typeof booleanFunctions.boolean).toBe('function');
        });

        it('should export isdefined function', () => {
            expect(typeof booleanFunctions.isdefined).toBe('function');
        });

        it('should export if function with correct alias', () => {
            expect(typeof booleanFunctions.if).toBe('function');
        });

        it('should have correct evalArgs properties', () => {
            expect(booleanFunctions.if.evalArgs).toBe(false);
            expect(booleanFunctions.isdefined.evalArgs).toBe(false);
        });

        it('should export exactly three functions', () => {
            const keys = Object.keys(booleanFunctions);
            expect(keys).toHaveLength(3);
            expect(keys).toContain('boolean');
            expect(keys).toContain('isdefined');
            expect(keys).toContain('if');
        });
    });

    describe('integration scenarios', () => {
        it('should work with chained if statements', () => {
            const condition1 = {
                eval: () => new Keyword('true')
            };
            const condition2 = {
                eval: () => new Keyword('false')
            };
            const trueValue = {
                eval: () => new Quoted('"', 'first true', true)
            };
            const falseValue = {
                eval: () =>
                    booleanFunctions.if(
                        mockContext,
                        condition2,
                        { eval: () => new Quoted('"', 'second true', true) },
                        { eval: () => new Quoted('"', 'both false', true) }
                    )
            };

            const result = booleanFunctions.if(
                mockContext,
                condition1,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('first true');
        });

        it('should work with isdefined in if conditions', () => {
            const definedVar = {
                eval: () => new Quoted('"', 'exists', true)
            };
            const condition = {
                eval: () => booleanFunctions.isdefined(mockContext, definedVar)
            };
            const trueValue = {
                eval: () => new Quoted('"', 'variable exists', true)
            };
            const falseValue = {
                eval: () => new Quoted('"', 'variable missing', true)
            };

            const result = booleanFunctions.if(
                mockContext,
                condition,
                trueValue,
                falseValue
            );
            expect(result.value).toBe('variable exists');
        });

        it('should handle complex boolean logic combinations', () => {
            const var1 = { eval: () => new Dimension(1) };
            const var2 = {
                eval: () => {
                    throw new Error('undefined');
                }
            };

            const isVar1Defined = booleanFunctions.isdefined(mockContext, var1);
            const isVar2Defined = booleanFunctions.isdefined(mockContext, var2);

            expect(isVar1Defined).toBe(Keyword.True);
            expect(isVar2Defined).toBe(Keyword.False);

            const boolResult1 = booleanFunctions.boolean(isVar1Defined);
            const boolResult2 = booleanFunctions.boolean(isVar2Defined);

            expect(boolResult1).toBe(Keyword.True);
            expect(boolResult2).toBe(Keyword.True); // Keyword.False is an object, so truthy
        });
    });
});
