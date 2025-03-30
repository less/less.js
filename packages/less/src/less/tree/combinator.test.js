import { describe, it, expect, vi } from 'vitest';
import Combinator from './combinator';

describe('Combinator', () => {
    describe('constructor', () => {
        it('should create a combinator with empty value', () => {
            const combinator = new Combinator();
            expect(combinator.value).toBe('');
            expect(combinator.emptyOrWhitespace).toBe(true);
        });

        it('should create a combinator with space value', () => {
            const combinator = new Combinator(' ');
            expect(combinator.value).toBe(' ');
            expect(combinator.emptyOrWhitespace).toBe(true);
        });

        it('should create a combinator with trimmed value', () => {
            const combinator = new Combinator('  >  ');
            expect(combinator.value).toBe('>');
            expect(combinator.emptyOrWhitespace).toBe(false);
        });

        it('should handle null value', () => {
            const combinator = new Combinator(null);
            expect(combinator.value).toBe('');
            expect(combinator.emptyOrWhitespace).toBe(true);
        });

        it('should handle undefined value', () => {
            const combinator = new Combinator(undefined);
            expect(combinator.value).toBe('');
            expect(combinator.emptyOrWhitespace).toBe(true);
        });

        it('should handle empty string value', () => {
            const combinator = new Combinator('');
            expect(combinator.value).toBe('');
            expect(combinator.emptyOrWhitespace).toBe(true);
        });

        it('should handle various whitespace combinations', () => {
            const combinator = new Combinator('\t\n\r  >  \t\n\r');
            expect(combinator.value).toBe('>');
            expect(combinator.emptyOrWhitespace).toBe(false);
        });

        it('should handle special characters in input', () => {
            const combinator = new Combinator('  *  ');
            expect(combinator.value).toBe('*');
            expect(combinator.emptyOrWhitespace).toBe(false);
        });

        it('should handle unicode whitespace characters', () => {
            const combinator = new Combinator(
                '\u00A0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff>'
            );
            expect(combinator.value).not.toBe('');
            expect(combinator.value).toContain('>');
            expect(combinator.emptyOrWhitespace).toBe(false);
        });

        it('should handle very long strings with multiple spaces', () => {
            const combinator = new Combinator('   ' + '>'.repeat(100) + '   ');
            expect(combinator.value).toBe('>'.repeat(100));
            expect(combinator.emptyOrWhitespace).toBe(false);
        });

        it('should handle strings containing only whitespace', () => {
            const combinator = new Combinator('\t\n\r ');
            expect(combinator.value).toBe('');
            expect(combinator.emptyOrWhitespace).toBe(true);
        });
    });

    describe('genCSS', () => {
        it('should generate CSS with no spaces for empty combinator', () => {
            const combinator = new Combinator('');
            const output = { add: vi.fn() };
            combinator.genCSS({ compress: false }, output);
            expect(output.add).toHaveBeenCalledWith('');
        });

        it('should generate CSS with no spaces for space combinator', () => {
            const combinator = new Combinator(' ');
            const output = { add: vi.fn() };
            combinator.genCSS({ compress: false }, output);
            expect(output.add).toHaveBeenCalledWith(' ');
        });

        it('should generate CSS with spaces for non-empty combinator when not compressed', () => {
            const combinator = new Combinator('>');
            const output = { add: vi.fn() };
            combinator.genCSS({ compress: false }, output);
            expect(output.add).toHaveBeenCalledWith(' > ');
        });

        it('should generate CSS without spaces for non-empty combinator when compressed', () => {
            const combinator = new Combinator('>');
            const output = { add: vi.fn() };
            combinator.genCSS({ compress: true }, output);
            expect(output.add).toHaveBeenCalledWith('>');
        });

        it('should generate CSS without spaces for pipe combinator even when not compressed', () => {
            const combinator = new Combinator('|');
            const output = { add: vi.fn() };
            combinator.genCSS({ compress: false }, output);
            expect(output.add).toHaveBeenCalledWith('|');
        });

        it('should handle other common combinators', () => {
            const combinators = ['+', '~', '>>'];
            const output = { add: vi.fn() };

            combinators.forEach((value) => {
                const combinator = new Combinator(value);
                combinator.genCSS({ compress: false }, output);
                expect(output.add).toHaveBeenCalledWith(` ${value} `);
            });
        });

        it('should handle multiple spaces in input', () => {
            const combinator = new Combinator('  >  ');
            const output = { add: vi.fn() };
            combinator.genCSS({ compress: false }, output);
            expect(output.add).toHaveBeenCalledWith(' > ');
        });

        it('should handle special characters in combinator value', () => {
            const combinator = new Combinator('*');
            const output = { add: vi.fn() };
            combinator.genCSS({ compress: false }, output);
            expect(output.add).toHaveBeenCalledWith(' * ');
        });

        it('should handle all special no-space combinators', () => {
            const specialCombinators = ['', ' ', '|'];
            const output = { add: vi.fn() };

            specialCombinators.forEach((value) => {
                const combinator = new Combinator(value);
                combinator.genCSS({ compress: false }, output);
                expect(output.add).toHaveBeenCalledWith(value);
            });
        });

        it('should handle undefined context', () => {
            const combinator = new Combinator('>');
            const output = { add: vi.fn() };
            expect(() => combinator.genCSS(undefined, output)).toThrow();
        });

        it('should handle null context', () => {
            const combinator = new Combinator('>');
            const output = { add: vi.fn() };
            expect(() => combinator.genCSS(null, output)).toThrow();
        });

        it('should handle context with undefined compress property', () => {
            const combinator = new Combinator('>');
            const output = { add: vi.fn() };
            combinator.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith(' > ');
        });

        it('should handle more special combinator characters', () => {
            const specialChars = [
                '/',
                '\\',
                ':',
                ';',
                '!',
                '@',
                '#',
                '$',
                '%',
                '^',
                '&',
                '=',
                '?'
            ];
            const output = { add: vi.fn() };

            specialChars.forEach((value) => {
                const combinator = new Combinator(value);
                combinator.genCSS({ compress: false }, output);
                expect(output.add).toHaveBeenCalledWith(` ${value} `);
            });
        });
    });

    describe('inheritance from Node', () => {
        it('should have Node properties', () => {
            const combinator = new Combinator('>');
            expect(combinator.parent).toBeNull();
            expect(combinator.visibilityBlocks).toBeUndefined();
            expect(combinator.nodeVisible).toBeUndefined();
            expect(combinator.rootNode).toBeNull();
            expect(combinator.parsed).toBeNull();
        });

        it('should be able to set parent', () => {
            const combinator = new Combinator('>');
            const parent = {};
            combinator.setParent(combinator, parent);
            expect(combinator.parent).toBe(parent);
        });

        it('should be able to set parent for array of nodes', () => {
            const combinator1 = new Combinator('>');
            const combinator2 = new Combinator('+');
            const parent = {};
            combinator1.setParent([combinator1, combinator2], parent);
            expect(combinator1.parent).toBe(parent);
            expect(combinator2.parent).toBe(parent);
        });
    });
});
