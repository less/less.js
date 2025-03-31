import Dimension from './dimension';
import Unit from './unit';
import { expect } from 'vitest';

describe('Dimension', () => {
    describe('constructor', () => {
        it('should create a dimension with a numeric value and unit', () => {
            const dim = new Dimension(5, 'px');
            expect(dim.value).toBe(5);
            expect(dim.unit.toString()).toBe('px');
        });

        it('should create a dimension with a numeric value and no unit', () => {
            const dim = new Dimension(5);
            expect(dim.value).toBe(5);
            expect(dim.unit.isEmpty()).toBe(true);
        });

        it('should create a dimension with a numeric value and Unit instance', () => {
            const unit = new Unit(['px']);
            const dim = new Dimension(5, unit);
            expect(dim.value).toBe(5);
            expect(dim.unit).toBe(unit);
        });

        it('should throw error for non-numeric value', () => {
            expect(() => new Dimension('not a number')).toThrow(
                'Dimension is not a number.'
            );
        });

        it('should handle empty string unit', () => {
            const dim = new Dimension(5, '');
            expect(dim.value).toBe(5);
            expect(dim.unit.isEmpty()).toBe(true);
        });

        it('should handle unit with spaces', () => {
            const dim = new Dimension(5, 'px em');
            expect(dim.value).toBe(5);
            expect(dim.unit.toString()).toBe('px em');
        });

        it('should handle unit with numbers', () => {
            const dim = new Dimension(5, 'px2');
            expect(dim.value).toBe(5);
            expect(dim.unit.toString()).toBe('px2');
        });

        it('should handle unit with special characters', () => {
            const dim = new Dimension(5, 'px@#$%');
            expect(dim.value).toBe(5);
            expect(dim.unit.toString()).toBe('px@#$%');
        });

        it('should handle very long unit names', () => {
            const longUnit = 'a'.repeat(1000);
            const dim = new Dimension(5, longUnit);
            expect(dim.value).toBe(5);
            expect(dim.unit.toString()).toBe(longUnit);
        });
    });

    describe('toColor', () => {
        it('should convert dimension to grayscale color', () => {
            const dim = new Dimension(128);
            const color = dim.toColor();
            expect(color.rgb).toEqual([128, 128, 128]);
            expect(color.alpha).toBe(1);
        });
    });

    describe('genCSS', () => {
        it('should generate CSS with value and unit', () => {
            const dim = new Dimension(5, 'px');
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('5px');
        });

        it('should handle zero values without unit in compressed mode', () => {
            const dim = new Dimension(0, 'px');
            const output = [];
            dim.genCSS(
                { compress: true },
                { add: (chunk) => output.push(chunk) }
            );
            expect(output.join('')).toBe('0');
        });

        it('should handle small values correctly', () => {
            const dim = new Dimension(0.0000001);
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('0.0000001');
        });

        it('should remove leading zero in compressed mode', () => {
            const dim = new Dimension(0.5, 'px');
            const output = [];
            dim.genCSS(
                { compress: true },
                { add: (chunk) => output.push(chunk) }
            );
            expect(output.join('')).toBe('.5px');
        });

        it('should throw error for multiple units in strict mode', () => {
            const dim = new Dimension(5, new Unit(['px', 'em']));
            expect(() =>
                dim.genCSS({ strictUnits: true }, { add: () => {} })
            ).toThrow('Multiple units in dimension');
        });

        it('should output zero value with unit in non-compressed mode', () => {
            const dim = new Dimension(0, 'px');
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('0px');
        });

        it('should output zero value with non-length unit in compressed mode', () => {
            const dim = new Dimension(0, '%');
            const output = [];
            dim.genCSS(
                { compress: true },
                { add: (chunk) => output.push(chunk) }
            );
            expect(output.join('')).toBe('0%');
        });

        it('should handle negative values between -1 and 0 in compressed mode', () => {
            const dim = new Dimension(-0.5, 'px');
            const output = [];
            dim.genCSS(
                { compress: true },
                { add: (chunk) => output.push(chunk) }
            );
            expect(output.join('')).toBe('-0.5px');
        });

        it('should handle very small values near zero', () => {
            const dim = new Dimension(0.0000005);
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('0.0000005');
        });

        it('should output complex units correctly', () => {
            const dim = new Dimension(5, new Unit(['px', 's']));
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('5px');
        });

        it('should output multiple units when not in strict mode', () => {
            const dim = new Dimension(5, new Unit(['px', 'em']));
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('5px');
        });

        it('should handle very large numbers in CSS generation', () => {
            const dim = new Dimension(1e20, 'px');
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('100000000000000000000px');
        });

        it('should handle very small numbers in CSS generation', () => {
            const dim = new Dimension(1e-20, 'px');
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('0.00000000000000000001px');
        });

        it('should handle zero values in CSS generation', () => {
            const dim = new Dimension(0, 'px');
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('0px');
        });

        it('should handle negative zero values in CSS generation', () => {
            const dim = new Dimension(-0, 'px');
            const output = [];
            dim.genCSS({}, { add: (chunk) => output.push(chunk) });
            expect(output.join('')).toBe('0px');
        });
    });

    describe('operate', () => {
        it('should add dimensions with same unit', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 'px');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(8);
            expect(result.unit.toString()).toBe('px');
        });

        it('should add dimensions with different units', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 'em');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(8);
            expect(result.unit.toString()).toBe('px');
        });

        it('should multiply dimensions', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 'em');
            const result = dim1.operate({}, '*', dim2);
            expect(result.value).toBe(15);
            expect(result.unit.toString()).toBe('em*px');
        });

        it('should divide dimensions', () => {
            const dim1 = new Dimension(6, 'px');
            const dim2 = new Dimension(2, 'em');
            const result = dim1.operate({}, '/', dim2);
            expect(result.value).toBe(3);
            expect(result.unit.toString()).toBe('px/em');
        });

        it('should throw error for incompatible units in strict mode', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 'em');
            expect(() =>
                dim1.operate({ strictUnits: true }, '+', dim2)
            ).toThrow('Incompatible units');
        });

        it('should subtract dimensions with same unit', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 'px');
            const result = dim1.operate({}, '-', dim2);
            expect(result.value).toBe(2);
            expect(result.unit.toString()).toBe('px');
        });

        it('should add unitless dimension to dimension with unit', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(2);
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(7);
            expect(result.unit.toString()).toBe('px');
        });

        it('should add dimension with unit to unitless dimension', () => {
            const dim1 = new Dimension(5);
            const dim2 = new Dimension(2, 'px');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(7);
            expect(result.unit.toString()).toBe('px');
        });

        it('should cancel units in multiplication', () => {
            const dim1 = new Dimension(10, new Unit(['px', 's']));
            const dim2 = new Dimension(2, new Unit(['s']));
            const result = dim1.operate({}, '*', dim2);
            expect(result.value).toBe(20);
            expect(result.unit.toString()).toBe('px*s*s');
        });

        it('should handle incompatible units in non-strict mode', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 's');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(8);
            expect(result.unit.toString()).toBe('px');
        });

        it('should handle backup unit in addition', () => {
            const dim1 = new Dimension(5, 'px');
            dim1.unit.backupUnit = 'em';
            const dim2 = new Dimension(3, 'em');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(8);
            expect(result.unit.toString()).toBe('px');
        });

        it('should not throw error for division by zero dimension', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(0, 'em');
            const result = dim1.operate({}, '/', dim2);
            expect(result.value).toBe(Infinity);
            expect(result.unit.toString()).toBe('px/em');
        });

        it('should handle very large numbers in operations', () => {
            const dim1 = new Dimension(1e20, 'px');
            const dim2 = new Dimension(1e20, 'px');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(2e20);
        });

        it('should handle very small numbers in operations', () => {
            const dim1 = new Dimension(1e-20, 'px');
            const dim2 = new Dimension(1e-20, 'px');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(2e-20);
        });

        it('should handle division by zero', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(0, 'px');
            const result = dim1.operate({}, '/', dim2);
            expect(result.value).toBe(Infinity);
        });

        it('should handle multiplication with zero', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(0, 'px');
            const result = dim1.operate({}, '*', dim2);
            expect(result.value).toBe(0);
        });

        it('should handle negative numbers in operations', () => {
            const dim1 = new Dimension(-5, 'px');
            const dim2 = new Dimension(-3, 'px');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(-8);
        });

        it('should handle mixed positive and negative numbers', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(-3, 'px');
            const result = dim1.operate({}, '+', dim2);
            expect(result.value).toBe(2);
        });
    });

    describe('compare', () => {
        it('should compare dimensions with same unit', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 'px');
            expect(dim1.compare(dim2)).toBe(1);
            expect(dim2.compare(dim1)).toBe(-1);
        });

        it('should return undefined when comparing with non-dimension', () => {
            const dim = new Dimension(5, 'px');
            expect(dim.compare({})).toBeUndefined();
        });

        it('should compare dimensions with different units after unification', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(3, 'cm');
            expect(dim1.compare(dim2)).toBeDefined();
        });

        it('should compare dimensions with different convertible units correctly', () => {
            const dim1 = new Dimension(1, 'in');
            const dim2 = new Dimension(2.54, 'cm');
            expect(dim1.compare(dim2)).toBe(-1);
        });

        it('should return undefined when comparing dimensions with incompatible units', () => {
            const dim1 = new Dimension(1, 'px');
            const dim2 = new Dimension(1, 's');
            expect(dim1.compare(dim2)).toBeUndefined();
        });

        it('should handle null comparison', () => {
            const dim = new Dimension(5, 'px');
            expect(dim.compare(null)).toBeUndefined();
        });

        it('should handle undefined comparison', () => {
            const dim = new Dimension(5, 'px');
            expect(dim.compare(undefined)).toBeUndefined();
        });

        it('should handle non-Dimension object comparison', () => {
            const dim = new Dimension(5, 'px');
            expect(dim.compare({})).toBeUndefined();
        });

        it('should handle comparison with identical values but different units', () => {
            const dim1 = new Dimension(5, 'px');
            const dim2 = new Dimension(5, 'em');
            expect(dim1.compare(dim2)).toBeUndefined();
        });

        it('should handle comparison with very large numbers', () => {
            const dim1 = new Dimension(1e20, 'px');
            const dim2 = new Dimension(1e20, 'px');
            expect(dim1.compare(dim2)).toBe(0);
        });

        it('should handle comparison with very small numbers', () => {
            const dim1 = new Dimension(1e-20, 'px');
            const dim2 = new Dimension(1e-20, 'px');
            expect(dim1.compare(dim2)).toBe(0);
        });
    });

    describe('unify', () => {
        it('should convert to standard units', () => {
            const dim = new Dimension(5, 'px');
            const unified = dim.unify();
            expect(unified.unit.toString()).toBe('px');
        });

        it('should unify duration units', () => {
            const dim = new Dimension(1000, 'ms');
            const unified = dim.unify();
            expect(unified.unit.toString()).toBe('s');
        });

        it('should unify angle units', () => {
            const dim = new Dimension(180, 'deg');
            const unified = dim.unify();
            expect(unified.unit.toString()).toBe('rad');
        });
    });

    describe('convertTo', () => {
        it('should convert to specified unit', () => {
            const dim = new Dimension(5, 'px');
            const converted = dim.convertTo('cm');
            expect(converted.unit.toString()).toBe('cm');
        });

        it('should convert to specified units object', () => {
            const dim = new Dimension(5, 'px');
            const converted = dim.convertTo({ length: 'cm' });
            expect(converted.unit.toString()).toBe('cm');
        });

        it('should handle multiple unit conversions', () => {
            const dim = new Dimension(5, 'px');
            const converted = dim.convertTo({ length: 'cm', duration: 's' });
            expect(converted.unit.toString()).toBe('cm');
        });

        it('should convert from inches to millimeters', () => {
            const dim = new Dimension(1, 'in');
            const converted = dim.convertTo('mm');
            expect(converted.unit.toString()).toBe('mm');
        });

        it('should not convert when target unit is from a different group', () => {
            const dim = new Dimension(1, 'px');
            const converted = dim.convertTo({ angle: 'deg' });
            expect(converted.unit.toString()).toBe('px');
        });

        it('should handle very large values in conversion', () => {
            const dim = new Dimension(1e20, 'px');
            const converted = dim.convertTo('cm');
            expect(converted.unit.toString()).toBe('cm');
            expect(converted.value).toBeGreaterThan(0);
        });

        it('should handle very small values in conversion', () => {
            const dim = new Dimension(1e-20, 'px');
            const converted = dim.convertTo('cm');
            expect(converted.unit.toString()).toBe('cm');
            expect(converted.value).toBeGreaterThan(0);
        });

        it('should handle negative values in conversion', () => {
            const dim = new Dimension(-5, 'px');
            const converted = dim.convertTo('cm');
            expect(converted.unit.toString()).toBe('cm');
            expect(converted.value).toBeLessThan(0);
        });

        it('should handle zero values in conversion', () => {
            const dim = new Dimension(0, 'px');
            const converted = dim.convertTo('cm');
            expect(converted.unit.toString()).toBe('cm');
            expect(converted.value).toBe(0);
        });

        it('should convert between all length units', () => {
            const lengthUnits = ['m', 'cm', 'mm', 'in', 'px', 'pt', 'pc'];
            const testValue = 1;

            for (const fromUnit of lengthUnits) {
                const dim = new Dimension(testValue, fromUnit);
                for (const toUnit of lengthUnits) {
                    const converted = dim.convertTo(toUnit);
                    expect(converted.unit.toString()).toBe(toUnit);
                    expect(converted.value).toBeDefined();
                }
            }
        });

        it('should convert between all duration units', () => {
            const durationUnits = ['s', 'ms'];
            const testValue = 1;

            for (const fromUnit of durationUnits) {
                const dim = new Dimension(testValue, fromUnit);
                for (const toUnit of durationUnits) {
                    const converted = dim.convertTo(toUnit);
                    expect(converted.unit.toString()).toBe(toUnit);
                    expect(converted.value).toBeDefined();
                }
            }
        });

        it('should convert between all angle units', () => {
            const angleUnits = ['rad', 'deg', 'grad', 'turn'];
            const testValue = 1;

            for (const fromUnit of angleUnits) {
                const dim = new Dimension(testValue, fromUnit);
                for (const toUnit of angleUnits) {
                    const converted = dim.convertTo(toUnit);
                    expect(converted.unit.toString()).toBe(toUnit);
                    expect(converted.value).toBeDefined();
                }
            }
        });
    });
});
