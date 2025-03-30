import { describe, it, expect, vi } from 'vitest';
import Unit from './unit';

describe('Unit', () => {
    describe('constructor', () => {
        it('creates a unit with numerator only', () => {
            const unit = new Unit(['px']);
            expect(unit.numerator).toEqual(['px']);
            expect(unit.denominator).toEqual([]);
            expect(unit.backupUnit).toBe('px');
        });

        it('creates a unit with numerator and denominator', () => {
            const unit = new Unit(['px'], ['s']);
            expect(unit.numerator).toEqual(['px']);
            expect(unit.denominator).toEqual(['s']);
            expect(unit.backupUnit).toBe('px');
        });

        it('creates a unit with explicit backup unit', () => {
            const unit = new Unit(['px'], ['s'], 'em');
            expect(unit.numerator).toEqual(['px']);
            expect(unit.denominator).toEqual(['s']);
            expect(unit.backupUnit).toBe('em');
        });

        it('creates an empty unit', () => {
            const unit = new Unit();
            expect(unit.numerator).toEqual([]);
            expect(unit.denominator).toEqual([]);
            expect(unit.backupUnit).toBeUndefined();
        });

        it('handles null/undefined parameters', () => {
            const unit1 = new Unit(null, ['s']);
            expect(unit1.numerator).toEqual([]);
            expect(unit1.denominator).toEqual(['s']);
            expect(unit1.backupUnit).toBeUndefined();

            const unit2 = new Unit(['px'], undefined);
            expect(unit2.numerator).toEqual(['px']);
            expect(unit2.denominator).toEqual([]);
            expect(unit2.backupUnit).toBe('px');

            const unit3 = new Unit(null, null, 'em');
            expect(unit3.numerator).toEqual([]);
            expect(unit3.denominator).toEqual([]);
            expect(unit3.backupUnit).toBe('em');
        });

        it('handles empty arrays', () => {
            const unit = new Unit([], []);
            expect(unit.numerator).toEqual([]);
            expect(unit.denominator).toEqual([]);
            expect(unit.backupUnit).toBeUndefined();
        });
    });

    describe('clone', () => {
        it('creates a deep copy of the unit', () => {
            const original = new Unit(['px'], ['s']);
            const cloned = original.clone();

            expect(cloned).not.toBe(original);
            expect(cloned.numerator).toEqual(original.numerator);
            expect(cloned.denominator).toEqual(original.denominator);
            expect(cloned.backupUnit).toBe(original.backupUnit);
        });
    });

    describe('genCSS', () => {
        it('outputs single numerator unit', () => {
            const unit = new Unit(['px']);
            const output = { add: vi.fn() };
            unit.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('px');
        });

        it('outputs backup unit when no strict units and no single numerator', () => {
            const unit = new Unit(['px', 'em'], [], 'em');
            const output = { add: vi.fn() };
            unit.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('em');
        });

        it('outputs first numerator when no strict units and no single numerator', () => {
            const unit = new Unit(['px', 'em'], ['s']);
            const output = { add: vi.fn() };
            unit.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('px');
        });

        it('handles strict units mode', () => {
            const unit = new Unit(['px', 'em']);
            const output = { add: vi.fn() };
            unit.genCSS({ strictUnits: true }, output);
            expect(output.add).not.toHaveBeenCalled();
        });

        it('handles empty numerator and denominator', () => {
            const unit = new Unit([], []);
            const output = { add: vi.fn() };
            unit.genCSS({}, output);
            expect(output.add).not.toHaveBeenCalled();
        });

        it('handles multiple backup units', () => {
            const unit = new Unit(['px', 'em'], ['s'], 'em');
            const output = { add: vi.fn() };
            unit.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('em');
        });
    });

    describe('toString', () => {
        it('returns empty string for empty unit', () => {
            const unit = new Unit();
            expect(unit.toString()).toBe('');
        });

        it('returns single numerator unit', () => {
            const unit = new Unit(['px']);
            expect(unit.toString()).toBe('px');
        });

        it('returns unit with numerator and denominator', () => {
            const unit = new Unit(['px'], ['s']);
            expect(unit.toString()).toBe('px/s');
        });

        it('handles multiple numerators and denominators', () => {
            const unit = new Unit(['px', 'em'], ['s', 'ms']);
            expect(unit.toString()).toBe('em*px/ms/s');
        });

        it('handles empty numerator with denominator', () => {
            const unit = new Unit([], ['s']);
            expect(unit.toString()).toBe('/s');
        });

        it('handles large number of units', () => {
            const numerators = Array(10).fill('px');
            const denominators = Array(5).fill('s');
            const unit = new Unit(numerators, denominators);
            expect(unit.toString().split('*')).toHaveLength(10);
            expect(unit.toString().split('/')).toHaveLength(6); // 5 denominators + 1 numerator part
        });
    });

    describe('compare', () => {
        it('returns 0 for identical units', () => {
            const unit1 = new Unit(['px']);
            const unit2 = new Unit(['px']);
            expect(unit1.compare(unit2)).toBe(0);
        });

        it('returns undefined for different units', () => {
            const unit1 = new Unit(['px']);
            const unit2 = new Unit(['em']);
            expect(unit1.compare(unit2)).toBeUndefined();
        });
    });

    describe('is', () => {
        it('returns true for matching unit string', () => {
            const unit = new Unit(['px']);
            expect(unit.is('px')).toBe(true);
        });

        it('returns true for matching unit string case insensitive', () => {
            const unit = new Unit(['px']);
            expect(unit.is('PX')).toBe(true);
        });

        it('returns false for non-matching unit string', () => {
            const unit = new Unit(['px']);
            expect(unit.is('em')).toBe(false);
        });
    });

    describe('isLength', () => {
        it('returns true for valid length units', () => {
            const lengthUnits = [
                'px',
                'em',
                'ex',
                'ch',
                'rem',
                'in',
                'cm',
                'mm',
                'pc',
                'pt',
                'vw',
                'vh',
                'vmin',
                'vmax'
            ];
            lengthUnits.forEach((unitStr) => {
                const unit = new Unit([unitStr]);
                expect(unit.isLength()).toBe(true);
            });
        });

        it('returns false for non-length units', () => {
            const nonLengthUnits = ['s', 'ms', 'deg', 'rad', 'grad', 'turn'];
            nonLengthUnits.forEach((unitStr) => {
                const unit = new Unit([unitStr]);
                expect(unit.isLength()).toBe(false);
            });
        });

        it('handles combined units', () => {
            const unit = new Unit(['px'], ['s']);
            expect(unit.isLength()).toBe(true);
        });

        it('handles invalid unit combinations', () => {
            const unit = new Unit(['invalid-unit']);
            expect(unit.isLength()).toBe(false);
        });

        it('handles case sensitivity', () => {
            const unit = new Unit(['PX']);
            expect(unit.isLength()).toBe(true);
        });

        it('handles multiple length units in numerator', () => {
            const unit = new Unit(['px', 'em']);
            expect(unit.isLength()).toBe(true);
        });
    });

    describe('isEmpty', () => {
        it('returns true for empty unit', () => {
            const unit = new Unit();
            expect(unit.isEmpty()).toBe(true);
        });

        it('returns false for unit with numerator', () => {
            const unit = new Unit(['px']);
            expect(unit.isEmpty()).toBe(false);
        });

        it('returns false for unit with denominator', () => {
            const unit = new Unit([], ['s']);
            expect(unit.isEmpty()).toBe(false);
        });
    });

    describe('isSingular', () => {
        it('returns true for single numerator unit', () => {
            const unit = new Unit(['px']);
            expect(unit.isSingular()).toBe(true);
        });

        it('returns false for multiple numerators', () => {
            const unit = new Unit(['px', 'em']);
            expect(unit.isSingular()).toBe(false);
        });

        it('returns false for unit with denominator', () => {
            const unit = new Unit(['px'], ['s']);
            expect(unit.isSingular()).toBe(false);
        });
    });

    describe('map', () => {
        it('applies callback to numerator and denominator', () => {
            const unit = new Unit(['px'], ['s']);
            const callback = vi.fn((unit) => unit.toUpperCase());
            unit.map(callback);

            expect(callback).toHaveBeenCalledWith('px', false);
            expect(callback).toHaveBeenCalledWith('s', true);
            expect(unit.numerator).toEqual(['PX']);
            expect(unit.denominator).toEqual(['S']);
        });
    });

    describe('usedUnits', () => {
        it('returns object with used units from unitConversions', () => {
            const unit = new Unit(['px', 'cm'], ['s']);
            const result = unit.usedUnits();

            expect(result).toHaveProperty('length');
            expect(result.length).toBe('cm');
        });

        it('handles multiple unit conversion groups', () => {
            const unit = new Unit(['px', 's', 'deg'], ['ms']);
            const result = unit.usedUnits();

            expect(result).toHaveProperty('length');
            expect(result).toHaveProperty('duration');
            expect(result).toHaveProperty('angle');
        });

        it('returns empty object when no units match conversion groups', () => {
            const unit = new Unit(['invalid-unit'], ['another-invalid']);
            const result = unit.usedUnits();
            expect(result).toEqual({});
        });
    });

    describe('toString edge cases', () => {
        it('handles very long unit names', () => {
            const longUnit = 'a'.repeat(1000);
            const unit = new Unit([longUnit]);
            expect(unit.toString()).toBe(longUnit);
        });

        it('handles special characters in unit names', () => {
            const unit = new Unit(['unit-with-special-chars!@#$%^&*()']);
            expect(unit.toString()).toBe('unit-with-special-chars!@#$%^&*()');
        });

        it('handles empty strings in arrays', () => {
            const unit = new Unit(['', 'px'], ['']);
            expect(unit.toString()).toBe('*px/');
        });
    });

    describe('genCSS edge cases', () => {
        it('handles null context', () => {
            const unit = new Unit(['px']);
            const output = { add: vi.fn() };
            unit.genCSS(null, output);
            expect(output.add).toHaveBeenCalledWith('px');
        });

        it('handles undefined context', () => {
            const unit = new Unit(['px']);
            const output = { add: vi.fn() };
            unit.genCSS(undefined, output);
            expect(output.add).toHaveBeenCalledWith('px');
        });

        it('handles empty backupUnit', () => {
            const unit = new Unit(['px', 'em'], [], '');
            const output = { add: vi.fn() };
            unit.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('px');
        });
    });

    describe('map edge cases', () => {
        it('handles callback returning different types', () => {
            const unit = new Unit(['px', 'em']);
            const callback = (unit) => (unit === 'px' ? 123 : unit);
            unit.map(callback);
            expect(unit.numerator).toEqual(['em', 123]);
        });

        it('handles callback throwing errors', () => {
            const unit = new Unit(['px']);
            const callback = () => {
                throw new Error('Test error');
            };
            expect(() => unit.map(callback)).toThrow('Test error');
        });

        it('handles callback modifying unit name', () => {
            const unit = new Unit(['px']);
            const callback = (unit) => unit + '-modified';
            unit.map(callback);
            expect(unit.numerator).toEqual(['px-modified']);
        });
    });

    describe('cancel', () => {
        it('cancels matching units between numerator and denominator', () => {
            const unit = new Unit(['px', 'em'], ['px', 's']);
            unit.cancel();

            expect(unit.numerator).toEqual(['em']);
            expect(unit.denominator).toEqual(['s']);
        });

        it('handles multiple occurrences of same unit', () => {
            const unit = new Unit(['px', 'px'], ['px']);
            unit.cancel();

            expect(unit.numerator).toEqual(['px']);
            expect(unit.denominator).toEqual([]);
        });

        it('handles empty unit', () => {
            const unit = new Unit();
            unit.cancel();

            expect(unit.numerator).toEqual([]);
            expect(unit.denominator).toEqual([]);
        });
    });

    describe('cancel edge cases', () => {
        it('handles multiple occurrences in both numerator and denominator', () => {
            const unit = new Unit(['px', 'px', 'em'], ['px', 'px', 's']);
            unit.cancel();
            expect(unit.numerator).toEqual(['em']);
            expect(unit.denominator).toEqual(['s']);
        });

        it('handles case-sensitive unit names', () => {
            const unit = new Unit(['px', 'PX'], ['Px']);
            unit.cancel();
            expect(unit.numerator).toEqual(['PX', 'px']);
            expect(unit.denominator).toEqual(['Px']);
        });

        it('handles empty arrays after cancellation', () => {
            const unit = new Unit(['px'], ['px']);
            unit.cancel();
            expect(unit.numerator).toEqual([]);
            expect(unit.denominator).toEqual([]);
        });
    });
});
