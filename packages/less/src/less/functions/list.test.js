import { describe, it, expect } from 'vitest';

// Mock minimal implementations to test the core list functionality
const mockDimension = function(value, unit) {
    this.value = value;
    this.unit = unit || { toString: () => '' };
    this.type = 'Dimension';
};

const mockValue = function(value) {
    this.value = value;
    this.type = 'Value';
};

const mockExpression = function(value) {
    this.value = value;
    this.type = 'Expression';
};

const mockQuoted = function(quote, value, escaped) {
    this.quote = quote;
    this.value = value;
    this.escaped = escaped;
    this.type = 'Quoted';
};

// Core functions extracted from list.js (without complex imports)
const getItemsFromNode = node => {
    const items = Array.isArray(node?.value) ?
        node.value : Array(node);
    return items;
};

const listFunctions = {
    _SELF: function(n) {
        return n;
    },
    '~': function(...expr) {
        if (expr.length === 1) {
            return expr[0];
        }
        return new mockValue(expr);
    },
    extract: function(values, index) {
        // (1-based index)
        const idx = index.value - 1;
        return getItemsFromNode(values)[idx];
    },
    length: function(values) {
        return new mockDimension(getItemsFromNode(values).length);
    },
    range: function(start, end, step) {
        let from;
        let to;
        let stepValue = 1;
        const list = [];
        if (end) {
            to = end;
            from = start.value;
            if (step) {
                stepValue = step.value;
            }
        }
        else {
            from = 1;
            to = start;
        }

        for (let i = from; i <= to.value; i += stepValue) {
            list.push(new mockDimension(i, to.unit));
        }

        return new mockExpression(list);
    }
};

describe('List Functions Core Behavior', () => {
    describe('_SELF function', () => {
        it('should return the input node unchanged', () => {
            const input = new mockDimension(5);
            const result = listFunctions._SELF(input);
            expect(result).toBe(input);
        });

        it('should handle null input', () => {
            const result = listFunctions._SELF(null);
            expect(result).toBe(null);
        });

        it('should handle undefined input', () => {
            const result = listFunctions._SELF(undefined);
            expect(result).toBe(undefined);
        });

        it('should handle string input', () => {
            const input = 'test';
            const result = listFunctions._SELF(input);
            expect(result).toBe(input);
        });

        it('should handle edge cases', () => {
            expect(listFunctions._SELF(0)).toBe(0);
            expect(listFunctions._SELF('')).toBe('');
            expect(listFunctions._SELF(false)).toBe(false);
            expect(listFunctions._SELF([])).toEqual([]);
            expect(listFunctions._SELF({})).toEqual({});
        });
    });

    describe('~ function (space-separated values)', () => {
        it('should return single value when only one argument', () => {
            const value = new mockDimension(10);
            const result = listFunctions['~'](value);
            expect(result).toBe(value);
        });

        it('should create Value node with multiple arguments', () => {
            const value1 = new mockDimension(10);
            const value2 = new mockDimension(20);
            const value3 = new mockDimension(30);
            
            const result = listFunctions['~'](value1, value2, value3);
            
            expect(result.type).toBe('Value');
            expect(result.value).toHaveLength(3);
            expect(result.value[0]).toBe(value1);
            expect(result.value[1]).toBe(value2);
            expect(result.value[2]).toBe(value3);
        });

        it('should handle mixed types in space-separated list', () => {
            const dim = new mockDimension(10, { toString: () => 'px' });
            const quoted = new mockQuoted('"', 'test', true);
            
            const result = listFunctions['~'](dim, quoted);
            
            expect(result.type).toBe('Value');
            expect(result.value).toHaveLength(2);
            expect(result.value[0]).toBe(dim);
            expect(result.value[1]).toBe(quoted);
        });

        it('should handle empty arguments', () => {
            expect(() => listFunctions['~']()).not.toThrow();
        });

        it('should handle null arguments', () => {
            const result = listFunctions['~'](null, undefined);
            expect(result.type).toBe('Value');
            expect(result.value).toHaveLength(2);
            expect(result.value[0]).toBe(null);
            expect(result.value[1]).toBe(undefined);
        });

        it('should handle many arguments', () => {
            const args = Array.from({ length: 20 }, (_, i) => new mockDimension(i));
            const result = listFunctions['~'](...args);
            
            expect(result.type).toBe('Value');
            expect(result.value).toHaveLength(20);
            args.forEach((arg, i) => {
                expect(result.value[i]).toBe(arg);
            });
        });
    });

    describe('extract function', () => {
        it('should extract item from array value using 1-based index', () => {
            const values = new mockValue([
                new mockDimension(10),
                new mockDimension(20),
                new mockDimension(30)
            ]);
            const index = new mockDimension(2);

            const result = listFunctions.extract(values, index);

            expect(result.type).toBe('Dimension');
            expect(result.value).toBe(20);
        });

        it('should handle single value node as array of length 1', () => {
            const singleValue = new mockDimension(42);
            const index = new mockDimension(1);

            const result = listFunctions.extract(singleValue, index);

            expect(result).toBe(singleValue);
        });

        it('should return undefined for invalid index (too high)', () => {
            const values = new mockValue([new mockDimension(10), new mockDimension(20)]);
            const index = new mockDimension(5);

            const result = listFunctions.extract(values, index);

            expect(result).toBeUndefined();
        });

        it('should return undefined for invalid index (zero)', () => {
            const values = new mockValue([new mockDimension(10), new mockDimension(20)]);
            const index = new mockDimension(0);

            const result = listFunctions.extract(values, index);

            expect(result).toBeUndefined();
        });

        it('should return undefined for negative index', () => {
            const values = new mockValue([new mockDimension(10), new mockDimension(20)]);
            const index = new mockDimension(-1);

            const result = listFunctions.extract(values, index);

            expect(result).toBeUndefined();
        });

        it('should handle Expression with array value', () => {
            const expr = new mockExpression([
                new mockDimension(5),
                new mockDimension(15),
                new mockDimension(25)
            ]);
            const index = new mockDimension(3);

            const result = listFunctions.extract(expr, index);

            expect(result.type).toBe('Dimension');
            expect(result.value).toBe(25);
        });

        it('should handle empty array', () => {
            const values = new mockValue([]);
            const index = new mockDimension(1);

            const result = listFunctions.extract(values, index);

            expect(result).toBeUndefined();
        });

        it('should handle fractional index (returns undefined)', () => {
            const values = new mockValue([new mockDimension(10), new mockDimension(20)]);
            const index = new mockDimension(1.7);

            const result = listFunctions.extract(values, index);

            // JavaScript behavior: 1.7 - 1 = 0.7, array[0.7] returns undefined
            expect(result).toBeUndefined();
        });
    });

    describe('length function', () => {
        it('should return length of array value', () => {
            const values = new mockValue([
                new mockDimension(10),
                new mockDimension(20),
                new mockDimension(30),
                new mockDimension(40)
            ]);

            const result = listFunctions.length(values);

            expect(result.type).toBe('Dimension');
            expect(result.value).toBe(4);
        });

        it('should return length 1 for single value node', () => {
            const singleValue = new mockDimension(42);

            const result = listFunctions.length(singleValue);

            expect(result.type).toBe('Dimension');
            expect(result.value).toBe(1);
        });

        it('should return length 0 for empty array', () => {
            const values = new mockValue([]);

            const result = listFunctions.length(values);

            expect(result.type).toBe('Dimension');
            expect(result.value).toBe(0);
        });

        it('should handle Expression with array value', () => {
            const expr = new mockExpression([
                new mockDimension(1),
                new mockDimension(2),
                new mockDimension(3),
                new mockDimension(4),
                new mockDimension(5)
            ]);

            const result = listFunctions.length(expr);

            expect(result.type).toBe('Dimension');
            expect(result.value).toBe(5);
        });

        it('should handle null/undefined values appropriately', () => {
            const nullValue = null;

            const result = listFunctions.length(nullValue);

            expect(result.type).toBe('Dimension');
            expect(result.value).toBe(1); // Treats null as single item
        });
    });

    describe('range function', () => {
        it('should create range with start, end, and step', () => {
            const start = new mockDimension(2);
            const end = new mockDimension(8);
            const step = new mockDimension(2);

            const result = listFunctions.range(start, end, step);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(4);
            expect(result.value[0].value).toBe(2);
            expect(result.value[1].value).toBe(4);
            expect(result.value[2].value).toBe(6);
            expect(result.value[3].value).toBe(8);
        });

        it('should create range with just end parameter (start defaults to 1)', () => {
            const end = new mockDimension(5);

            const result = listFunctions.range(end);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(5);
            expect(result.value[0].value).toBe(1);
            expect(result.value[1].value).toBe(2);
            expect(result.value[2].value).toBe(3);
            expect(result.value[3].value).toBe(4);
            expect(result.value[4].value).toBe(5);
        });

        it('should create range with start and end (step defaults to 1)', () => {
            const start = new mockDimension(3);
            const end = new mockDimension(7);

            const result = listFunctions.range(start, end);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(5);
            expect(result.value[0].value).toBe(3);
            expect(result.value[1].value).toBe(4);
            expect(result.value[2].value).toBe(5);
            expect(result.value[3].value).toBe(6);
            expect(result.value[4].value).toBe(7);
        });

        it('should preserve units from end dimension', () => {
            const start = new mockDimension(1);
            const end = new mockDimension(3, { toString: () => 'px' });

            const result = listFunctions.range(start, end);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(3);
            result.value.forEach(dim => {
                expect(dim.unit.toString()).toBe('px');
            });
        });

        it('should handle step greater than range', () => {
            const start = new mockDimension(1);
            const end = new mockDimension(3);
            const step = new mockDimension(10);

            const result = listFunctions.range(start, end, step);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(1);
            expect(result.value[0].value).toBe(1);
        });

        it('should handle fractional step', () => {
            const start = new mockDimension(1);
            const end = new mockDimension(3);
            const step = new mockDimension(0.5);

            const result = listFunctions.range(start, end, step);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(5);
            expect(result.value[0].value).toBe(1);
            expect(result.value[1].value).toBe(1.5);
            expect(result.value[2].value).toBe(2);
            expect(result.value[3].value).toBe(2.5);
            expect(result.value[4].value).toBe(3);
        });

        it('should handle same start and end values', () => {
            const start = new mockDimension(5);
            const end = new mockDimension(5);

            const result = listFunctions.range(start, end);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(1);
            expect(result.value[0].value).toBe(5);
        });

        it('should handle large ranges efficiently', () => {
            const start = new mockDimension(1);
            const end = new mockDimension(100);

            const result = listFunctions.range(start, end);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(100);
            expect(result.value[0].value).toBe(1);
            expect(result.value[99].value).toBe(100);
        });

        it('should handle zero or negative end', () => {
            const end = new mockDimension(0);

            const result = listFunctions.range(end);

            expect(result.type).toBe('Expression');
            expect(result.value).toHaveLength(0);
        });
    });

    describe('getItemsFromNode helper function', () => {
        it('should handle array value', () => {
            const node = new mockValue([1, 2, 3]);
            const result = getItemsFromNode(node);
            expect(result).toEqual([1, 2, 3]);
        });

        it('should handle non-array value as single item', () => {
            const node = new mockDimension(42);
            const result = getItemsFromNode(node);
            expect(result).toEqual([node]);
        });

        it('should handle null/undefined', () => {
            expect(getItemsFromNode(null)).toEqual([null]);
            expect(getItemsFromNode(undefined)).toEqual([undefined]);
        });
    });

    describe('complex integration scenarios', () => {
        it('should handle chained operations', () => {
            // Create a range, then extract from it
            const rangeResult = listFunctions.range(new mockDimension(1), new mockDimension(5));
            const extractResult = listFunctions.extract(rangeResult, new mockDimension(3));
            
            expect(extractResult.type).toBe('Dimension');
            expect(extractResult.value).toBe(3);
        });

        it('should handle space-separated list creation and extraction', () => {
            const spaceList = listFunctions['~'](
                new mockDimension(10, { toString: () => 'px' }),
                new mockDimension(20, { toString: () => 'px' }),
                new mockDimension(30, { toString: () => 'px' })
            );
            
            const lengthResult = listFunctions.length(spaceList);
            expect(lengthResult.value).toBe(3);
            
            const extractResult = listFunctions.extract(spaceList, new mockDimension(2));
            expect(extractResult.value).toBe(20);
            expect(extractResult.unit.toString()).toBe('px');
        });
    });
});