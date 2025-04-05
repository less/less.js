import { describe, it, expect, vi } from 'vitest';
import Value from './value';
import Node from './node';

describe('Value', () => {
    describe('constructor', () => {
        it('should throw error when constructed without an argument', () => {
            expect(() => new Value()).toThrow(
                'Value requires an array argument'
            );
        });

        it('should throw error when constructed with null', () => {
            expect(() => new Value(null)).toThrow(
                'Value requires an array argument'
            );
        });

        it('should throw error when constructed with undefined', () => {
            expect(() => new Value(undefined)).toThrow(
                'Value requires an array argument'
            );
        });

        it('should wrap single non-array value in array', () => {
            const singleValue = { type: 'test' };
            const value = new Value(singleValue);
            expect(value.value).toEqual([singleValue]);
        });

        it('should store array value as is', () => {
            const arrayValue = [{ type: 'test1' }, { type: 'test2' }];
            const value = new Value(arrayValue);
            expect(value.value).toBe(arrayValue);
        });

        it('should handle empty array', () => {
            const value = new Value([]);
            expect(value.value).toEqual([]);
        });

        it('should inherit from Node', () => {
            const value = new Value([]);
            expect(value instanceof Node).toBe(true);
            expect(value.type).toBe('Value');
        });

        it('should handle array with null/undefined values', () => {
            const arrayValue = [null, undefined, { type: 'test' }];
            const value = new Value(arrayValue);
            expect(value.value).toBe(arrayValue);
        });

        it('should handle array with primitive values', () => {
            const arrayValue = [123, 'string', true];
            const value = new Value(arrayValue);
            expect(value.value).toBe(arrayValue);
        });
    });

    describe('accept', () => {
        it('should call visitArray on visitor with value array', () => {
            const mockVisitor = {
                visitArray: vi.fn((arr) => arr)
            };
            const valueArr = [{ type: 'test' }];
            const value = new Value(valueArr);

            value.accept(mockVisitor);
            expect(mockVisitor.visitArray).toHaveBeenCalledWith(valueArr);
        });

        it('should not call visitArray if value is undefined', () => {
            const mockVisitor = {
                visitArray: vi.fn((arr) => arr)
            };
            const value = new Value([]);
            value.value = undefined;

            value.accept(mockVisitor);
            expect(mockVisitor.visitArray).not.toHaveBeenCalled();
        });

        it('should not call visitArray if value is null', () => {
            const mockVisitor = {
                visitArray: vi.fn((arr) => arr)
            };
            const value = new Value([]);
            value.value = null;

            value.accept(mockVisitor);
            expect(mockVisitor.visitArray).not.toHaveBeenCalled();
        });

        it('should assign visitArray result back to value', () => {
            const transformedValue = [{ type: 'transformed' }];
            const mockVisitor = {
                visitArray: vi.fn(() => transformedValue)
            };
            const value = new Value([{ type: 'original' }]);

            value.accept(mockVisitor);
            expect(value.value).toBe(transformedValue);
        });

        it('should handle visitor returning null', () => {
            const mockVisitor = {
                visitArray: vi.fn().mockReturnValueOnce(null)
            };
            const value = new Value([{ type: 'test' }]);

            value.accept(mockVisitor);
            expect(value.value).toBeNull();

            // Verify that null value prevents future visitArray calls
            value.accept(mockVisitor);
            expect(mockVisitor.visitArray).toHaveBeenCalledTimes(1);
        });

        it('should handle visitor returning undefined', () => {
            const mockVisitor = {
                visitArray: vi.fn().mockReturnValueOnce(undefined)
            };
            const value = new Value([{ type: 'test' }]);

            value.accept(mockVisitor);
            expect(value.value).toBeUndefined();

            // Verify that undefined value prevents future visitArray calls
            value.accept(mockVisitor);
            expect(mockVisitor.visitArray).toHaveBeenCalledTimes(1);
        });

        it('should handle visitor throwing an error', () => {
            const mockVisitor = {
                visitArray: vi.fn(() => {
                    throw new Error('Visitor error');
                })
            };
            const value = new Value([{ type: 'test' }]);

            expect(() => value.accept(mockVisitor)).toThrow('Visitor error');
        });
    });

    describe('eval', () => {
        it('should return evaluated single value', () => {
            const mockContext = { someContext: true };
            const mockEvalResult = { type: 'evaluated' };
            const mockValue = {
                eval: vi.fn(() => mockEvalResult)
            };

            const value = new Value([mockValue]);
            const result = value.eval(mockContext);

            expect(mockValue.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(mockEvalResult);
        });

        it('should handle empty array', () => {
            const value = new Value([]);
            const result = value.eval({});
            expect(result).toBeInstanceOf(Value);
            expect(result.value).toEqual([]);
        });

        it('should return new Value with evaluated multiple values', () => {
            const mockContext = { someContext: true };
            const mockValues = [
                { eval: vi.fn(() => ({ type: 'eval1' })) },
                { eval: vi.fn(() => ({ type: 'eval2' })) }
            ];

            const value = new Value(mockValues);
            const result = value.eval(mockContext);

            expect(result).toBeInstanceOf(Value);
            expect(result.value).toEqual([
                { type: 'eval1' },
                { type: 'eval2' }
            ]);
            mockValues.forEach((v) => {
                expect(v.eval).toHaveBeenCalledWith(mockContext);
            });
        });

        it('should evaluate values in order', () => {
            const evaluationOrder = [];
            const mockValues = [
                {
                    eval: vi.fn(() => {
                        evaluationOrder.push(1);
                        return { type: 'eval1' };
                    })
                },
                {
                    eval: vi.fn(() => {
                        evaluationOrder.push(2);
                        return { type: 'eval2' };
                    })
                },
                {
                    eval: vi.fn(() => {
                        evaluationOrder.push(3);
                        return { type: 'eval3' };
                    })
                }
            ];

            const value = new Value(mockValues);
            value.eval({});

            expect(evaluationOrder).toEqual([1, 2, 3]);
        });

        it('should handle values that throw during evaluation', () => {
            const mockValue = {
                eval: vi.fn(() => {
                    throw new Error('Eval error');
                })
            };
            const value = new Value([mockValue]);

            expect(() => value.eval({})).toThrow('Eval error');
        });

        it('should handle values returning null/undefined during evaluation', () => {
            const mockValues = [
                { eval: vi.fn(() => null) },
                { eval: vi.fn(() => undefined) }
            ];
            const value = new Value(mockValues);
            const result = value.eval({});

            expect(result).toBeInstanceOf(Value);
            expect(result.value).toEqual([null, undefined]);
        });

        it('should handle values returning primitive types during evaluation', () => {
            const mockValues = [
                { eval: vi.fn(() => 123) },
                { eval: vi.fn(() => 'string') },
                { eval: vi.fn(() => true) }
            ];
            const value = new Value(mockValues);
            const result = value.eval({});

            expect(result).toBeInstanceOf(Value);
            expect(result.value).toEqual([123, 'string', true]);
        });
    });

    describe('genCSS', () => {
        it('should handle empty array', () => {
            const mockOutput = { add: vi.fn() };
            const value = new Value([]);
            value.genCSS({}, mockOutput);
            expect(mockOutput.add).not.toHaveBeenCalled();
        });

        it('should generate CSS for single value', () => {
            const mockOutput = { add: vi.fn() };
            const mockValue = {
                genCSS: vi.fn((ctx, out) => out.add('test'))
            };

            const value = new Value([mockValue]);
            value.genCSS({}, mockOutput);

            expect(mockValue.genCSS).toHaveBeenCalledWith({}, mockOutput);
            expect(mockOutput.add).toHaveBeenCalledWith('test');
        });

        it('should generate CSS for multiple values with default separator', () => {
            const mockOutput = { add: vi.fn() };
            const mockValues = [
                { genCSS: vi.fn((ctx, out) => out.add('test1')) },
                { genCSS: vi.fn((ctx, out) => out.add('test2')) }
            ];

            const value = new Value(mockValues);
            value.genCSS({}, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith('test1');
            expect(mockOutput.add).toHaveBeenCalledWith(', ');
            expect(mockOutput.add).toHaveBeenCalledWith('test2');
        });

        it('should generate CSS for multiple values with compressed separator', () => {
            const mockOutput = { add: vi.fn() };
            const mockValues = [
                { genCSS: vi.fn((ctx, out) => out.add('test1')) },
                { genCSS: vi.fn((ctx, out) => out.add('test2')) }
            ];

            const value = new Value(mockValues);
            value.genCSS({ compress: true }, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith('test1');
            expect(mockOutput.add).toHaveBeenCalledWith(',');
            expect(mockOutput.add).toHaveBeenCalledWith('test2');
        });

        it('should not add separator after last value', () => {
            const mockOutput = { add: vi.fn() };
            const mockValues = [
                { genCSS: vi.fn((ctx, out) => out.add('test1')) },
                { genCSS: vi.fn((ctx, out) => out.add('test2')) }
            ];

            const value = new Value(mockValues);
            value.genCSS({}, mockOutput);

            const calls = mockOutput.add.mock.calls;
            expect(calls[calls.length - 1][0]).toBe('test2');
        });

        it('should pass context to each value genCSS call', () => {
            const mockContext = { compress: true, someOtherFlag: true };
            const mockValues = [{ genCSS: vi.fn() }, { genCSS: vi.fn() }];

            const value = new Value(mockValues);
            value.genCSS(mockContext, { add: vi.fn() });

            mockValues.forEach((v) => {
                expect(v.genCSS).toHaveBeenCalledWith(
                    mockContext,
                    expect.any(Object)
                );
            });
        });

        it('should generate CSS values in order', () => {
            const generationOrder = [];
            const mockOutput = { add: vi.fn() };
            const mockValues = [
                {
                    genCSS: vi.fn(() => {
                        generationOrder.push(1);
                        mockOutput.add('test1');
                    })
                },
                {
                    genCSS: vi.fn(() => {
                        generationOrder.push(2);
                        mockOutput.add('test2');
                    })
                },
                {
                    genCSS: vi.fn(() => {
                        generationOrder.push(3);
                        mockOutput.add('test3');
                    })
                }
            ];

            const value = new Value(mockValues);
            value.genCSS({}, mockOutput);

            expect(generationOrder).toEqual([1, 2, 3]);
        });

        it('should handle values throwing during CSS generation', () => {
            const mockValue = {
                genCSS: vi.fn(() => {
                    throw new Error('GenCSS error');
                })
            };
            const value = new Value([mockValue]);

            expect(() => value.genCSS({}, { add: vi.fn() })).toThrow(
                'GenCSS error'
            );
        });

        it('should handle values with empty/whitespace-only output', () => {
            const mockOutput = { add: vi.fn() };
            const mockValues = [
                { genCSS: vi.fn((ctx, out) => out.add('')) },
                { genCSS: vi.fn((ctx, out) => out.add('   ')) },
                { genCSS: vi.fn((ctx, out) => out.add('test')) }
            ];

            const value = new Value(mockValues);
            value.genCSS({}, mockOutput);

            // Should still add separators between values
            expect(mockOutput.add).toHaveBeenCalledWith('');
            expect(mockOutput.add).toHaveBeenCalledWith(', ');
            expect(mockOutput.add).toHaveBeenCalledWith('   ');
            expect(mockOutput.add).toHaveBeenCalledWith(', ');
            expect(mockOutput.add).toHaveBeenCalledWith('test');
        });

        it('should handle output.add throwing an error', () => {
            const mockOutput = {
                add: vi.fn(() => {
                    throw new Error('Output error');
                })
            };
            const value = new Value([
                { genCSS: vi.fn((ctx, out) => out.add('test')) }
            ]);

            expect(() => value.genCSS({}, mockOutput)).toThrow('Output error');
        });

        it('should handle various context compression settings', () => {
            const mockOutput = { add: vi.fn() };
            const mockValues = [
                { genCSS: vi.fn((ctx, out) => out.add('test1')) },
                { genCSS: vi.fn((ctx, out) => out.add('test2')) }
            ];
            const value = new Value(mockValues);

            // Test different compression settings
            value.genCSS({ compress: true }, mockOutput);
            expect(mockOutput.add).toHaveBeenCalledWith(',');

            mockOutput.add.mockClear();
            value.genCSS({ compress: false }, mockOutput);
            expect(mockOutput.add).toHaveBeenCalledWith(', ');

            mockOutput.add.mockClear();
            value.genCSS({ compress: undefined }, mockOutput);
            expect(mockOutput.add).toHaveBeenCalledWith(', ');
        });
    });
});
