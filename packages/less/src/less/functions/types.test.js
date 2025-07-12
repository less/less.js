import { describe, it, expect } from 'vitest';
import Keyword from '../tree/keyword';
import DetachedRuleset from '../tree/detached-ruleset';
import Dimension from '../tree/dimension';
import Color from '../tree/color';
import Quoted from '../tree/quoted';
import Anonymous from '../tree/anonymous';
import URL from '../tree/url';
import Operation from '../tree/operation';
import types from './types';

describe('types.js', () => {
    describe('isruleset', () => {
        it('should return True for DetachedRuleset', () => {
            const ruleset = new DetachedRuleset();
            const result = types.isruleset(ruleset);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-DetachedRuleset', () => {
            const color = new Color([255, 0, 0]);
            const result = types.isruleset(color);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('iscolor', () => {
        it('should return True for Color', () => {
            const color = new Color([255, 0, 0]);
            const result = types.iscolor(color);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-Color', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.iscolor(dimension);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('isnumber', () => {
        it('should return True for Dimension', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.isnumber(dimension);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-Dimension', () => {
            const color = new Color([255, 0, 0]);
            const result = types.isnumber(color);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('isstring', () => {
        it('should return True for Quoted', () => {
            const quoted = new Quoted('"hello"', 'hello');
            const result = types.isstring(quoted);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-Quoted', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.isstring(dimension);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('iskeyword', () => {
        it('should return True for Keyword', () => {
            const keyword = new Keyword('auto');
            const result = types.iskeyword(keyword);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-Keyword', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.iskeyword(dimension);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('isurl', () => {
        it('should return True for URL', () => {
            const url = new URL(new Quoted('"http://example.com"', 'http://example.com'));
            const result = types.isurl(url);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-URL', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.isurl(dimension);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('ispixel', () => {
        it('should return True for pixel dimension', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.ispixel(dimension);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-pixel dimension', () => {
            const dimension = new Dimension(10, 'em');
            const result = types.ispixel(dimension);
            expect(result).toBe(Keyword.False);
        });

        it('should return False for non-Dimension', () => {
            const color = new Color([255, 0, 0]);
            const result = types.ispixel(color);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('ispercentage', () => {
        it('should return True for percentage dimension', () => {
            const dimension = new Dimension(50, '%');
            const result = types.ispercentage(dimension);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-percentage dimension', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.ispercentage(dimension);
            expect(result).toBe(Keyword.False);
        });

        it('should return False for non-Dimension', () => {
            const color = new Color([255, 0, 0]);
            const result = types.ispercentage(color);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('isem', () => {
        it('should return True for em dimension', () => {
            const dimension = new Dimension(2, 'em');
            const result = types.isem(dimension);
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-em dimension', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.isem(dimension);
            expect(result).toBe(Keyword.False);
        });

        it('should return False for non-Dimension', () => {
            const color = new Color([255, 0, 0]);
            const result = types.isem(color);
            expect(result).toBe(Keyword.False);
        });
    });

    describe('isunit', () => {
        it('should return True for matching unit', () => {
            const dimension = new Dimension(10, 'rem');
            const result = types.isunit(dimension, 'rem');
            expect(result).toBe(Keyword.True);
        });

        it('should return False for non-matching unit', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.isunit(dimension, 'em');
            expect(result).toBe(Keyword.False);
        });

        it('should return False for non-Dimension', () => {
            const color = new Color([255, 0, 0]);
            const result = types.isunit(color, 'px');
            expect(result).toBe(Keyword.False);
        });

        it('should accept unit as object with value property', () => {
            const dimension = new Dimension(10, 'px');
            const unitObj = { value: 'px' };
            const result = types.isunit(dimension, unitObj);
            expect(result).toBe(Keyword.True);
        });

        it('should throw error when unit is undefined', () => {
            const dimension = new Dimension(10, 'px');
            expect(() => types.isunit(dimension, undefined)).toThrow(
                expect.objectContaining({
                    type: 'Argument',
                    message: 'missing the required second argument to isunit.'
                })
            );
        });

        it('should throw error when unit is not string or object with value', () => {
            const dimension = new Dimension(10, 'px');
            expect(() => types.isunit(dimension, 123)).toThrow(
                expect.objectContaining({
                    type: 'Argument',
                    message: 'Second argument to isunit should be a unit or a string.'
                })
            );
        });
    });

    describe('unit', () => {
        it('should create new Dimension with specified unit', () => {
            const dimension = new Dimension(10, 'px');
            const unitQuoted = new Quoted('"em"', 'em');
            const result = types.unit(dimension, unitQuoted);
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(10);
            expect(result.unit.toString()).toBe('em');
        });

        it('should create unitless Dimension when unit is not provided', () => {
            const dimension = new Dimension(10, 'px');
            const result = types.unit(dimension);
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(10);
            expect(result.unit.toString()).toBe('');
        });

        it('should handle Keyword unit', () => {
            const dimension = new Dimension(10, 'px');
            const unit = new Keyword('em');
            const result = types.unit(dimension, unit);
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(10);
            expect(result.unit.toString()).toBe('em');
        });

        it('should handle unit with toCSS method', () => {
            const dimension = new Dimension(10, 'px');
            const unit = { toCSS: () => 'rem' };
            const result = types.unit(dimension, unit);
            expect(result).toBeInstanceOf(Dimension);
            expect(result.value).toBe(10);
            expect(result.unit.toString()).toBe('rem');
        });

        it('should throw error for non-Dimension input', () => {
            const color = new Color([255, 0, 0]);
            expect(() => types.unit(color, 'px')).toThrow(
                expect.objectContaining({
                    type: 'Argument',
                    message: 'the first argument to unit must be a number'
                })
            );
        });

        it('should throw error for Operation input with helpful message', () => {
            const operation = new Operation('+', [new Dimension(1), new Dimension(2)]);
            expect(() => types.unit(operation, 'px')).toThrow(
                expect.objectContaining({
                    type: 'Argument',
                    message: 'the first argument to unit must be a number. Have you forgotten parenthesis?'
                })
            );
        });
    });

    describe('get-unit', () => {
        it('should return Anonymous with unit', () => {
            const dimension = new Dimension(10, 'px');
            const result = types['get-unit'](dimension);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe(dimension.unit);
        });

        it('should work with unitless dimension', () => {
            const dimension = new Dimension(10);
            const result = types['get-unit'](dimension);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe(dimension.unit);
        });
    });
});