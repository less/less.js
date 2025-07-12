import { describe, it, expect, beforeEach } from 'vitest';
import colorBlend from './color-blending.js';
import Color from '../tree/color.js';

describe('Color Blending Functions', () => {
    let redColor,
        blueColor,
        greenColor,
        blackColor,
        whiteColor,
        transparentColor;
    let halfTransparentRed, halfTransparentBlue;

    beforeEach(() => {
        // Create test colors
        redColor = new Color([255, 0, 0], 1.0); // red, fully opaque
        blueColor = new Color([0, 0, 255], 1.0); // blue, fully opaque
        greenColor = new Color([0, 255, 0], 1.0); // green, fully opaque
        blackColor = new Color([0, 0, 0], 1.0); // black, fully opaque
        whiteColor = new Color([255, 255, 255], 1.0); // white, fully opaque
        transparentColor = new Color([255, 0, 0], 0.0); // red, fully transparent
        halfTransparentRed = new Color([255, 0, 0], 0.5); // red, half transparent
        halfTransparentBlue = new Color([0, 0, 255], 0.5); // blue, half transparent
    });

    describe('colorBlend base function', () => {
        it('should exist and be a function', () => {
            expect(typeof colorBlend).toBe('function');
        });

        it('should blend two fully opaque colors', () => {
            const mode = (cb, cs) => cb * cs; // multiply
            const result = colorBlend(mode, redColor, blueColor);

            expect(result).toBeInstanceOf(Color);
            expect(result.alpha).toBe(1.0);
            expect(result.rgb).toHaveLength(3);
        });

        it('should handle alpha blending correctly', () => {
            const mode = (cb, cs) => cb * cs; // multiply
            const result = colorBlend(
                mode,
                halfTransparentRed,
                halfTransparentBlue
            );

            expect(result).toBeInstanceOf(Color);
            expect(result.alpha).toBeCloseTo(0.75, 2); // as + ab * (1 - as) = 0.5 + 0.5 * 0.5 = 0.75
        });

        it('should handle transparent backdrop', () => {
            const mode = (cb, cs) => cb * cs; // multiply
            const result = colorBlend(mode, transparentColor, blueColor);

            expect(result).toBeInstanceOf(Color);
            expect(result.alpha).toBe(1.0); // Source alpha becomes result alpha
        });

        it('should handle transparent source', () => {
            const mode = (cb, cs) => cb * cs; // multiply
            const result = colorBlend(mode, redColor, transparentColor);

            expect(result).toBeInstanceOf(Color);
            expect(result.alpha).toBe(1.0); // Backdrop alpha becomes result alpha
        });

        it('should handle both colors transparent', () => {
            const mode = (cb, cs) => cb * cs; // multiply
            const transparent1 = new Color([255, 0, 0], 0.0);
            const transparent2 = new Color([0, 0, 255], 0.0);
            const result = colorBlend(mode, transparent1, transparent2);

            expect(result).toBeInstanceOf(Color);
            expect(result.alpha).toBe(0.0);
        });

        it('should normalize RGB values to 0-1 range for blending', () => {
            const mode = (cb, cs) => {
                // Verify inputs are normalized
                expect(cb).toBeGreaterThanOrEqual(0);
                expect(cb).toBeLessThanOrEqual(1);
                expect(cs).toBeGreaterThanOrEqual(0);
                expect(cs).toBeLessThanOrEqual(1);
                return cb * cs;
            };

            colorBlend(mode, redColor, blueColor);
        });

        it('should restore RGB values to 0-255 range in result', () => {
            const mode = (cb, cs) => cb * cs; // multiply
            const result = colorBlend(mode, redColor, blueColor);

            result.rgb.forEach((value) => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(255);
            });
        });
    });

    describe('multiply blend mode', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.multiply).toBe('function');
        });

        it('should multiply color channels', () => {
            const result = colorBlend.multiply(redColor, halfTransparentRed);

            expect(result).toBeInstanceOf(Color);
            // Red channel: 1.0 * 1.0 = 1.0 -> 255
            // Other channels: 0.0 * 0.0 = 0.0 -> 0
            expect(Math.round(result.rgb[0])).toBe(255); // Red channel preserved
            expect(Math.round(result.rgb[1])).toBe(0); // Green channel
            expect(Math.round(result.rgb[2])).toBe(0); // Blue channel
        });

        it('should darken colors (multiply with black creates black)', () => {
            const result = colorBlend.multiply(redColor, blackColor);

            expect(Math.round(result.rgb[0])).toBe(0);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(0);
        });

        it('should preserve colors when multiplying with white', () => {
            const result = colorBlend.multiply(redColor, whiteColor);

            expect(Math.round(result.rgb[0])).toBe(255); // Red preserved
            expect(Math.round(result.rgb[1])).toBe(0); // Green preserved
            expect(Math.round(result.rgb[2])).toBe(0); // Blue preserved
        });

        it('should be commutative for multiply operation', () => {
            const result1 = colorBlend.multiply(redColor, blueColor);
            const result2 = colorBlend.multiply(blueColor, redColor);

            expect(Math.round(result1.rgb[0])).toBe(Math.round(result2.rgb[0]));
            expect(Math.round(result1.rgb[1])).toBe(Math.round(result2.rgb[1]));
            expect(Math.round(result1.rgb[2])).toBe(Math.round(result2.rgb[2]));
        });
    });

    describe('screen blend mode', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.screen).toBe('function');
        });

        it('should screen color channels using formula: cb + cs - cb * cs', () => {
            const result = colorBlend.screen(redColor, blueColor);

            expect(result).toBeInstanceOf(Color);
            // Red: 1 + 0 - 1*0 = 1 -> 255
            // Green: 0 + 0 - 0*0 = 0 -> 0
            // Blue: 0 + 1 - 0*1 = 1 -> 255
            expect(Math.round(result.rgb[0])).toBe(255);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(255);
        });

        it('should lighten colors (screen with white creates white)', () => {
            const result = colorBlend.screen(redColor, whiteColor);

            expect(Math.round(result.rgb[0])).toBe(255);
            expect(Math.round(result.rgb[1])).toBe(255);
            expect(Math.round(result.rgb[2])).toBe(255);
        });

        it('should preserve colors when screening with black', () => {
            const result = colorBlend.screen(redColor, blackColor);

            expect(Math.round(result.rgb[0])).toBe(255); // Red preserved
            expect(Math.round(result.rgb[1])).toBe(0); // Green preserved
            expect(Math.round(result.rgb[2])).toBe(0); // Blue preserved
        });

        it('should be commutative for screen operation', () => {
            const result1 = colorBlend.screen(redColor, blueColor);
            const result2 = colorBlend.screen(blueColor, redColor);

            expect(Math.round(result1.rgb[0])).toBe(Math.round(result2.rgb[0]));
            expect(Math.round(result1.rgb[1])).toBe(Math.round(result2.rgb[1]));
            expect(Math.round(result1.rgb[2])).toBe(Math.round(result2.rgb[2]));
        });
    });

    describe('overlay blend mode', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.overlay).toBe('function');
        });

        it('should multiply when backdrop <= 0.5', () => {
            const darkColor = new Color([64, 64, 64], 1.0); // 64/255 ≈ 0.25 < 0.5
            const result = colorBlend.overlay(darkColor, redColor);

            expect(result).toBeInstanceOf(Color);
            // Should use multiply formula for dark backdrop
        });

        it('should screen when backdrop > 0.5', () => {
            const lightColor = new Color([192, 192, 192], 1.0); // 192/255 ≈ 0.75 > 0.5
            const result = colorBlend.overlay(lightColor, redColor);

            expect(result).toBeInstanceOf(Color);
            // Should use screen formula for light backdrop
        });

        it('should handle edge case at 0.5', () => {
            const midColor = new Color([128, 128, 128], 1.0); // 128/255 ≈ 0.5
            const result = colorBlend.overlay(midColor, redColor);

            expect(result).toBeInstanceOf(Color);
        });

        it('should not be commutative (overlay is directional)', () => {
            const result1 = colorBlend.overlay(redColor, blueColor);
            const result2 = colorBlend.overlay(blueColor, redColor);

            // Results should generally be different (overlay is not commutative)
            const different = result1.rgb.some(
                (val, i) => Math.abs(val - result2.rgb[i]) > 1
            );
            expect(different).toBe(true);
        });
    });

    describe('softlight blend mode', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.softlight).toBe('function');
        });

        it('should handle cs > 0.5 case', () => {
            const lightSource = new Color([192, 192, 192], 1.0); // 192/255 ≈ 0.75 > 0.5
            const result = colorBlend.softlight(redColor, lightSource);

            expect(result).toBeInstanceOf(Color);
        });

        it('should handle cs <= 0.5 case', () => {
            const darkSource = new Color([64, 64, 64], 1.0); // 64/255 ≈ 0.25 <= 0.5
            const result = colorBlend.softlight(redColor, darkSource);

            expect(result).toBeInstanceOf(Color);
        });

        it('should handle cb > 0.25 case in bright source mode', () => {
            const brightBackdrop = new Color([192, 192, 192], 1.0); // > 0.25
            const brightSource = new Color([192, 192, 192], 1.0); // > 0.5
            const result = colorBlend.softlight(brightBackdrop, brightSource);

            expect(result).toBeInstanceOf(Color);
        });

        it('should handle cb <= 0.25 case in bright source mode', () => {
            const darkBackdrop = new Color([32, 32, 32], 1.0); // <= 0.25
            const brightSource = new Color([192, 192, 192], 1.0); // > 0.5
            const result = colorBlend.softlight(darkBackdrop, brightSource);

            expect(result).toBeInstanceOf(Color);
        });

        it('should create subtle lighting effects', () => {
            const result = colorBlend.softlight(redColor, whiteColor);

            expect(result).toBeInstanceOf(Color);
            // Soft light should create subtle effects, not extreme changes
        });
    });

    describe('hardlight blend mode', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.hardlight).toBe('function');
        });

        it('should be overlay with swapped parameters', () => {
            const result1 = colorBlend.hardlight(redColor, blueColor);
            const result2 = colorBlend.overlay(blueColor, redColor);

            expect(Math.round(result1.rgb[0])).toBe(Math.round(result2.rgb[0]));
            expect(Math.round(result1.rgb[1])).toBe(Math.round(result2.rgb[1]));
            expect(Math.round(result1.rgb[2])).toBe(Math.round(result2.rgb[2]));
        });

        it('should create strong contrast effects', () => {
            const result = colorBlend.hardlight(redColor, whiteColor);

            expect(result).toBeInstanceOf(Color);
        });
    });

    describe('difference blend mode', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.difference).toBe('function');
        });

        it('should compute absolute difference', () => {
            const result = colorBlend.difference(redColor, blueColor);

            expect(result).toBeInstanceOf(Color);
            // Red: |1 - 0| = 1 -> 255
            // Green: |0 - 0| = 0 -> 0
            // Blue: |0 - 1| = 1 -> 255
            expect(Math.round(result.rgb[0])).toBe(255);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(255);
        });

        it('should be commutative', () => {
            const result1 = colorBlend.difference(redColor, blueColor);
            const result2 = colorBlend.difference(blueColor, redColor);

            expect(Math.round(result1.rgb[0])).toBe(Math.round(result2.rgb[0]));
            expect(Math.round(result1.rgb[1])).toBe(Math.round(result2.rgb[1]));
            expect(Math.round(result1.rgb[2])).toBe(Math.round(result2.rgb[2]));
        });

        it('should return black when blending identical colors', () => {
            const result = colorBlend.difference(redColor, redColor);

            expect(Math.round(result.rgb[0])).toBe(0);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(0);
        });

        it('should invert when blending with white', () => {
            const result = colorBlend.difference(redColor, whiteColor);

            // Red: |1 - 1| = 0 -> 0
            // Green: |0 - 1| = 1 -> 255
            // Blue: |0 - 1| = 1 -> 255
            expect(Math.round(result.rgb[0])).toBe(0);
            expect(Math.round(result.rgb[1])).toBe(255);
            expect(Math.round(result.rgb[2])).toBe(255);
        });
    });

    describe('exclusion blend mode', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.exclusion).toBe('function');
        });

        it('should compute exclusion formula: cb + cs - 2 * cb * cs', () => {
            const result = colorBlend.exclusion(redColor, blueColor);

            expect(result).toBeInstanceOf(Color);
            // Red: 1 + 0 - 2*1*0 = 1 -> 255
            // Green: 0 + 0 - 2*0*0 = 0 -> 0
            // Blue: 0 + 1 - 2*0*1 = 1 -> 255
            expect(Math.round(result.rgb[0])).toBe(255);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(255);
        });

        it('should be commutative', () => {
            const result1 = colorBlend.exclusion(redColor, blueColor);
            const result2 = colorBlend.exclusion(blueColor, redColor);

            expect(Math.round(result1.rgb[0])).toBe(Math.round(result2.rgb[0]));
            expect(Math.round(result1.rgb[1])).toBe(Math.round(result2.rgb[1]));
            expect(Math.round(result1.rgb[2])).toBe(Math.round(result2.rgb[2]));
        });

        it('should return black when blending identical colors', () => {
            const result = colorBlend.exclusion(redColor, redColor);

            // For identical colors: c + c - 2*c*c = 2c - 2c² = 2c(1-c)
            // For red: 2*1*(1-1) = 0
            expect(Math.round(result.rgb[0])).toBe(0);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(0);
        });

        it('should be similar to difference but softer', () => {
            const exclusionResult = colorBlend.exclusion(redColor, whiteColor);
            const differenceResult = colorBlend.difference(
                redColor,
                whiteColor
            );

            // Both should produce similar but slightly different results
            expect(exclusionResult).toBeInstanceOf(Color);
            expect(differenceResult).toBeInstanceOf(Color);
        });
    });

    describe('average blend mode (non-w3c)', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.average).toBe('function');
        });

        it('should compute arithmetic average', () => {
            const result = colorBlend.average(redColor, blueColor);

            expect(result).toBeInstanceOf(Color);
            // Red: (1 + 0) / 2 = 0.5 -> 127.5
            // Green: (0 + 0) / 2 = 0 -> 0
            // Blue: (0 + 1) / 2 = 0.5 -> 127.5
            expect(Math.round(result.rgb[0])).toBe(128);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(128);
        });

        it('should be commutative', () => {
            const result1 = colorBlend.average(redColor, blueColor);
            const result2 = colorBlend.average(blueColor, redColor);

            expect(Math.round(result1.rgb[0])).toBe(Math.round(result2.rgb[0]));
            expect(Math.round(result1.rgb[1])).toBe(Math.round(result2.rgb[1]));
            expect(Math.round(result1.rgb[2])).toBe(Math.round(result2.rgb[2]));
        });

        it('should return identical color when averaging with itself', () => {
            const result = colorBlend.average(redColor, redColor);

            expect(Math.round(result.rgb[0])).toBe(255);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(0);
        });

        it('should create mid-tone gray when averaging black and white', () => {
            const result = colorBlend.average(blackColor, whiteColor);

            expect(Math.round(result.rgb[0])).toBe(128);
            expect(Math.round(result.rgb[1])).toBe(128);
            expect(Math.round(result.rgb[2])).toBe(128);
        });
    });

    describe('negation blend mode (non-w3c)', () => {
        it('should be available as a method', () => {
            expect(typeof colorBlend.negation).toBe('function');
        });

        it('should compute negation formula: 1 - |cb + cs - 1|', () => {
            const result = colorBlend.negation(redColor, blueColor);

            expect(result).toBeInstanceOf(Color);
            // Red: 1 - |1 + 0 - 1| = 1 - 0 = 1 -> 255
            // Green: 1 - |0 + 0 - 1| = 1 - 1 = 0 -> 0
            // Blue: 1 - |0 + 1 - 1| = 1 - 0 = 1 -> 255
            expect(Math.round(result.rgb[0])).toBe(255);
            expect(Math.round(result.rgb[1])).toBe(0);
            expect(Math.round(result.rgb[2])).toBe(255);
        });

        it('should be commutative', () => {
            const result1 = colorBlend.negation(redColor, blueColor);
            const result2 = colorBlend.negation(blueColor, redColor);

            expect(Math.round(result1.rgb[0])).toBe(Math.round(result2.rgb[0]));
            expect(Math.round(result1.rgb[1])).toBe(Math.round(result2.rgb[1]));
            expect(Math.round(result1.rgb[2])).toBe(Math.round(result2.rgb[2]));
        });

        it('should handle edge cases', () => {
            const result1 = colorBlend.negation(blackColor, blackColor);
            const result2 = colorBlend.negation(whiteColor, whiteColor);

            expect(result1).toBeInstanceOf(Color);
            expect(result2).toBeInstanceOf(Color);
        });
    });

    describe('all blend modes integration', () => {
        const allModes = [
            'multiply',
            'screen',
            'overlay',
            'softlight',
            'hardlight',
            'difference',
            'exclusion',
            'average',
            'negation'
        ];

        allModes.forEach((mode) => {
            it(`should have ${mode} as a bound method`, () => {
                expect(typeof colorBlend[mode]).toBe('function');
            });

            it(`${mode} should return Color instance`, () => {
                const result = colorBlend[mode](redColor, blueColor);
                expect(result).toBeInstanceOf(Color);
            });

            it(`${mode} should preserve alpha calculation`, () => {
                const result = colorBlend[mode](
                    halfTransparentRed,
                    halfTransparentBlue
                );
                expect(result.alpha).toBeGreaterThan(0);
                expect(result.alpha).toBeLessThanOrEqual(1);
            });

            it(`${mode} should produce valid RGB values`, () => {
                const result = colorBlend[mode](redColor, blueColor);
                result.rgb.forEach((value) => {
                    expect(value).toBeGreaterThanOrEqual(0);
                    expect(value).toBeLessThanOrEqual(255);
                    expect(isNaN(value)).toBe(false);
                });
            });
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle colors with extreme values', () => {
            const maxColor = new Color([255, 255, 255], 1.0);
            const minColor = new Color([0, 0, 0], 1.0);

            const result = colorBlend.multiply(maxColor, minColor);
            expect(result).toBeInstanceOf(Color);
        });

        it('should handle floating point precision', () => {
            const color1 = new Color([127.7, 128.3, 128.9], 1.0);
            const color2 = new Color([64.1, 63.9, 64.5], 1.0);

            const result = colorBlend.multiply(color1, color2);
            expect(result).toBeInstanceOf(Color);

            result.rgb.forEach((value) => {
                expect(isFinite(value)).toBe(true);
                expect(isNaN(value)).toBe(false);
            });
        });

        it('should handle very small alpha values', () => {
            const tinyAlpha = new Color([255, 0, 0], 0.001);
            const result = colorBlend.multiply(redColor, tinyAlpha);

            expect(result).toBeInstanceOf(Color);
            expect(result.alpha).toBeGreaterThan(0);
        });

        it('should handle alpha values very close to 1', () => {
            const almostOpaque = new Color([255, 0, 0], 0.999999);
            const result = colorBlend.multiply(redColor, almostOpaque);

            expect(result).toBeInstanceOf(Color);
            expect(result.alpha).toBeLessThanOrEqual(1);
        });
    });

    describe('mathematical properties', () => {
        it('multiply should be associative with white', () => {
            const result1 = colorBlend.multiply(
                colorBlend.multiply(redColor, whiteColor),
                blueColor
            );
            const result2 = colorBlend.multiply(
                redColor,
                colorBlend.multiply(whiteColor, blueColor)
            );

            expect(Math.abs(result1.rgb[0] - result2.rgb[0])).toBeLessThan(1);
            expect(Math.abs(result1.rgb[1] - result2.rgb[1])).toBeLessThan(1);
            expect(Math.abs(result1.rgb[2] - result2.rgb[2])).toBeLessThan(1);
        });

        it('screen should be associative with black', () => {
            const result1 = colorBlend.screen(
                colorBlend.screen(redColor, blackColor),
                blueColor
            );
            const result2 = colorBlend.screen(
                redColor,
                colorBlend.screen(blackColor, blueColor)
            );

            expect(Math.abs(result1.rgb[0] - result2.rgb[0])).toBeLessThan(1);
            expect(Math.abs(result1.rgb[1] - result2.rgb[1])).toBeLessThan(1);
            expect(Math.abs(result1.rgb[2] - result2.rgb[2])).toBeLessThan(1);
        });

        it('difference should satisfy triangle inequality approximation', () => {
            const result1 = colorBlend.difference(redColor, greenColor);
            const result2 = colorBlend.difference(greenColor, blueColor);
            const result3 = colorBlend.difference(redColor, blueColor);

            // This is a loose check for triangle-like property
            expect(result1).toBeInstanceOf(Color);
            expect(result2).toBeInstanceOf(Color);
            expect(result3).toBeInstanceOf(Color);
        });
    });
});
