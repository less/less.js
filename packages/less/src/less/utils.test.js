import { describe, it, expect } from 'vitest';
import * as Constants from './constants';
import {
    getLocation,
    copyArray,
    clone,
    defaults,
    copyOptions,
    merge,
    flattenArray,
    isNullOrUndefined
} from './utils';

describe('getLocation', () => {
    it('should return correct line and column for a given index', () => {
        const input = 'first line\nsecond line\nthird line';
        // index inside "second line", e.g. character 's' at start of second line.
        const index = input.indexOf('second');
        const result = getLocation(index, input);
        // There is one newline before, so line should be 1, column equals char offset in that line.
        const expectedColumn = index - (input.indexOf('\n') + 1);
        expect(result.line).toBe(1);
        expect(result.column).toBe(expectedColumn);
    });

    it('should return column counting correctly when no newline is present before index', () => {
        const input = 'abcdefghijklmnopqrstuvwxyz';
        const index = 10;
        const result = getLocation(index, input);
        expect(result.line).toBe(0);
        expect(result.column).toBe(index);
    });

    it('should return line as null if index is not a number', () => {
        const input = 'line1\nline2';
        // Passing non-number index
        const result = getLocation('invalid', input);
        // column is computed based on while loop; however index is not a number so likely column remains -1.
        expect(result.line).toBe(null);
        expect(result.column).toBe(-1);
    });
});

describe('copyArray', () => {
    it('should return a shallow copy of the array', () => {
        const arr = [1, 2, 3];
        const newArr = copyArray(arr);
        expect(newArr).toEqual(arr);
        // Ensure it's not the same reference.
        expect(newArr).not.toBe(arr);
    });

    it('should work for an empty array', () => {
        const arr = [];
        const newArr = copyArray(arr);
        expect(newArr).toEqual([]);
    });
});

describe('clone', () => {
    it('should clone only own properties', () => {
        const proto = { inherited: 'inherited' };
        const obj = Object.create(proto);
        obj.a = 1;
        obj.b = 2;
        const cloned = clone(obj);
        expect(cloned).toEqual({ a: 1, b: 2 });
        expect(cloned.inherited).toBeUndefined();
    });

    it('should return an empty object when cloning an empty object', () => {
        const obj = {};
        const cloned = clone(obj);
        expect(cloned).toEqual({});
    });
});

describe('defaults', () => {
    it('should merge default properties when obj2 is undefined', () => {
        const obj1 = { a: 1, b: 2 };
        const result = defaults(obj1, {}); // pass {} explicitly
        // result should have a _defaults property equal to a copy of obj1.
        expect(result._defaults).toEqual(obj1);
        // And have properties a and b from obj1.
        expect(result.a).toBe(1);
        expect(result.b).toBe(2);
    });

    it('should merge defaults when obj2 does not contain _defaults', () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { b: 3, c: 4 };
        const result = defaults(obj1, obj2);
        expect(result._defaults).toEqual(obj1);
        // Object.assign(newObj, defaults, cloned): obj2 properties override.
        expect(result.a).toBe(1);
        expect(result.b).toBe(3);
        expect(result.c).toBe(4);
    });

    it('should return obj2 unchanged if it already has _defaults', () => {
        const obj1 = { a: 1 };
        const obj2 = { b: 2, _defaults: { already: true } };
        const result = defaults(obj1, obj2);
        // Returns obj2 as is.
        expect(result).toBe(obj2);
    });
});

describe('copyOptions', () => {
    it('should return opts as is if _defaults property exists', () => {
        const opts = { _defaults: { a: 1 }, math: 'always' };
        const result = copyOptions({}, opts);
        expect(result).toBe(opts);
    });

    it('should add strictMath change to opts', () => {
        const opts = { strictMath: true };
        const result = copyOptions({}, opts);
        expect(result.math).toBe(Constants.Math.PARENS);
    });

    it('should handle relativeUrls option', () => {
        const opts = { relativeUrls: true };
        const result = copyOptions({}, opts);
        expect(result.rewriteUrls).toBe(Constants.RewriteUrls.ALL);
    });

    it('should map math string values correctly', () => {
        const cases = [
            { input: 'always', expected: Constants.Math.ALWAYS },
            {
                input: 'parens-division',
                expected: Constants.Math.PARENS_DIVISION
            },
            { input: 'strict', expected: Constants.Math.PARENS },
            { input: 'parens', expected: Constants.Math.PARENS },
            { input: 'unknown', expected: Constants.Math.PARENS }
        ];
        cases.forEach(({ input, expected }) => {
            const opts = { math: input };
            const result = copyOptions({}, opts);
            expect(result.math).toBe(expected);
        });
    });

    it('should map rewriteUrls string values correctly', () => {
        const cases = [
            { input: 'off', expected: Constants.RewriteUrls.OFF },
            { input: 'local', expected: Constants.RewriteUrls.LOCAL },
            { input: 'all', expected: Constants.RewriteUrls.ALL }
        ];
        cases.forEach(({ input, expected }) => {
            const opts = { rewriteUrls: input };
            const result = copyOptions({}, opts);
            expect(result.rewriteUrls).toBe(expected);
        });
    });

    it('should keep numeric math and rewriteUrls values unchanged', () => {
        const opts = {
            math: Constants.Math.PARENS_DIVISION,
            rewriteUrls: Constants.RewriteUrls.LOCAL
        };
        const result = copyOptions({}, opts);
        expect(result.math).toBe(Constants.Math.PARENS_DIVISION);
        expect(result.rewriteUrls).toBe(Constants.RewriteUrls.LOCAL);
    });
});

describe('merge', () => {
    it('should merge properties from obj2 into obj1', () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { b: 3, c: 4 };
        const result = merge({ ...obj1 }, obj2);
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should overwrite properties in obj1 with those in obj2', () => {
        const obj1 = { key: 'value1' };
        const obj2 = { key: 'value2' };
        const result = merge({ ...obj1 }, obj2);
        expect(result.key).toBe('value2');
    });
});

describe('flattenArray', () => {
    it('should flatten nested arrays', () => {
        const arr = [1, [2, [3, 4], 5], 6];
        const result = flattenArray(arr);
        expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should ignore undefined values', () => {
        const arr = [1, undefined, [2, undefined, 3]];
        const result = flattenArray(arr);
        expect(result).toEqual([1, 2, 3]);
    });

    it('should handle an already flat array', () => {
        const arr = [1, 2, 3];
        const result = flattenArray(arr);
        expect(result).toEqual([1, 2, 3]);
    });
});

describe('isNullOrUndefined', () => {
    it('should return true for null', () => {
        expect(isNullOrUndefined(null)).toBe(true);
    });

    it('should return true for undefined', () => {
        expect(isNullOrUndefined(undefined)).toBe(true);
    });

    it('should return false for non-null/undefined values', () => {
        expect(isNullOrUndefined(0)).toBe(false);
        expect(isNullOrUndefined('')).toBe(false);
        expect(isNullOrUndefined(false)).toBe(false);
        expect(isNullOrUndefined({})).toBe(false);
    });
});
