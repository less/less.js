import { describe, it, expect } from 'vitest';
import mathFunctions from './math.js';
import Dimension from '../tree/dimension.js';
import Unit from '../tree/unit.js';

describe('Math Functions', () => {
    describe('ceil function', () => {
        it('should round up to nearest integer', () => {
            const dim = new Dimension(3.2);
            const result = mathFunctions.ceil(dim);
            
            expect(result.value).toBe(4);
            expect(result.unit).toBe(dim.unit);
        });

        it('should work with negative numbers', () => {
            const dim = new Dimension(-3.8);
            const result = mathFunctions.ceil(dim);
            
            expect(result.value).toBe(-3);
        });

        it('should preserve units', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(3.2, unit);
            const result = mathFunctions.ceil(dim);
            
            expect(result.value).toBe(4);
            expect(result.unit).toBe(unit);
        });

        it('should handle integers (no change)', () => {
            const dim = new Dimension(5);
            const result = mathFunctions.ceil(dim);
            
            expect(result.value).toBe(5);
        });

        it('should handle zero', () => {
            const dim = new Dimension(0);
            const result = mathFunctions.ceil(dim);
            
            expect(result.value).toBe(0);
        });

        it('should handle very small positive numbers', () => {
            const dim = new Dimension(0.001);
            const result = mathFunctions.ceil(dim);
            
            expect(result.value).toBe(1);
        });

        it('should handle very small negative numbers', () => {
            const dim = new Dimension(-0.001);
            const result = mathFunctions.ceil(dim);
            
            expect(result.value).toBe(0);
        });
    });

    describe('floor function', () => {
        it('should round down to nearest integer', () => {
            const dim = new Dimension(3.8);
            const result = mathFunctions.floor(dim);
            
            expect(result.value).toBe(3);
            expect(result.unit).toBe(dim.unit);
        });

        it('should work with negative numbers', () => {
            const dim = new Dimension(-3.2);
            const result = mathFunctions.floor(dim);
            
            expect(result.value).toBe(-4);
        });

        it('should preserve units', () => {
            const unit = new Unit(['em'], [], 'em');
            const dim = new Dimension(3.8, unit);
            const result = mathFunctions.floor(dim);
            
            expect(result.value).toBe(3);
            expect(result.unit).toBe(unit);
        });

        it('should handle integers (no change)', () => {
            const dim = new Dimension(5);
            const result = mathFunctions.floor(dim);
            
            expect(result.value).toBe(5);
        });

        it('should handle zero', () => {
            const dim = new Dimension(0);
            const result = mathFunctions.floor(dim);
            
            expect(result.value).toBe(0);
        });

        it('should handle very small positive numbers', () => {
            const dim = new Dimension(0.999);
            const result = mathFunctions.floor(dim);
            
            expect(result.value).toBe(0);
        });

        it('should handle very small negative numbers', () => {
            const dim = new Dimension(-0.001);
            const result = mathFunctions.floor(dim);
            
            expect(result.value).toBe(-1);
        });
    });

    describe('sqrt function', () => {
        it('should calculate square root', () => {
            const dim = new Dimension(16);
            const result = mathFunctions.sqrt(dim);
            
            expect(result.value).toBe(4);
            expect(result.unit).toBe(dim.unit);
        });

        it('should handle perfect squares', () => {
            const testCases = [
                { input: 1, expected: 1 },
                { input: 4, expected: 2 },
                { input: 9, expected: 3 },
                { input: 25, expected: 5 },
                { input: 100, expected: 10 }
            ];

            testCases.forEach(({ input, expected }) => {
                const dim = new Dimension(input);
                const result = mathFunctions.sqrt(dim);
                expect(result.value).toBe(expected);
            });
        });

        it('should handle non-perfect squares', () => {
            const dim = new Dimension(2);
            const result = mathFunctions.sqrt(dim);
            
            expect(result.value).toBeCloseTo(Math.sqrt(2), 10);
        });

        it('should preserve units', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(16, unit);
            const result = mathFunctions.sqrt(dim);
            
            expect(result.value).toBe(4);
            expect(result.unit).toBe(unit);
        });

        it('should handle zero', () => {
            const dim = new Dimension(0);
            const result = mathFunctions.sqrt(dim);
            
            expect(result.value).toBe(0);
        });

        it('should handle very large numbers', () => {
            const dim = new Dimension(1000000);
            const result = mathFunctions.sqrt(dim);
            
            expect(result.value).toBe(1000);
        });

        it('should handle decimals', () => {
            const dim = new Dimension(6.25);
            const result = mathFunctions.sqrt(dim);
            
            expect(result.value).toBe(2.5);
        });

        it('should return NaN for negative numbers', () => {
            const dim = new Dimension(-4);
            
            // This should throw because MathHelper will try to create a Dimension with NaN
            expect(() => mathFunctions.sqrt(dim)).toThrow('Dimension is not a number');
        });
    });

    describe('abs function', () => {
        it('should return absolute value of positive numbers', () => {
            const dim = new Dimension(5);
            const result = mathFunctions.abs(dim);
            
            expect(result.value).toBe(5);
            expect(result.unit).toBe(dim.unit);
        });

        it('should return absolute value of negative numbers', () => {
            const dim = new Dimension(-5);
            const result = mathFunctions.abs(dim);
            
            expect(result.value).toBe(5);
        });

        it('should handle zero', () => {
            const dim = new Dimension(0);
            const result = mathFunctions.abs(dim);
            
            expect(result.value).toBe(0);
        });

        it('should preserve units', () => {
            const unit = new Unit(['rem'], [], 'rem');
            const dim = new Dimension(-3.5, unit);
            const result = mathFunctions.abs(dim);
            
            expect(result.value).toBe(3.5);
            expect(result.unit).toBe(unit);
        });

        it('should handle decimal numbers', () => {
            const dim = new Dimension(-3.14159);
            const result = mathFunctions.abs(dim);
            
            expect(result.value).toBe(3.14159);
        });

        it('should handle very large negative numbers', () => {
            const dim = new Dimension(-1000000);
            const result = mathFunctions.abs(dim);
            
            expect(result.value).toBe(1000000);
        });

        it('should handle very small negative numbers', () => {
            const dim = new Dimension(-0.000001);
            const result = mathFunctions.abs(dim);
            
            expect(result.value).toBe(0.000001);
        });
    });

    describe('trigonometric functions with empty string unit', () => {
        describe('tan function', () => {
            it('should calculate tangent and use empty unit', () => {
                const dim = new Dimension(Math.PI / 4); // 45 degrees in radians
                const result = mathFunctions.tan(dim);
                
                expect(result.value).toBeCloseTo(1, 10);
                expect(result.unit.toString()).toBe('');
            });

            it('should handle zero', () => {
                const dim = new Dimension(0);
                const result = mathFunctions.tan(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
                expect(result.unit.toString()).toBe('');
            });

            it('should handle PI', () => {
                const dim = new Dimension(Math.PI);
                const result = mathFunctions.tan(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
            });

            it('should handle negative values', () => {
                const dim = new Dimension(-Math.PI / 4);
                const result = mathFunctions.tan(dim);
                
                expect(result.value).toBeCloseTo(-1, 10);
            });
        });

        describe('sin function', () => {
            it('should calculate sine and use empty unit', () => {
                const dim = new Dimension(Math.PI / 2); // 90 degrees in radians
                const result = mathFunctions.sin(dim);
                
                expect(result.value).toBeCloseTo(1, 10);
                expect(result.unit.toString()).toBe('');
            });

            it('should handle zero', () => {
                const dim = new Dimension(0);
                const result = mathFunctions.sin(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
                expect(result.unit.toString()).toBe('');
            });

            it('should handle PI', () => {
                const dim = new Dimension(Math.PI);
                const result = mathFunctions.sin(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
            });

            it('should handle negative values', () => {
                const dim = new Dimension(-Math.PI / 2);
                const result = mathFunctions.sin(dim);
                
                expect(result.value).toBeCloseTo(-1, 10);
            });

            it('should handle 30 degrees (PI/6)', () => {
                const dim = new Dimension(Math.PI / 6);
                const result = mathFunctions.sin(dim);
                
                expect(result.value).toBeCloseTo(0.5, 10);
            });
        });

        describe('cos function', () => {
            it('should calculate cosine and use empty unit', () => {
                const dim = new Dimension(0);
                const result = mathFunctions.cos(dim);
                
                expect(result.value).toBeCloseTo(1, 10);
                expect(result.unit.toString()).toBe('');
            });

            it('should handle PI/2', () => {
                const dim = new Dimension(Math.PI / 2);
                const result = mathFunctions.cos(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
            });

            it('should handle PI', () => {
                const dim = new Dimension(Math.PI);
                const result = mathFunctions.cos(dim);
                
                expect(result.value).toBeCloseTo(-1, 10);
            });

            it('should handle negative values', () => {
                const dim = new Dimension(-Math.PI);
                const result = mathFunctions.cos(dim);
                
                expect(result.value).toBeCloseTo(-1, 10);
            });

            it('should handle 60 degrees (PI/3)', () => {
                const dim = new Dimension(Math.PI / 3);
                const result = mathFunctions.cos(dim);
                
                expect(result.value).toBeCloseTo(0.5, 10);
            });
        });
    });

    describe('inverse trigonometric functions with rad unit', () => {
        describe('atan function', () => {
            it('should calculate arctangent and return radians unit', () => {
                const dim = new Dimension(1);
                const result = mathFunctions.atan(dim);
                
                expect(result.value).toBeCloseTo(Math.PI / 4, 10);
                expect(result.unit.toString()).toBe('rad');
            });

            it('should handle zero', () => {
                const dim = new Dimension(0);
                const result = mathFunctions.atan(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
                expect(result.unit.toString()).toBe('rad');
            });

            it('should handle negative values', () => {
                const dim = new Dimension(-1);
                const result = mathFunctions.atan(dim);
                
                expect(result.value).toBeCloseTo(-Math.PI / 4, 10);
            });

            it('should handle very large values', () => {
                const dim = new Dimension(1000);
                const result = mathFunctions.atan(dim);
                
                expect(result.value).toBeCloseTo(Math.PI / 2, 2);
            });

            it('should handle very small values', () => {
                const dim = new Dimension(0.001);
                const result = mathFunctions.atan(dim);
                
                expect(result.value).toBeCloseTo(0.001, 3);
            });
        });

        describe('asin function', () => {
            it('should calculate arcsine and return radians unit', () => {
                const dim = new Dimension(1);
                const result = mathFunctions.asin(dim);
                
                expect(result.value).toBeCloseTo(Math.PI / 2, 10);
                expect(result.unit.toString()).toBe('rad');
            });

            it('should handle zero', () => {
                const dim = new Dimension(0);
                const result = mathFunctions.asin(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
                expect(result.unit.toString()).toBe('rad');
            });

            it('should handle 0.5', () => {
                const dim = new Dimension(0.5);
                const result = mathFunctions.asin(dim);
                
                expect(result.value).toBeCloseTo(Math.PI / 6, 10);
            });

            it('should handle negative values', () => {
                const dim = new Dimension(-1);
                const result = mathFunctions.asin(dim);
                
                expect(result.value).toBeCloseTo(-Math.PI / 2, 10);
            });

            it('should handle edge case -0.5', () => {
                const dim = new Dimension(-0.5);
                const result = mathFunctions.asin(dim);
                
                expect(result.value).toBeCloseTo(-Math.PI / 6, 10);
            });

            it('should return NaN for values outside [-1, 1]', () => {
                const dim1 = new Dimension(1.1);
                const dim2 = new Dimension(-1.1);
                
                // These should throw because MathHelper will try to create Dimensions with NaN
                expect(() => mathFunctions.asin(dim1)).toThrow('Dimension is not a number');
                expect(() => mathFunctions.asin(dim2)).toThrow('Dimension is not a number');
            });
        });

        describe('acos function', () => {
            it('should calculate arccosine and return radians unit', () => {
                const dim = new Dimension(1);
                const result = mathFunctions.acos(dim);
                
                expect(result.value).toBeCloseTo(0, 10);
                expect(result.unit.toString()).toBe('rad');
            });

            it('should handle zero', () => {
                const dim = new Dimension(0);
                const result = mathFunctions.acos(dim);
                
                expect(result.value).toBeCloseTo(Math.PI / 2, 10);
                expect(result.unit.toString()).toBe('rad');
            });

            it('should handle -1', () => {
                const dim = new Dimension(-1);
                const result = mathFunctions.acos(dim);
                
                expect(result.value).toBeCloseTo(Math.PI, 10);
            });

            it('should handle 0.5', () => {
                const dim = new Dimension(0.5);
                const result = mathFunctions.acos(dim);
                
                expect(result.value).toBeCloseTo(Math.PI / 3, 10);
            });

            it('should handle -0.5', () => {
                const dim = new Dimension(-0.5);
                const result = mathFunctions.acos(dim);
                
                expect(result.value).toBeCloseTo(2 * Math.PI / 3, 10);
            });

            it('should return NaN for values outside [-1, 1]', () => {
                const dim1 = new Dimension(1.1);
                const dim2 = new Dimension(-1.1);
                
                // These should throw because MathHelper will try to create Dimensions with NaN
                expect(() => mathFunctions.acos(dim1)).toThrow('Dimension is not a number');
                expect(() => mathFunctions.acos(dim2)).toThrow('Dimension is not a number');
            });
        });
    });

    describe('round function', () => {
        it('should round to nearest integer when no fraction specified', () => {
            const dim = new Dimension(3.7);
            const result = mathFunctions.round(dim);
            
            expect(result.value).toBe(4);
            expect(result.unit).toBe(dim.unit);
        });

        it('should round to nearest integer when fraction is undefined', () => {
            const dim = new Dimension(3.2);
            const result = mathFunctions.round(dim, undefined);
            
            expect(result.value).toBe(3);
        });

        it('should round to specified decimal places', () => {
            const dim = new Dimension(3.14159);
            const fraction = new Dimension(2);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(3.14);
        });

        it('should handle zero decimal places', () => {
            const dim = new Dimension(3.7);
            const fraction = new Dimension(0);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(4);
        });

        it('should handle multiple decimal places', () => {
            const dim = new Dimension(3.14159265);
            const fraction = new Dimension(5);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(3.14159);
        });

        it('should preserve units', () => {
            const unit = new Unit(['%'], [], '%');
            const dim = new Dimension(3.14159, unit);
            const fraction = new Dimension(2);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(3.14);
            expect(result.unit).toBe(dim.unit); // Uses original dimension's unit
        });

        it('should handle negative numbers', () => {
            const dim = new Dimension(-3.14159);
            const fraction = new Dimension(2);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(-3.14);
        });

        it('should handle rounding up from 5', () => {
            const dim = new Dimension(3.145);
            const fraction = new Dimension(2);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(3.15); // JavaScript rounds 0.5 up
        });

        it('should handle zero', () => {
            const dim = new Dimension(0);
            const fraction = new Dimension(2);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(0);
        });

        it('should handle very large decimal places', () => {
            const dim = new Dimension(3.14159);
            const fraction = new Dimension(10);
            const result = mathFunctions.round(dim, fraction);
            
            expect(result.value).toBe(3.14159);
        });

        it('should handle edge case with exact half values', () => {
            const testCases = [
                { input: 2.5, decimals: 0, expected: 3 },
                { input: 3.5, decimals: 0, expected: 4 },
                { input: -2.5, decimals: 0, expected: -3 }, // JavaScript's toFixed rounds away from zero
                { input: -3.5, decimals: 0, expected: -4 }  // JavaScript's toFixed rounds away from zero
            ];

            testCases.forEach(({ input, decimals, expected }) => {
                const dim = new Dimension(input);
                const fraction = new Dimension(decimals);
                const result = mathFunctions.round(dim, fraction);
                expect(result.value).toBe(expected);
            });
        });
    });

    describe('function binding and mathHelper integration', () => {
        it('should properly bind Math functions with mathHelper', () => {
            // Test that all functions are properly bound
            const dim = new Dimension(16);
            
            expect(typeof mathFunctions.ceil).toBe('function');
            expect(typeof mathFunctions.floor).toBe('function');
            expect(typeof mathFunctions.sqrt).toBe('function');
            expect(typeof mathFunctions.abs).toBe('function');
            expect(typeof mathFunctions.tan).toBe('function');
            expect(typeof mathFunctions.sin).toBe('function');
            expect(typeof mathFunctions.cos).toBe('function');
            expect(typeof mathFunctions.atan).toBe('function');
            expect(typeof mathFunctions.asin).toBe('function');
            expect(typeof mathFunctions.acos).toBe('function');
            expect(typeof mathFunctions.round).toBe('function');
        });

        it('should use mathHelper for error handling', () => {
            // Test that non-Dimension arguments are handled properly
            expect(() => mathFunctions.ceil('not-a-dimension')).toThrow();
            expect(() => mathFunctions.floor(42)).toThrow();
            expect(() => mathFunctions.sqrt(null)).toThrow();
        });

        it('should preserve original dimension units for null unit functions', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(3.7, unit);
            
            const ceilResult = mathFunctions.ceil(dim);
            const floorResult = mathFunctions.floor(dim);
            const sqrtResult = mathFunctions.sqrt(new Dimension(16, unit));
            const absResult = mathFunctions.abs(new Dimension(-5, unit));
            
            expect(ceilResult.unit).toBe(unit);
            expect(floorResult.unit).toBe(unit);
            expect(sqrtResult.unit).toBe(unit);
            expect(absResult.unit).toBe(unit);
        });

        it('should use empty string units for trig functions', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(1, unit);
            
            const tanResult = mathFunctions.tan(dim);
            const sinResult = mathFunctions.sin(dim);
            const cosResult = mathFunctions.cos(dim);
            
            expect(tanResult.unit.toString()).toBe('');
            expect(sinResult.unit.toString()).toBe('');
            expect(cosResult.unit.toString()).toBe('');
        });

        it('should use rad units for inverse trig functions', () => {
            const unit = new Unit(['px'], [], 'px');
            const dim = new Dimension(0.5, unit);
            
            const atanResult = mathFunctions.atan(dim);
            const asinResult = mathFunctions.asin(dim);
            const acosResult = mathFunctions.acos(dim);
            
            expect(atanResult.unit.toString()).toBe('rad');
            expect(asinResult.unit.toString()).toBe('rad');
            expect(acosResult.unit.toString()).toBe('rad');
        });
    });

    describe('complex mathematical scenarios', () => {
        it('should handle chained operations', () => {
            const dim = new Dimension(16);
            
            // sqrt(16) = 4, then ceil(4) = 4
            const sqrtResult = mathFunctions.sqrt(dim);
            const ceilResult = mathFunctions.ceil(sqrtResult);
            
            expect(sqrtResult.value).toBe(4);
            expect(ceilResult.value).toBe(4);
        });

        it('should handle operations on results of round', () => {
            const dim = new Dimension(3.14159);
            const fraction = new Dimension(2);
            
            // Round to 2 decimal places: 3.14, then take absolute value: 3.14
            const roundResult = mathFunctions.round(dim, fraction);
            const absResult = mathFunctions.abs(roundResult);
            
            expect(roundResult.value).toBe(3.14);
            expect(absResult.value).toBe(3.14);
        });

        it('should handle edge cases with very small numbers', () => {
            const verySmall = new Dimension(0.0000001);
            
            const ceilResult = mathFunctions.ceil(verySmall);
            const floorResult = mathFunctions.floor(verySmall);
            const absResult = mathFunctions.abs(verySmall);
            
            expect(ceilResult.value).toBe(1);
            expect(floorResult.value).toBe(0);
            expect(absResult.value).toBe(0.0000001);
        });

        it('should handle edge cases with very large numbers', () => {
            const veryLarge = new Dimension(999999999);
            
            const ceilResult = mathFunctions.ceil(veryLarge);
            const floorResult = mathFunctions.floor(veryLarge);
            const absResult = mathFunctions.abs(veryLarge);
            
            expect(ceilResult.value).toBe(999999999);
            expect(floorResult.value).toBe(999999999);
            expect(absResult.value).toBe(999999999);
        });
    });
});