import { describe, it, expect, beforeEach } from 'vitest';
import Dimension from '../tree/dimension';
import Color from '../tree/color';
import Expression from '../tree/expression';
import Quoted from '../tree/quoted';
import URL from '../tree/url';
import svgModule from './svg';

describe('svg functions', () => {
    let svgFunctions;
    let mockThis;

    beforeEach(() => {
        svgFunctions = svgModule();
        mockThis = {
            index: 0,
            currentFileInfo: { filename: 'test.less', rootpath: '', currentDirectory: '', entryPath: '', relativeUrls: false },
            context: { compress: false }
        };
    });

    describe('svg-gradient', () => {
        it('should throw error with no arguments', () => {
            expect(() => {
                svgFunctions['svg-gradient'].call(mockThis);
            }).toThrow();
        });

        it('should throw error with only direction', () => {
            const direction = new Quoted('"', 'to bottom', false);
            expect(() => {
                svgFunctions['svg-gradient'].call(mockThis, direction);
            }).toThrow();
        });

        it('should handle to bottom direction with color list', () => {
            const direction = new Quoted('', 'to bottom', false); // unquoted
            const colorList = new Expression([
                new Color([255, 0, 0], 1), // red
                new Color([0, 0, 255], 1)  // blue
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result).toBeInstanceOf(URL);
            expect(result.value).toBeInstanceOf(Quoted);
            expect(result.value.value).toContain('data:image/svg+xml,');
            expect(result.value.value).toContain('x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%220%25%22%20y2%3D%22100%25%22');
            expect(result.value.value).toContain('stop-color%3D%22%23ff0000%22');
            expect(result.value.value).toContain('stop-color%3D%22%230000ff%22');
        });

        it('should handle to right direction with color list', () => {
            const direction = new Quoted('', 'to right', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1), // red
                new Color([0, 255, 0], 1)  // green
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result).toBeInstanceOf(URL);
            expect(result.value.value).toContain('x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22');
        });

        it('should handle to bottom right direction', () => {
            const direction = new Quoted('', 'to bottom right', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result.value.value).toContain('x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22');
        });

        it('should handle to top right direction', () => {
            const direction = new Quoted('', 'to top right', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result.value.value).toContain('x1%3D%220%25%22%20y1%3D%22100%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22');
        });

        it('should handle ellipse direction for radial gradient', () => {
            const direction = new Quoted('', 'ellipse', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result.value.value).toContain('radialGradient');
            expect(result.value.value).toContain('cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2275%25%22');
            expect(result.value.value).toContain('x%3D%22-50%22%20y%3D%22-50%22%20width%3D%22101%22%20height%3D%22101%22');
        });

        it('should handle ellipse at center direction', () => {
            const direction = new Quoted('', 'ellipse at center', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result.value.value).toContain('radialGradient');
            expect(result.value.value).toContain('cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2275%25%22');
        });

        it('should throw error for invalid direction', () => {
            const direction = new Quoted('', 'invalid direction', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            expect(() => {
                svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            }).toThrow();
        });

        it('should handle individual color arguments', () => {
            const direction = new Quoted('', 'to bottom', false);
            const color1 = new Color([255, 0, 0], 1);
            const color2 = new Color([0, 0, 255], 1);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, color1, color2);
            
            expect(result).toBeInstanceOf(URL);
            expect(result.value.value).toContain('stop-color%3D%22%23ff0000%22');
            expect(result.value.value).toContain('stop-color%3D%22%230000ff%22');
        });

        it('should handle colors with positions using Expression', () => {
            const direction = new Quoted('', 'to bottom', false);
            const colorWithPos1 = new Expression([
                new Color([255, 0, 0], 1),
                new Dimension(0, '%')
            ]);
            const colorWithPos2 = new Expression([
                new Color([0, 0, 255], 1),
                new Dimension(100, '%')
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorWithPos1, colorWithPos2);
            
            expect(result.value.value).toContain('offset%3D%220%25%22');
            expect(result.value.value).toContain('offset%3D%22100%25%22');
        });

        it('should handle colors with partial alpha', () => {
            const direction = new Quoted('', 'to bottom', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 0.5), // red with 50% alpha
                new Color([0, 0, 255], 1)    // blue with full alpha
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result.value.value).toContain('stop-opacity%3D%220.5%22');
        });

        it('should not include stop-opacity for full alpha', () => {
            const direction = new Quoted('', 'to bottom', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1), // red with full alpha
                new Color([0, 0, 255], 1)  // blue with full alpha
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result.value.value).not.toContain('stop-opacity');
        });

        it('should handle three colors', () => {
            const direction = new Quoted('', 'to bottom', false);
            const color1 = new Color([255, 0, 0], 1);   // red (first, no position)
            const colorWithPos = new Expression([       // green (middle, must have position)
                new Color([0, 255, 0], 1),
                new Dimension(50, '%')
            ]);
            const color3 = new Color([0, 0, 255], 1);   // blue (last, no position)

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, color1, colorWithPos, color3);
            
            expect(result.value.value).toContain('stop-color%3D%22%23ff0000%22');
            expect(result.value.value).toContain('stop-color%3D%22%2300ff00%22');
            expect(result.value.value).toContain('stop-color%3D%22%230000ff%22');
        });

        it('should handle middle color with position', () => {
            const direction = new Quoted('', 'to bottom', false);
            const color1 = new Color([255, 0, 0], 1);
            const colorWithPos = new Expression([
                new Color([0, 255, 0], 1),
                new Dimension(50, '%')
            ]);
            const color3 = new Color([0, 0, 255], 1);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, color1, colorWithPos, color3);
            
            expect(result.value.value).toContain('offset%3D%220%25%22');     // first color gets 0%
            expect(result.value.value).toContain('offset%3D%2250%25%22');    // middle color gets 50%
            expect(result.value.value).toContain('offset%3D%22100%25%22');   // last color gets 100%
        });

        it('should throw error for non-Color arguments', () => {
            const direction = new Quoted('', 'to bottom', false);
            const invalidArg = new Quoted('"', 'not a color', false);

            expect(() => {
                svgFunctions['svg-gradient'].call(mockThis, direction, invalidArg);
            }).toThrow();
        });

        it('should throw error for middle colors without positions when positions are required', () => {
            const direction = new Quoted('', 'to bottom', false);
            const color1 = new Color([255, 0, 0], 1);
            const color2 = new Color([0, 255, 0], 1); // middle color without position
            const colorWithPos = new Expression([
                new Color([0, 0, 255], 1),
                new Dimension(100, '%')
            ]);

            expect(() => {
                svgFunctions['svg-gradient'].call(mockThis, direction, color1, color2, colorWithPos);
            }).toThrow();
        });

        it('should throw error when color list has less than 2 colors', () => {
            const direction = new Quoted('', 'to bottom', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1) // only one color
            ]);

            expect(() => {
                svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            }).toThrow();
        });

        it('should properly encode special characters in SVG', () => {
            const direction = new Quoted('', 'to bottom', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            // Check that the result is properly URI encoded
            expect(result.value.value).toMatch(/^data:image\/svg\+xml,%3Csvg/);
            expect(result.value.value).toContain('%22'); // encoded quotes
            expect(result.value.value).toContain('%3C');  // encoded <
            expect(result.value.value).toContain('%3E');  // encoded >
        });

        it('should include proper SVG structure', () => {
            const direction = new Quoted('', 'to bottom', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            const decodedSvg = decodeURIComponent(result.value.value.replace('data:image/svg+xml,', ''));
            
            expect(decodedSvg).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">');
            expect(decodedSvg).toContain('<linearGradient id="g"');
            expect(decodedSvg).toContain('</linearGradient>');
            expect(decodedSvg).toContain('<rect x="0" y="0" width="1" height="1" fill="url(#g)" />');
            expect(decodedSvg).toContain('</svg>');
        });

        it('should handle zero alpha correctly', () => {
            const direction = new Quoted('', 'to bottom', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 0), // red with 0% alpha
                new Color([0, 0, 255], 1)  // blue with full alpha
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            expect(result.value.value).toContain('stop-opacity%3D%220%22');
        });

        it('should work with compressed context in this.context', () => {
            mockThis.context.compress = true;
            
            const direction = new Quoted('', 'to bottom', false);
            const colorList = new Expression([
                new Color([255, 0, 0], 1),
                new Color([0, 0, 255], 1)
            ]);

            const result = svgFunctions['svg-gradient'].call(mockThis, direction, colorList);
            
            // The function should still work regardless of compress setting
            // since it uses its own renderEnv = {compress: false}
            expect(result).toBeInstanceOf(URL);
        });
    });
});