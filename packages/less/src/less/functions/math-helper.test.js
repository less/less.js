import { describe, it, expect } from 'vitest';
import MathHelper from './math-helper.js';
import Dimension from '../tree/dimension.js';
import Unit from '../tree/unit.js';

describe('MathHelper', () => {
    describe('argument validation', () => {
        it('should throw error for non-Dimension argument', () => {
            const fn = x => x * 2;
            
            expect(() => MathHelper(fn, null, 'not-a-dimension')).toThrow();
            expect(() => MathHelper(fn, null, 42)).toThrow();
            expect(() => MathHelper(fn, null, null)).toThrow();
            expect(() => MathHelper(fn, null, undefined)).toThrow();
            expect(() => MathHelper(fn, null, {})).toThrow();
        });

        it('should throw error with specific message for invalid argument', () => {
            const fn = x => x * 2;
            
            try {
                MathHelper(fn, null, 'invalid');
                expect.fail('Expected error to be thrown');
            } catch (error) {
                expect(error.type).toBe('Argument');
                expect(error.message).toBe('argument must be a number');
            }
        });

        it('should accept valid Dimension argument', () => {
            const fn = x => x * 2;
            const dim = new Dimension(5);
            
            expect(() => MathHelper(fn, null, dim)).not.toThrow();
        });
    });

    describe('unit handling', () => {
        it('should use dimension unit when unit parameter is null', () => {
            const fn = x => x * 2;
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(5, unit);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.unit).toBe(unit);
            expect(result.value).toBe(10);
        });

        it('should use dimension unit when unit parameter is undefined', () => {
            const fn = x => x * 2;
            const unit = new Unit(['em'], [], 'em');
            const dim = new Dimension(3, unit);
            
            const result = MathHelper(fn, undefined, dim);
            
            // JavaScript treats undefined as falsy, so it calls unify
            expect(result.value).toBe(6);
        });

        it('should use provided unit when unit parameter is specified', () => {
            const fn = x => x * 2;
            const originalUnit = new Unit(['px'], [], 'px');
            const newUnit = new Unit(['em'], [], 'em');
            const dim = new Dimension(5, originalUnit);
            
            // Mock the unify method to return a unified dimension
            dim.unify = () => new Dimension(5, originalUnit);
            
            const result = MathHelper(fn, newUnit, dim);
            
            expect(result.unit).toBe(newUnit);
            expect(result.value).toBe(10);
        });

        it('should call unify when unit parameter is provided', () => {
            const fn = x => x * 2;
            const originalUnit = new Unit(['px'], [], 'px');
            const newUnit = new Unit(['em'], [], 'em');
            const dim = new Dimension(5, originalUnit);
            
            let unifyCalled = false;
            dim.unify = () => {
                unifyCalled = true;
                return new Dimension(5, originalUnit);
            };
            
            MathHelper(fn, newUnit, dim);
            
            expect(unifyCalled).toBe(true);
        });

        it('should handle unitless dimensions', () => {
            const fn = x => x * 3;
            const dim = new Dimension(4);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(12);
            expect(result.unit).toBe(dim.unit);
        });
    });

    describe('mathematical operations', () => {
        it('should apply simple multiplication function', () => {
            const fn = x => x * 2;
            const dim = new Dimension(5);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(10);
        });

        it('should apply simple addition function', () => {
            const fn = x => x + 10;
            const dim = new Dimension(5);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(15);
        });

        it('should apply division function', () => {
            const fn = x => x / 2;
            const dim = new Dimension(10);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(5);
        });

        it('should apply subtraction function', () => {
            const fn = x => x - 3;
            const dim = new Dimension(8);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(5);
        });

        it('should apply power function', () => {
            const fn = x => Math.pow(x, 2);
            const dim = new Dimension(4);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(16);
        });

        it('should apply square root function', () => {
            const fn = x => Math.sqrt(x);
            const dim = new Dimension(16);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(4);
        });

        it('should apply trigonometric functions', () => {
            const sinFn = x => Math.sin(x);
            const dim = new Dimension(Math.PI / 2);
            
            const result = MathHelper(sinFn, null, dim);
            
            expect(result.value).toBeCloseTo(1, 10);
        });

        it('should handle negative numbers', () => {
            const fn = x => Math.abs(x);
            const dim = new Dimension(-5);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(5);
        });

        it('should handle decimal numbers', () => {
            const fn = x => x * 2;
            const dim = new Dimension(3.14);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBeCloseTo(6.28, 10);
        });

        it('should handle zero values', () => {
            const fn = x => x + 1;
            const dim = new Dimension(0);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(1);
        });

        it('should handle very large numbers', () => {
            const fn = x => x / 1000000;
            const dim = new Dimension(1000000000);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(1000);
        });

        it('should handle very small numbers', () => {
            const fn = x => x * 1000;
            const dim = new Dimension(0.001);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(1);
        });
    });

    describe('return value properties', () => {
        it('should return a Dimension instance', () => {
            const fn = x => x * 2;
            const dim = new Dimension(5);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result).toBeInstanceOf(Dimension);
        });

        it('should preserve unit when no unit conversion', () => {
            const fn = x => x * 2;
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(5, unit);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.unit).toBe(unit);
        });

        it('should use specified unit when provided', () => {
            const fn = x => x * 2;
            const originalUnit = new Unit(['px'], [], 'px');
            const newUnit = new Unit(['em'], [], 'em');
            const dim = new Dimension(5, originalUnit);
            
            // Mock unify to return the dimension unchanged
            dim.unify = () => dim;
            
            const result = MathHelper(fn, newUnit, dim);
            
            expect(result.unit).toBe(newUnit);
        });
    });

    describe('complex scenarios', () => {
        it('should handle chained mathematical operations', () => {
            const fn1 = x => x * 2;
            const fn2 = x => x + 5;
            const dim = new Dimension(3);
            
            const result1 = MathHelper(fn1, null, dim);
            const result2 = MathHelper(fn2, null, result1);
            
            expect(result2.value).toBe(11); // (3 * 2) + 5 = 11
        });

        it('should work with complex units', () => {
            const fn = x => x * 2;
            const unit = new Unit(['px', 'em'], ['s'], 'px*em/s');
            const dim = new Dimension(5, unit);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(10);
            expect(result.unit).toBe(unit);
        });

        it('should handle function that returns NaN', () => {
            const fn = x => Math.sqrt(-x); // Will return NaN for positive x
            const dim = new Dimension(5);
            
            // This will throw because Dimension constructor rejects NaN values
            expect(() => MathHelper(fn, null, dim)).toThrow('Dimension is not a number.');
        });

        it('should handle function that returns Infinity', () => {
            const fn = x => 1 / x;
            const dim = new Dimension(0);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(Infinity);
        });

        it('should handle function that returns negative Infinity', () => {
            const fn = x => -1 / x;
            const dim = new Dimension(0);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(-Infinity);
        });
    });

    describe('parseFloat behavior', () => {
        it('should handle string values in dimension', () => {
            const fn = x => x * 2;
            const dim = new Dimension('5');
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(10);
        });

        it('should handle string values with decimals', () => {
            const fn = x => x * 2;
            const dim = new Dimension('3.14');
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBeCloseTo(6.28, 10);
        });

        it('should handle edge cases of parseFloat', () => {
            const fn = x => x + 1;
            
            // Test with various parseFloat edge cases
            expect(MathHelper(fn, null, new Dimension('5.5')).value).toBe(6.5);
            expect(MathHelper(fn, null, new Dimension('  10  ')).value).toBe(11);
            expect(MathHelper(fn, null, new Dimension('5.5abc')).value).toBe(6.5);
        });
    });

    describe('dimension with unify method', () => {
        it('should use the dimension returned by unify when unit is specified', () => {
            const fn = x => x * 2;
            const originalUnit = new Unit(['px'], [], 'px');
            const newUnit = new Unit(['em'], [], 'em');
            const dim = new Dimension(5, originalUnit);
            const unifiedDim = new Dimension(10, originalUnit); // Different value after unify
            
            dim.unify = () => unifiedDim;
            
            const result = MathHelper(fn, newUnit, dim);
            
            expect(result.value).toBe(20); // 10 * 2, using unified dimension value
            expect(result.unit).toBe(newUnit);
        });

        it('should not call unify when unit is null', () => {
            const fn = x => x * 2;
            const dim = new Dimension(5);
            
            let unifyCalled = false;
            dim.unify = () => {
                unifyCalled = true;
                return dim;
            };
            
            MathHelper(fn, null, dim);
            
            expect(unifyCalled).toBe(false);
        });

        it('should call unify when unit is undefined', () => {
            const fn = x => x * 2;
            const dim = new Dimension(5);
            
            let unifyCalled = false;
            dim.unify = () => {
                unifyCalled = true;
                return dim;
            };
            
            MathHelper(fn, undefined, dim);
            
            // JavaScript treats undefined as truthy in `if (unit === null)` check, so unify is called
            expect(unifyCalled).toBe(true);
        });
    });

    describe('edge cases and error conditions', () => {
        it('should handle empty function (identity)', () => {
            const fn = x => x;
            const dim = new Dimension(42);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(42);
        });

        it('should handle function that ignores input', () => {
            const fn = () => 100;
            const dim = new Dimension(42);
            
            const result = MathHelper(fn, null, dim);
            
            expect(result.value).toBe(100);
        });

        it('should work with falsy unit values', () => {
            const fn = x => x * 2;
            const dim = new Dimension(5);
            
            const result1 = MathHelper(fn, null, dim);
            const result2 = MathHelper(fn, undefined, dim);
            const result3 = MathHelper(fn, 0, dim);
            
            expect(result1.value).toBe(10);
            expect(result2.value).toBe(10);
            expect(result3.value).toBe(10);
        });
    });
});