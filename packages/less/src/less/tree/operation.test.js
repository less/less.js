import { describe, it, expect, vi } from 'vitest';
import Operation from './operation';
import Color from './color';
import Dimension from './dimension';
import * as Constants from '../constants';

describe('Operation', () => {
    describe('constructor', () => {
        it('should create an operation with trimmed operator', () => {
            const op = new Operation(' + ', [1, 2], true);
            expect(op.op).toBe('+');
            expect(op.operands).toEqual([1, 2]);
            expect(op.isSpaced).toBe(true);
        });

        it('should create an operation without spacing', () => {
            const op = new Operation('+', [1, 2], false);
            expect(op.isSpaced).toBe(false);
        });
    });

    describe('eval', () => {
        it('should evaluate simple arithmetic operations', () => {
            const context = { isMathOn: () => true };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');

            const add = new Operation('+', [dim1, dim2], false);
            const result = add.eval(context);
            expect(result.value).toBe(15);
            expect(result.unit.toString()).toBe('px');

            const sub = new Operation('-', [dim1, dim2], false);
            expect(sub.eval(context).value).toBe(5);

            const mul = new Operation('*', [dim1, dim2], false);
            expect(mul.eval(context).value).toBe(50);

            const div = new Operation('/', [dim1, dim2], false);
            expect(div.eval(context).value).toBe(2);
            expect(div.eval(context).unit.toString()).toBe('');
        });

        it('should handle color operations', () => {
            const context = { isMathOn: () => true };
            const color1 = new Color([100, 100, 100]);
            const color2 = new Color([50, 50, 50]);

            const add = new Operation('+', [color1, color2], false);
            const result = add.eval(context);
            expect(result.rgb).toEqual([150, 150, 150]);

            const sub = new Operation('-', [color1, color2], false);
            expect(sub.eval(context).rgb).toEqual([50, 50, 50]);
        });

        it('should handle mixed color and dimension operations', () => {
            const context = { isMathOn: () => true };
            const color = new Color([100, 100, 100]);
            const dim = new Dimension(50, 'px');

            const add = new Operation('+', [color, dim], false);
            const result = add.eval(context);
            expect(result.rgb).toEqual([150, 150, 150]);

            const add2 = new Operation('+', [dim, color], false);
            expect(add2.eval(context).rgb).toEqual([150, 150, 150]);
        });

        it('should preserve operation when math is off', () => {
            const context = { isMathOn: () => false };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');

            const op = new Operation('+', [dim1, dim2], false);
            const result = op.eval(context);
            expect(result).toBeInstanceOf(Operation);
            expect(result.op).toBe('+');
            expect(result.operands).toEqual([dim1, dim2]);
        });

        it('should handle division with parens division context', () => {
            const context = {
                isMathOn: () => true,
                math: Constants.Math.PARENS_DIVISION
            };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');
            const div = new Operation('/', [dim1, dim2], false);

            const result = div.eval(context);
            expect(result.value).toBe(2);
            expect(result.unit.toString()).toBe('');
        });

        it('should throw error for invalid operation types', () => {
            const context = { isMathOn: () => true };
            const invalid = { eval: () => ({}) };
            const op = new Operation('+', [invalid, invalid], false);

            expect(() => op.eval(context)).toThrow(
                'Operation on an invalid type'
            );
        });

        it('should handle special ./ operator', () => {
            const context = { isMathOn: () => true };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');
            const op = new Operation('./', [dim1, dim2], false);
            expect(op.eval(context).value).toBe(2);
        });

        it('should handle operations with different units', () => {
            const context = { isMathOn: () => true };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'em');
            const op = new Operation('+', [dim1, dim2], false);
            const result = op.eval(context);
            expect(result.value).toBe(15);
        });

        it('should handle operations with negative values', () => {
            const context = { isMathOn: () => true };
            const dim1 = new Dimension(-10, 'px');
            const dim2 = new Dimension(5, 'px');
            const op = new Operation('+', [dim1, dim2], false);
            expect(op.eval(context).value).toBe(-5);
        });

        it('should handle color operations with alpha', () => {
            const context = { isMathOn: () => true };
            const color1 = new Color([100, 100, 100, 0.5]);
            const color2 = new Color([50, 50, 50, 0.5]);
            const op = new Operation('+', [color1, color2], false);
            const result = op.eval(context);
            expect(result.rgb).toEqual([150, 150, 150]);
            expect(result.alpha).toBe(1);
        });

        it('should handle division by zero', () => {
            const context = { isMathOn: () => true };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(0, 'px');

            const result = new Operation('/', [dim1, dim2], false).eval(
                context
            );
            expect(result.value).toBe(Infinity);
        });

        it('should handle operations with null operands', () => {
            const context = { isMathOn: () => true };
            const dim1 = new Dimension(10, 'px');

            expect(() => {
                new Operation('+', [dim1, null], false).eval(context);
            }).toThrow('Cannot read properties of null');
        });

        it('should handle unit conversion in operations', () => {
            const context = { isMathOn: () => true, strictUnits: true };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'em');

            // Should throw error for incompatible units in strict mode
            expect(() => {
                new Operation('+', [dim1, dim2], false).eval(context);
            }).toThrow('Incompatible units');

            // Should work with compatible units
            const dim3 = new Dimension(5, 'cm');
            const dim4 = new Dimension(2, 'mm');
            const result = new Operation('+', [dim3, dim4], false).eval(
                context
            );
            expect(result.value).toBe(5.2);
            expect(result.unit.toString()).toBe('cm');
        });

        it('should handle color operations with different formats', () => {
            const context = { isMathOn: () => true };
            const rgbColor = new Color([255, 0, 0]);
            const hslColor = new Color([0, 100, 50]);
            hslColor.value = 'hsl(0, 100%, 50%)';

            const result = new Operation('+', [rgbColor, hslColor], false).eval(
                context
            );
            // Color operations are done per-channel and clamped to valid RGB values
            expect(result.rgb).toEqual([255, 100, 50]);
            expect(result.toCSS()).toBe('#ff6432');
        });

        it('should handle color operations with alpha values', () => {
            const context = { isMathOn: () => true };
            const color1 = new Color([255, 0, 0], 0.5);
            const color2 = new Color([0, 255, 0], 0.5);

            const result = new Operation('+', [color1, color2], false).eval(
                context
            );
            expect(result.rgb).toEqual([255, 255, 0]);
            expect(result.alpha).toBe(0.75); // Alpha should be combined
        });

        it('should handle different math contexts', () => {
            const context1 = { isMathOn: () => false };
            const context2 = {
                isMathOn: () => true,
                math: Constants.Math.PARENS_DIVISION
            };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');

            // Should preserve operation when math is off
            const result1 = new Operation('/', [dim1, dim2], false).eval(
                context1
            );
            expect(result1).toBeInstanceOf(Operation);

            // Should evaluate when math is on
            const result2 = new Operation('/', [dim1, dim2], false).eval(
                context2
            );
            expect(result2.value).toBe(2);
        });
    });

    describe('genCSS', () => {
        it('should generate CSS with spacing', () => {
            const context = {};
            const output = { add: vi.fn() };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');
            const op = new Operation('+', [dim1, dim2], true);

            op.genCSS(context, output);
            expect(output.add).toHaveBeenCalledTimes(7);
            expect(output.add).toHaveBeenNthCalledWith(1, '10');
            expect(output.add).toHaveBeenNthCalledWith(2, 'px');
            expect(output.add).toHaveBeenNthCalledWith(3, ' ');
            expect(output.add).toHaveBeenNthCalledWith(4, '+');
            expect(output.add).toHaveBeenNthCalledWith(5, ' ');
            expect(output.add).toHaveBeenNthCalledWith(6, '5');
            expect(output.add).toHaveBeenNthCalledWith(7, 'px');
        });

        it('should generate CSS without spacing', () => {
            const context = {};
            const output = { add: vi.fn() };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');
            const op = new Operation('+', [dim1, dim2], false);

            op.genCSS(context, output);
            expect(output.add).toHaveBeenCalledTimes(5);
            expect(output.add).toHaveBeenNthCalledWith(1, '10');
            expect(output.add).toHaveBeenNthCalledWith(2, 'px');
            expect(output.add).toHaveBeenNthCalledWith(3, '+');
            expect(output.add).toHaveBeenNthCalledWith(4, '5');
            expect(output.add).toHaveBeenNthCalledWith(5, 'px');
        });

        it('should handle complex nested operations', () => {
            const context = {};
            const output = { add: vi.fn() };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');
            const dim3 = new Dimension(2, 'px');
            const nestedOp = new Operation('*', [dim2, dim3], false);
            const op = new Operation('+', [dim1, nestedOp], true);

            op.genCSS(context, output);
            expect(output.add).toHaveBeenCalledTimes(10);
            expect(output.add).toHaveBeenNthCalledWith(1, '10');
            expect(output.add).toHaveBeenNthCalledWith(2, 'px');
            expect(output.add).toHaveBeenNthCalledWith(3, ' ');
            expect(output.add).toHaveBeenNthCalledWith(4, '+');
            expect(output.add).toHaveBeenNthCalledWith(5, ' ');
            expect(output.add).toHaveBeenNthCalledWith(6, '5');
            expect(output.add).toHaveBeenNthCalledWith(7, 'px');
            expect(output.add).toHaveBeenNthCalledWith(8, '*');
            expect(output.add).toHaveBeenNthCalledWith(9, '2');
            expect(output.add).toHaveBeenNthCalledWith(10, 'px');
        });

        it('should handle operators with multiple spaces', () => {
            const context = {};
            const output = { add: vi.fn() };
            const dim1 = new Dimension(10, 'px');
            const dim2 = new Dimension(5, 'px');
            const op = new Operation('  +  ', [dim1, dim2], true);

            op.genCSS(context, output);
            expect(output.add).toHaveBeenCalledTimes(7);
            expect(output.add).toHaveBeenNthCalledWith(4, '+');
        });
    });

    describe('accept', () => {
        it('should visit all operands', () => {
            const visitor = { visitArray: vi.fn() };
            const op = new Operation('+', [1, 2], false);

            op.accept(visitor);
            expect(visitor.visitArray).toHaveBeenCalledWith([1, 2]);
        });
    });
});
