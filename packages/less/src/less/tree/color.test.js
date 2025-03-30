import { describe, it, expect } from 'vitest';
import Color from './color';

describe('Color', () => {
    // Constructor tests
    it('should create color from RGB array', () => {
        const color = new Color([255, 0, 0]);
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.alpha).toBe(1);
    });

    it('should create color from 6-digit hex', () => {
        const color = new Color('ff0000');
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.alpha).toBe(1);
    });

    it('should create color from 3-digit hex', () => {
        const color = new Color('f00');
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.alpha).toBe(1);
    });

    it('should handle alpha channel in hex', () => {
        const color = new Color('ff0000ff');
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.alpha).toBe(1);
    });

    it('should handle alpha parameter', () => {
        const color = new Color([255, 0, 0], 0.5);
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.alpha).toBe(0.5);
    });

    // Color format conversion tests
    it('should convert to RGB hex string', () => {
        const color = new Color([255, 0, 0]);
        expect(color.toRGB()).toBe('#ff0000');
    });

    it('should convert to HSL', () => {
        const color = new Color([255, 0, 0]);
        const hsl = color.toHSL();
        expect(hsl.h).toBe(0);
        expect(hsl.s).toBe(1);
        expect(hsl.l).toBe(0.5);
        expect(hsl.a).toBe(1);
    });

    it('should convert to HSV', () => {
        const color = new Color([255, 0, 0]);
        const hsv = color.toHSV();
        expect(hsv.h).toBe(0);
        expect(hsv.s).toBe(1);
        expect(hsv.v).toBe(1);
        expect(hsv.a).toBe(1);
    });

    it('should convert to ARGB', () => {
        const color = new Color([255, 0, 0], 0.5);
        expect(color.toARGB()).toBe('#80ff0000');
    });

    // Color operations
    it('should add colors', () => {
        const c1 = new Color([100, 100, 100]);
        const c2 = new Color([50, 50, 50]);
        const result = c1.operate({}, '+', c2);
        expect(result.rgb).toEqual([150, 150, 150]);
    });

    it('should subtract colors', () => {
        const c1 = new Color([100, 100, 100]);
        const c2 = new Color([50, 50, 50]);
        const result = c1.operate({}, '-', c2);
        expect(result.rgb).toEqual([50, 50, 50]);
    });

    it('should multiply colors', () => {
        const c1 = new Color([100, 100, 100]);
        const c2 = new Color([0.5, 0.5, 0.5]);
        const result = c1.operate({}, '*', c2);
        expect(result.rgb).toEqual([50, 50, 50]);
    });

    it('should divide colors', () => {
        const c1 = new Color([100, 100, 100]);
        const c2 = new Color([2, 2, 2]);
        const result = c1.operate({}, '/', c2);
        expect(result.rgb).toEqual([50, 50, 50]);
    });

    // CSS output tests
    it('should generate CSS for RGB color', () => {
        const color = new Color([255, 0, 0]);
        expect(color.toCSS()).toBe('#ff0000');
    });

    it('should generate CSS for RGBA color', () => {
        const color = new Color([255, 0, 0], 0.5);
        expect(color.toCSS()).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should generate compressed CSS when context.compress is true', () => {
        const color = new Color([255, 0, 0]);
        expect(color.toCSS({ compress: true })).toBe('#f00');
    });

    it('should clamp alpha values in CSS output', () => {
        const color = new Color([255, 0, 0], 2);
        expect(color.toCSS()).toBe('#ff0000');
    });

    // Color comparison
    it('should compare equal colors', () => {
        const c1 = new Color([255, 0, 0]);
        const c2 = new Color([255, 0, 0]);
        expect(c1.compare(c2)).toBe(0);
    });

    it('should compare different colors', () => {
        const c1 = new Color([255, 0, 0]);
        const c2 = new Color([0, 255, 0]);
        expect(c1.compare(c2)).toBeUndefined();
    });

    // Named color tests
    it('should create color from named color', () => {
        const color = Color.fromKeyword('red');
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.value).toBe('red');
    });

    it('should handle transparent keyword', () => {
        const color = Color.fromKeyword('transparent');
        expect(color.rgb).toEqual([0, 0, 0]);
        expect(color.alpha).toBe(0);
        expect(color.value).toBe('transparent');
    });

    // Luma calculation
    it('should calculate luma for black', () => {
        const color = new Color([0, 0, 0]);
        expect(color.luma()).toBe(0);
    });

    it('should calculate luma for white', () => {
        const color = new Color([255, 255, 255]);
        expect(color.luma()).toBe(1);
    });

    // Value clamping
    it('should clamp RGB values in CSS output', () => {
        const color = new Color([300, -50, 128], 0.5);
        expect(color.toCSS()).toBe('rgba(255, 0, 128, 0.5)');
    });

    // Edge cases
    it('should handle empty input', () => {
        const color = new Color('');
        expect(color.rgb).toEqual([]);
        expect(color.alpha).toBe(1);
    });

    it('should handle invalid hex input', () => {
        const color = new Color('invalid');
        expect(color.rgb).toEqual([NaN, NaN, NaN]);
        expect(color.alpha).toBe(1);
    });

    it('should handle undefined alpha', () => {
        const color = new Color([255, 0, 0], undefined);
        expect(color.alpha).toBe(1);
    });

    // HSL Color Input Tests
    it('should create color from HSL values', () => {
        const color = new Color([255, 0, 0]);
        color.value = 'hsl(0, 100%, 50%)';
        expect(color.toCSS()).toBe('hsl(0, 100%, 50%)');
    });

    // Color Operation Edge Cases
    it('should handle operations with transparent colors', () => {
        const c1 = new Color([255, 0, 0], 0);
        const c2 = new Color([0, 255, 0], 0.5);
        const result = c1.operate({}, '+', c2);
        expect(result.alpha).toBe(0.5);
    });

    // Named Colors Tests
    it('should handle various named colors', () => {
        const colors = ['blue', 'green', 'purple', 'orange'];
        colors.forEach((name) => {
            const color = Color.fromKeyword(name);
            expect(color.value).toBe(name);
            expect(color.rgb.length).toBe(3);
        });
    });

    // HSL/HSV Edge Cases
    it('should handle grayscale colors in HSL conversion', () => {
        const color = new Color([128, 128, 128]);
        const hsl = color.toHSL();
        expect(hsl.h).toBe(0);
        expect(hsl.s).toBe(0);
        expect(hsl.l).toBeCloseTo(0.5, 2);
    });

    // Extreme Value Clamping
    it('should clamp extreme RGB values', () => {
        const color = new Color([-100, 300, 128], 2);
        expect(color.toCSS()).toBe('#00ff80');
    });

    // Context Formatting
    it('should respect context formatting options', () => {
        const color = new Color([255, 0, 0]);
        expect(color.toCSS({ compress: true })).toBe('#f00');
        expect(color.toCSS({ compress: false })).toBe('#ff0000');
    });

    // Additional HSL/HSV Input Tests
    it('should create color from HSL string', () => {
        const color = new Color([255, 0, 0]);
        color.value = 'hsl(0, 100%, 50%)';
        expect(color.toCSS()).toBe('hsl(0, 100%, 50%)');
    });

    it('should create color from HSLA string', () => {
        const color = new Color([255, 0, 0], 0.5);
        color.value = 'hsla(0, 100%, 50%, 0.5)';
        expect(color.toCSS()).toBe('hsla(0, 100%, 50%, 0.5)');
    });

    // Color Operation Edge Cases
    it('should handle operations with NaN values', () => {
        const c1 = new Color([NaN, 0, 0]);
        const c2 = new Color([0, 0, 0]);
        const result = c1.operate({}, '+', c2);
        expect(result.rgb[0]).toBeNaN();
    });

    it('should handle operations with empty colors', () => {
        const c1 = new Color('');
        const c2 = new Color([0, 0, 0]);
        const result = c1.operate({}, '+', c2);
        expect(result.rgb).toEqual([NaN, NaN, NaN]);
    });

    it('should handle operations with extreme values', () => {
        const c1 = new Color([1000, -100, 0]);
        const c2 = new Color([1000, 1000, 1000]);
        const result = c1.operate({}, '+', c2);
        expect(result.toCSS()).toBe('#ffffff');
    });

    // CSS Output Edge Cases
    it('should handle very small alpha values', () => {
        const color = new Color([255, 0, 0], 0.0001);
        expect(color.toCSS()).toBe('rgba(255, 0, 0, 0.0001)');
    });

    it('should handle very large alpha values', () => {
        const color = new Color([255, 0, 0], 1.0001);
        expect(color.toCSS()).toBe('#ff0000');
    });

    it('should handle NaN values in CSS output', () => {
        const color = new Color([NaN, 0, 0]);
        expect(color.toCSS()).toBe('#NaN0000');
    });

    // Named Colors Edge Cases
    it('should handle case-insensitive named colors', () => {
        const color1 = Color.fromKeyword('RED');
        const color2 = Color.fromKeyword('red');
        expect(color1.compare(color2)).toBe(0);
    });

    it('should handle invalid named colors', () => {
        const color = Color.fromKeyword('invalidColor');
        expect(color).toBeUndefined();
    });

    // Value Clamping Tests
    it('should clamp HSL values', () => {
        const color = new Color([255, 0, 0]);
        const hsl = color.toHSL();
        hsl.h = 400; // Should wrap around to 40
        hsl.s = 2; // Should clamp to 1
        hsl.l = -1; // Should clamp to 0
        expect(color.toCSS()).toBe('#ff0000');
    });

    it('should clamp HSV values', () => {
        const color = new Color([255, 0, 0]);
        const hsv = color.toHSV();
        hsv.h = 400; // Should wrap around to 40
        hsv.s = 2; // Should clamp to 1
        hsv.v = -1; // Should clamp to 0
        expect(color.toCSS()).toBe('#ff0000');
    });

    it('should clamp alpha values in different formats', () => {
        const color = new Color([255, 0, 0], 2);
        expect(color.toCSS()).toBe('#ff0000');
        expect(color.toARGB()).toBe('#ffff0000');
    });

    // Additional Format Tests
    it('should handle 8-digit hex with alpha', () => {
        const color = new Color('ff0000ff');
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.alpha).toBe(1);
    });

    it('should handle 4-digit hex with alpha', () => {
        const color = new Color('f00f');
        expect(color.rgb).toEqual([255, 0, 0]);
        expect(color.alpha).toBe(1);
    });

    it('should handle percentage values in HSL', () => {
        const color = new Color([255, 0, 0]);
        color.value = 'hsl(0, 100%, 50%)';
        expect(color.toCSS()).toBe('hsl(0, 100%, 50%)');
    });

    // Additional HSL/HSV Edge Cases
    it('should handle HSL boundary values', () => {
        const color = new Color([255, 0, 0]);
        const hsl = color.toHSL();
        hsl.h = 360;
        expect(color.toCSS()).toBe('#ff0000');
        hsl.h = 0;
        expect(color.toCSS()).toBe('#ff0000');
    });

    it('should handle HSL with zero saturation', () => {
        const color = new Color([128, 128, 128]);
        const hsl = color.toHSL();
        hsl.s = 0;
        expect(color.toCSS()).toBe('#808080');
    });

    it('should handle HSL with full saturation', () => {
        const color = new Color([255, 0, 0]);
        const hsl = color.toHSL();
        hsl.s = 1;
        expect(color.toCSS()).toBe('#ff0000');
    });

    it('should handle HSL with extreme lightness values', () => {
        // Create colors with different lightness values
        const color1 = new Color([0, 0, 0]); // Black
        expect(color1.toCSS()).toBe('#000000');

        const color2 = new Color([255, 255, 255]); // White
        expect(color2.toCSS()).toBe('#ffffff');
    });

    // Color Operations with Different Formats
    it('should handle color operations with HSL colors', () => {
        const c1 = new Color([255, 0, 0]);
        c1.value = 'hsl(0, 100%, 50%)';
        const c2 = new Color([0, 255, 0]);
        c2.value = 'hsl(120, 100%, 50%)';
        const result = c1.operate({}, '+', c2);
        expect(result.toCSS()).toBe('#ffff00');
    });

    it('should handle color operations with named colors', () => {
        const c1 = Color.fromKeyword('red');
        const c2 = Color.fromKeyword('blue');
        const result = c1.operate({}, '+', c2);
        expect(result.toCSS()).toBe('#ff00ff');
    });

    it('should handle color operations with transparent colors', () => {
        const c1 = new Color([255, 0, 0], 0.5);
        const c2 = new Color([0, 255, 0], 0.5);
        const result = c1.operate({}, '+', c2);
        expect(result.alpha).toBe(0.75);
        expect(result.toCSS()).toBe('rgba(255, 255, 0, 0.75)');
    });

    // Format Conversion Edge Cases
    it('should handle malformed hex strings', () => {
        const color = new Color('ff0');
        expect(color.toCSS()).toBe('#ffff00');
        const color2 = new Color('ff00');
        expect(color2.toCSS()).toBe('#ffff00');
    });

    it('should handle invalid color format strings', () => {
        const color = new Color('invalid');
        expect(color.rgb).toEqual([NaN, NaN, NaN]);
        expect(color.toCSS()).toBe('#NaNNaNNaN');
    });

    // Named Colors Edge Cases
    it('should handle all standard CSS named colors', () => {
        const standardColors = [
            'black',
            'silver',
            'gray',
            'white',
            'maroon',
            'red',
            'purple',
            'fuchsia',
            'green',
            'lime',
            'olive',
            'yellow',
            'navy',
            'blue',
            'teal',
            'aqua'
        ];
        standardColors.forEach((name) => {
            const color = Color.fromKeyword(name);
            expect(color).toBeDefined();
            expect(color.value).toBe(name);
        });
    });

    it('should handle named colors with special characters', () => {
        const color = Color.fromKeyword('invalid-color');
        expect(color).toBeUndefined();
    });

    // Alpha Channel Edge Cases
    it('should handle alpha channel precision', () => {
        const color = new Color([255, 0, 0], 0.123456789);
        expect(color.toCSS()).toBe('rgba(255, 0, 0, 0.123456789)');
    });

    it('should handle alpha channel inheritance in operations', () => {
        const c1 = new Color([255, 0, 0], 0.5);
        const c2 = new Color([0, 255, 0], 0.5);
        const result = c1.operate({}, '+', c2);
        expect(result.alpha).toBe(0.75);
        const result2 = c1.operate({}, '*', c2);
        expect(result2.alpha).toBe(0.75); // Multiplication preserves alpha
    });

    it('should handle alpha channel in different formats', () => {
        const color = new Color([255, 0, 0], 0.5);
        expect(color.toCSS()).toBe('rgba(255, 0, 0, 0.5)');
        expect(color.toARGB()).toBe('#80ff0000');
        color.value = 'hsla(0, 100%, 50%, 0.5)';
        expect(color.toCSS()).toBe('hsla(0, 100%, 50%, 0.5)');
    });

    // Format Conversion Tests
    it('should convert between all color formats', () => {
        const color = new Color([255, 0, 0]);
        const hsl = color.toHSL();
        const hsv = color.toHSV();

        // RGB to HSL
        expect(hsl.h).toBe(0);
        expect(hsl.s).toBe(1);
        expect(hsl.l).toBe(0.5);

        // RGB to HSV
        expect(hsv.h).toBe(0);
        expect(hsv.s).toBe(1);
        expect(hsv.v).toBe(1);

        // All formats should represent the same color
        expect(color.toCSS()).toBe('#ff0000');
        expect(color.toCSS({ compress: true })).toBe('#f00');
    });

    // Value Clamping Tests
    it('should clamp values in all color formats', () => {
        const color = new Color([300, -50, 128], 2);
        const hsl = color.toHSL();
        const hsv = color.toHSV();

        // RGB clamping
        expect(color.toCSS()).toBe('#ff0080');

        // HSL clamping
        hsl.h = 400;
        hsl.s = 2;
        hsl.l = -1;
        expect(color.toCSS()).toBe('#ff0080');

        // HSV clamping
        hsv.h = 400;
        hsv.s = 2;
        hsv.v = -1;
        expect(color.toCSS()).toBe('#ff0080');
    });
});
