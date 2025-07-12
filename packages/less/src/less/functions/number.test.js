import { describe, it, expect } from 'vitest';
import numberFunctions from './number.js';
import Dimension from '../tree/dimension.js';
import Unit from '../tree/unit.js';
import Anonymous from '../tree/anonymous.js';

describe('Number Functions', () => {
    describe('min function', () => {
        it('should return the minimum of two numbers', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(3);
            const result = numberFunctions.min(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(3);
        });

        it('should return the minimum of multiple numbers', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(3);
            const dim3 = new Dimension(7);
            const dim4 = new Dimension(1);
            const result = numberFunctions.min(dim1, dim2, dim3, dim4);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1);
        });

        it('should handle single argument', () => {
            const dim = new Dimension(5);
            const result = numberFunctions.min(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
        });

        it('should handle negative numbers', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(-3);
            const dim3 = new Dimension(0);
            const result = numberFunctions.min(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-3);
        });

        it('should handle decimal numbers', () => {
            const dim1 = new Dimension(3.14);
            const dim2 = new Dimension(2.71);
            const dim3 = new Dimension(3.0);
            const result = numberFunctions.min(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(2.71);
        });

        it('should handle same unit dimensions', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim1 = new Dimension(10, unit);
            const dim2 = new Dimension(5, unit);
            const result = numberFunctions.min(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
            expect(result.unit).toBe(unit);
        });

        it('should handle compatible unit dimensions', () => {
            const pxUnit = new Unit(['px'], [], 'px');
            const cmUnit = new Unit(['cm'], [], 'cm');
            const dim1 = new Dimension(10, pxUnit);
            const dim2 = new Dimension(1, cmUnit);
            
            // Mock unify method for test
            dim1.unify = () => new Dimension(10, pxUnit);
            dim2.unify = () => new Dimension(37.7952755906, pxUnit); // 1cm ≈ 37.8px
            
            const result = numberFunctions.min(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(10);
            expect(result.unit).toBe(pxUnit);
        });

        it('should handle zero values', () => {
            const dim1 = new Dimension(0);
            const dim2 = new Dimension(5);
            const dim3 = new Dimension(-5);
            const result = numberFunctions.min(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-5);
        });

        it('should handle all equal values', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(5);
            const dim3 = new Dimension(5);
            const result = numberFunctions.min(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
        });

        it('should return undefined when incompatible units throw error', () => {
            const pxUnit = new Unit(['px'], [], 'px');
            const percentUnit = new Unit(['%'], [], '%');
            const dim1 = new Dimension(10, pxUnit);
            const dim2 = new Dimension(50, percentUnit);
            
            // Mock unify methods - these units cannot be unified
            dim1.unify = () => dim1;
            dim2.unify = () => dim2;
            
            // The function catches errors and returns undefined
            const result = numberFunctions.min(dim1, dim2);
            
            expect(result).toBeUndefined();
        });

        it('should handle arrays as arguments', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(3);
            const arrayArg = { value: [new Dimension(7), new Dimension(1)] };
            
            const result = numberFunctions.min(dim1, dim2, arrayArg);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1);
        });

        it('should return undefined for no arguments', () => {
            const result = numberFunctions.min();
            expect(result).toBeUndefined();
        });

        it('should return undefined for incompatible types', () => {
            const dim = new Dimension(5);
            const invalidArg = { value: 'not-an-array' };
            
            const result = numberFunctions.min(dim, invalidArg);
            expect(result).toBeUndefined();
        });

        it('should return undefined for non-Dimension arguments', () => {
            const result = numberFunctions.min('not-a-dimension', 42);
            expect(result).toBeUndefined();
        });

        it('should handle unitless and unit dimensions together', () => {
            const pxUnit = new Unit(['px'], [], 'px');
            const dim1 = new Dimension(10);
            const dim2 = new Dimension(5, pxUnit);
            
            // Mock unify methods
            dim1.unify = () => dim1;
            dim2.unify = () => dim2;
            
            const result = numberFunctions.min(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
        });
    });

    describe('max function', () => {
        it('should return the maximum of two numbers', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(3);
            const result = numberFunctions.max(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
        });

        it('should return the maximum of multiple numbers', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(3);
            const dim3 = new Dimension(7);
            const dim4 = new Dimension(1);
            const result = numberFunctions.max(dim1, dim2, dim3, dim4);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(7);
        });

        it('should handle single argument', () => {
            const dim = new Dimension(5);
            const result = numberFunctions.max(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
        });

        it('should handle negative numbers', () => {
            const dim1 = new Dimension(-5);
            const dim2 = new Dimension(-3);
            const dim3 = new Dimension(-10);
            const result = numberFunctions.max(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-3);
        });

        it('should handle decimal numbers', () => {
            const dim1 = new Dimension(3.14);
            const dim2 = new Dimension(2.71);
            const dim3 = new Dimension(3.0);
            const result = numberFunctions.max(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(3.14);
        });

        it('should handle same unit dimensions', () => {
            const unit = new Unit(['em'], [], 'em');
            const dim1 = new Dimension(2, unit);
            const dim2 = new Dimension(5, unit);
            const result = numberFunctions.max(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
            expect(result.unit).toBe(unit);
        });

        it('should handle zero values', () => {
            const dim1 = new Dimension(0);
            const dim2 = new Dimension(5);
            const dim3 = new Dimension(-5);
            const result = numberFunctions.max(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
        });

        it('should handle all equal values', () => {
            const dim1 = new Dimension(3);
            const dim2 = new Dimension(3);
            const dim3 = new Dimension(3);
            const result = numberFunctions.max(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(3);
        });

        it('should return undefined when incompatible units throw error', () => {
            const pxUnit = new Unit(['px'], [], 'px');
            const emUnit = new Unit(['em'], [], 'em');
            const dim1 = new Dimension(10, pxUnit);
            const dim2 = new Dimension(2, emUnit);
            
            // Mock unify methods - these units cannot be unified
            dim1.unify = () => dim1;
            dim2.unify = () => dim2;
            
            // The function catches errors and returns undefined
            const result = numberFunctions.max(dim1, dim2);
            
            expect(result).toBeUndefined();
        });

        it('should handle arrays as arguments', () => {
            const dim1 = new Dimension(5);
            const arrayArg = { value: [new Dimension(7), new Dimension(10), new Dimension(3)] };
            
            const result = numberFunctions.max(dim1, arrayArg);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(10);
        });

        it('should return undefined for no arguments', () => {
            const result = numberFunctions.max();
            expect(result).toBeUndefined();
        });

        it('should return undefined for incompatible types', () => {
            const dim = new Dimension(5);
            const invalidArg = { value: 123 }; // not an array
            
            const result = numberFunctions.max(dim, invalidArg);
            expect(result).toBeUndefined();
        });
    });

    describe('convert function', () => {
        it('should convert dimension to specified unit', () => {
            const dim = new Dimension(10, new Unit(['px'], [], 'px'));
            const targetUnit = new Dimension(1, new Unit(['cm'], [], 'cm'));
            
            // Mock convertTo method - it receives the dimension's value property
            dim.convertTo = (unit) => {
                expect(unit).toBe(targetUnit.value);
                return new Dimension(0.26458333, new Unit(['cm'], [], 'cm'));
            };
            
            const result = numberFunctions.convert(dim, targetUnit);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(0.26458333);
            expect(result.unit.toString()).toBe('cm');
        });

        it('should handle unitless conversion', () => {
            const dim = new Dimension(42);
            const targetUnit = new Dimension(1);
            
            // Mock convertTo method - it receives the dimension's value property
            dim.convertTo = (unit) => {
                expect(unit).toBe(targetUnit.value);
                return new Dimension(42);
            };
            
            const result = numberFunctions.convert(dim, targetUnit);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(42);
        });

        it('should handle conversion between same units', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(100, unit);
            const targetUnit = new Dimension(1, unit);
            
            // Mock convertTo method - it receives the dimension's value property
            dim.convertTo = (unitStr) => {
                expect(unitStr).toBe(targetUnit.value);
                return new Dimension(100, unit);
            };
            
            const result = numberFunctions.convert(dim, targetUnit);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(100);
            expect(result.unit).toBe(unit);
        });

        it('should handle percent conversion', () => {
            const dim = new Dimension(0.5);
            const percentUnit = new Unit(['%'], [], '%');
            const targetUnit = new Dimension(1, percentUnit);
            
            // Mock convertTo method - it receives the dimension's value property
            dim.convertTo = (unit) => {
                expect(unit).toBe(targetUnit.value);
                return new Dimension(50, percentUnit);
            };
            
            const result = numberFunctions.convert(dim, targetUnit);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(50);
            expect(result.unit.toString()).toBe('%');
        });
    });

    describe('pi function', () => {
        it('should return Pi as a dimension', () => {
            const result = numberFunctions.pi();
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(Math.PI);
            // Dimension constructor creates a default empty unit
            expect(result.unit).toBeDefined();
        });

        it('should return exact Pi value', () => {
            const result = numberFunctions.pi();
            
            expect(result.value).toBe(3.141592653589793);
        });

        it('should return dimension with empty unit', () => {
            const result = numberFunctions.pi();
            
            expect(result.unit).toBeDefined();
            expect(result.unit.numerator).toEqual([]);
            expect(result.unit.denominator).toEqual([]);
        });
    });

    describe('mod function', () => {
        it('should calculate modulo of two numbers', () => {
            const dim1 = new Dimension(10);
            const dim2 = new Dimension(3);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1);
            expect(result.unit).toBe(dim1.unit);
        });

        it('should preserve unit from first argument', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim1 = new Dimension(25, unit);
            const dim2 = new Dimension(7);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(4);
            expect(result.unit).toBe(unit);
        });

        it('should handle negative dividends', () => {
            const dim1 = new Dimension(-10);
            const dim2 = new Dimension(3);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-1);
        });

        it('should handle negative divisors', () => {
            const dim1 = new Dimension(10);
            const dim2 = new Dimension(-3);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1);
        });

        it('should handle both negative', () => {
            const dim1 = new Dimension(-10);
            const dim2 = new Dimension(-3);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-1);
        });

        it('should handle zero dividend', () => {
            const dim1 = new Dimension(0);
            const dim2 = new Dimension(5);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(0);
        });

        it('should handle decimal numbers', () => {
            const dim1 = new Dimension(10.5);
            const dim2 = new Dimension(3.2);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBeCloseTo(0.9, 10);
        });

        it('should handle mod by 1', () => {
            const dim1 = new Dimension(5.7);
            const dim2 = new Dimension(1);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBeCloseTo(0.7, 10);
        });

        it('should throw error for mod by zero', () => {
            const dim1 = new Dimension(10);
            const dim2 = new Dimension(0);
            
            // JavaScript modulo by zero returns NaN, which causes Dimension constructor to throw
            expect(() => numberFunctions.mod(dim1, dim2)).toThrow('Dimension is not a number');
        });

        it('should handle large numbers', () => {
            const dim1 = new Dimension(1000000);
            const dim2 = new Dimension(7);
            const result = numberFunctions.mod(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1); // 1000000 % 7 = 1
        });
    });

    describe('pow function', () => {
        it('should calculate power of two dimensions', () => {
            const base = new Dimension(2);
            const exponent = new Dimension(3);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(8);
            expect(result.unit).toBe(base.unit);
        });

        it('should preserve unit from base', () => {
            const unit = new Unit(['em'], [], 'em');
            const base = new Dimension(3, unit);
            const exponent = new Dimension(2);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(9);
            expect(result.unit).toBe(unit);
        });

        it('should handle negative base', () => {
            const base = new Dimension(-2);
            const exponent = new Dimension(3);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-8);
        });

        it('should handle negative exponent', () => {
            const base = new Dimension(2);
            const exponent = new Dimension(-2);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(0.25);
        });

        it('should handle zero exponent', () => {
            const base = new Dimension(5);
            const exponent = new Dimension(0);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1);
        });

        it('should handle zero base', () => {
            const base = new Dimension(0);
            const exponent = new Dimension(5);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(0);
        });

        it('should handle decimal exponent', () => {
            const base = new Dimension(4);
            const exponent = new Dimension(0.5);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(2);
        });

        it('should handle one as base', () => {
            const base = new Dimension(1);
            const exponent = new Dimension(100);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1);
        });

        it('should handle large exponents', () => {
            const base = new Dimension(2);
            const exponent = new Dimension(10);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1024);
        });

        it('should convert numbers to dimensions', () => {
            const result = numberFunctions.pow(2, 3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(8);
        });

        it('should handle mixed number and dimension arguments', () => {
            // pow function doesn't accept mixed types - it throws an error
            const base = new Dimension(2);
            expect(() => numberFunctions.pow(base, 3)).toThrow('arguments must be numbers');
            
            const exponent = new Dimension(3);
            expect(() => numberFunctions.pow(2, exponent)).toThrow('arguments must be numbers');
        });

        it('should throw error for non-numeric arguments', () => {
            expect(() => numberFunctions.pow('not-a-number', 2)).toThrow('arguments must be numbers');
            expect(() => numberFunctions.pow(2, 'not-a-number')).toThrow('arguments must be numbers');
            expect(() => numberFunctions.pow({}, [])).toThrow('arguments must be numbers');
        });

        it('should handle edge case of 0^0', () => {
            const base = new Dimension(0);
            const exponent = new Dimension(0);
            const result = numberFunctions.pow(base, exponent);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(1); // JavaScript Math.pow(0, 0) returns 1
        });

        it('should throw error for negative base with fractional exponent', () => {
            const base = new Dimension(-8);
            const exponent = new Dimension(1/3);
            
            // Results in NaN which causes Dimension constructor to throw
            expect(() => numberFunctions.pow(base, exponent)).toThrow('Dimension is not a number');
        });
    });

    describe('percentage function', () => {
        it('should convert number to percentage', () => {
            const dim = new Dimension(0.5);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(50);
            expect(result.unit.toString()).toBe('%');
        });

        it('should handle whole numbers', () => {
            const dim = new Dimension(1);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(100);
            expect(result.unit.toString()).toBe('%');
        });

        it('should handle zero', () => {
            const dim = new Dimension(0);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(0);
            expect(result.unit.toString()).toBe('%');
        });

        it('should handle negative numbers', () => {
            const dim = new Dimension(-0.25);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-25);
            expect(result.unit.toString()).toBe('%');
        });

        it('should handle small decimals', () => {
            const dim = new Dimension(0.123);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(12.3);
            expect(result.unit.toString()).toBe('%');
        });

        it('should handle large numbers', () => {
            const dim = new Dimension(5);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(500);
            expect(result.unit.toString()).toBe('%');
        });

        it('should override existing unit', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(0.75, unit);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(75);
            expect(result.unit.toString()).toBe('%');
        });

        it('should handle very small numbers', () => {
            const dim = new Dimension(0.0001);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBeCloseTo(0.01, 10);
            expect(result.unit.toString()).toBe('%');
        });

        it('should handle precise decimal conversions', () => {
            const dim = new Dimension(1/3);
            const result = numberFunctions.percentage(dim);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBeCloseTo(33.333333333333336, 10);
            expect(result.unit.toString()).toBe('%');
        });

        it('should throw error for non-Dimension argument', () => {
            expect(() => numberFunctions.percentage('not-a-dimension')).toThrow();
            expect(() => numberFunctions.percentage(42)).toThrow();
            expect(() => numberFunctions.percentage(null)).toThrow();
        });
    });

    describe('minMax helper function edge cases', () => {
        it('should handle complex unit unification scenarios', () => {
            const pxUnit = new Unit(['px'], [], 'px');
            const dim1 = new Dimension(10, pxUnit);
            const dim2 = new Dimension(20);
            const dim3 = new Dimension(15, pxUnit);
            
            // Mock unify methods
            dim1.unify = () => dim1;
            dim2.unify = () => new Dimension(20, pxUnit);
            dim3.unify = () => dim3;
            
            const result = numberFunctions.min(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(10);
        });

        it('should handle empty unit strings correctly', () => {
            const emptyUnit = new Unit([], [], '');
            const dim1 = new Dimension(10, emptyUnit);
            const dim2 = new Dimension(5);
            
            // Mock unify and unit toString
            dim1.unify = () => dim1;
            dim2.unify = () => dim2;
            dim1.unit.toString = () => '';
            
            const result = numberFunctions.min(dim1, dim2);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
        });

        it('should maintain order for equal values', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(5);
            const dim3 = new Dimension(5);
            
            // Give them distinct properties to track
            dim1._id = 1;
            dim2._id = 2;
            dim3._id = 3;
            
            const result = numberFunctions.min(dim1, dim2, dim3);
            
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5);
            expect(result._id).toBe(1); // Should return first one
        });
    });
});