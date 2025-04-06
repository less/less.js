import { describe, it, expect, vi } from 'vitest';
import Negative from './negative';
import Dimension from './dimension';
import Keyword from './keyword';
import Operation from './operation';

describe('Negative', () => {
    describe('genCSS', () => {
        it('should generate CSS with a minus sign before the value', () => {
            const dimension = new Dimension(5, 'px');
            const negative = new Negative(dimension);
            const output = {
                add: vi.fn()
            };

            negative.genCSS({}, output);

            expect(output.add).toHaveBeenCalledTimes(3);
            expect(output.add).toHaveBeenNthCalledWith(1, '-');
            expect(output.add).toHaveBeenNthCalledWith(2, '5');
            expect(output.add).toHaveBeenNthCalledWith(3, 'px');
        });

        it('should handle non-Dimension nodes', () => {
            const keyword = new Keyword('red');
            const negative = new Negative(keyword);
            const output = {
                add: vi.fn()
            };

            negative.genCSS({}, output);

            expect(output.add).toHaveBeenCalledTimes(2);
            expect(output.add).toHaveBeenNthCalledWith(1, '-');
            expect(output.add).toHaveBeenNthCalledWith(2, 'red');
        });

        it('should handle nested Negative nodes', () => {
            const dimension = new Dimension(5, 'px');
            const negative = new Negative(new Negative(dimension));
            const output = {
                add: vi.fn()
            };

            negative.genCSS({}, output);

            expect(output.add).toHaveBeenCalledTimes(4);
            expect(output.add).toHaveBeenNthCalledWith(1, '-');
            expect(output.add).toHaveBeenNthCalledWith(2, '-');
            expect(output.add).toHaveBeenNthCalledWith(3, '5');
            expect(output.add).toHaveBeenNthCalledWith(4, 'px');
        });

        it('should handle Operation nodes', () => {
            const operation = new Operation('+', [
                new Dimension(5, 'px'),
                new Dimension(10, 'px')
            ]);
            const negative = new Negative(operation);
            const output = {
                add: vi.fn()
            };
            const spy = vi.spyOn(operation, 'genCSS');

            negative.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith('-');
            expect(spy).toHaveBeenCalledWith({}, output);
        });

        it('should handle different unit types', () => {
            const units = ['em', 'rem', '%', 'vh', 'vw'];
            units.forEach((unit) => {
                const dimension = new Dimension(5, unit);
                const negative = new Negative(dimension);
                const output = {
                    add: vi.fn()
                };

                negative.genCSS({}, output);

                expect(output.add).toHaveBeenCalledWith('-');
                expect(output.add).toHaveBeenCalledWith('5');
                expect(output.add).toHaveBeenCalledWith(unit);
            });
        });
    });

    describe('eval', () => {
        it('should return a new Dimension with negative value when math is on', () => {
            const dimension = new Dimension(5, 'px');
            const negative = new Negative(dimension);
            const context = {
                isMathOn: () => true
            };

            const result = negative.eval(context);

            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-5);
            expect(result.unit.toString()).toBe('px');
        });

        it('should return a new Negative with evaluated value when math is off', () => {
            const dimension = new Dimension(5, 'px');
            const negative = new Negative(dimension);
            const context = {
                isMathOn: () => false
            };

            const result = negative.eval(context);

            expect(result).toBeInstanceOf(Negative);
            expect(result.value).toBe(dimension);
        });

        it('should handle nested Negative nodes correctly when math is off', () => {
            const dimension = new Dimension(5, 'px');
            const negative = new Negative(new Negative(dimension));
            const context = {
                isMathOn: () => false
            };

            const result = negative.eval(context);

            expect(result).toBeInstanceOf(Negative);
            expect(result.value).toBeInstanceOf(Negative);
            expect(result.value.value).toBe(dimension);
        });

        it('should handle nested Negative nodes when math is on', () => {
            const dimension = new Dimension(5, 'px');
            const negative = new Negative(new Negative(dimension));
            const context = {
                isMathOn: () => true
            };

            const result = negative.eval(context);

            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(5); // Double negative
            expect(result.unit.toString()).toBe('px');
        });

        it('should handle multiple levels of nesting when math is on', () => {
            const dimension = new Dimension(5, 'px');
            const negative = new Negative(
                new Negative(new Negative(dimension))
            );
            const context = {
                isMathOn: () => true
            };

            const result = negative.eval(context);

            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-5); // Triple negative
            expect(result.unit.toString()).toBe('px');
        });

        it('should handle non-Dimension nodes when math is off', () => {
            const keyword = new Keyword('red');
            const negative = new Negative(keyword);
            const context = {
                isMathOn: () => false
            };

            const result = negative.eval(context);

            expect(result).toBeInstanceOf(Negative);
            expect(result.value).toBe(keyword);
        });

        it('should handle edge case values', () => {
            const values = [-5, 1e10];
            values.forEach((value) => {
                const dimension = new Dimension(value, 'px');
                const negative = new Negative(dimension);
                const context = {
                    isMathOn: () => true
                };

                const result = negative.eval(context);

                expect(result).toBeInstanceOf(Dimension);
                expect(result.value).toBe(-value);
                expect(result.unit.toString()).toBe('px');
            });

            // Special case for zero
            const zeroDimension = new Dimension(0, 'px');
            const zeroNegative = new Negative(zeroDimension);
            const context = {
                isMathOn: () => true
            };

            const zeroResult = zeroNegative.eval(context);
            expect(zeroResult).toBeInstanceOf(Dimension);
            expect(zeroResult.value).toBe(0);
            expect(zeroResult.unit.toString()).toBe('px');
        });

        it('should handle complex nested operations', () => {
            const operation = new Operation('+', [
                new Dimension(5, 'px'),
                new Dimension(10, 'px')
            ]);
            const negative = new Negative(operation);
            const context = {
                isMathOn: () => true
            };

            const result = negative.eval(context);

            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(-15); // -(5 + 10)
            expect(result.unit.toString()).toBe('px');
        });

        it('should handle null input gracefully', () => {
            const negative = new Negative(null);
            const context = {
                isMathOn: () => false // Set math off to avoid Operation creation
            };

            expect(() => {
                negative.eval(context);
            }).toThrow("Cannot read properties of null (reading 'eval')");
        });
    });
});
