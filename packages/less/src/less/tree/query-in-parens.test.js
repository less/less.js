import { describe, it, expect, beforeEach } from 'vitest';
import QueryInParens from './query-in-parens';
import Declaration from './declaration';
import Anonymous from './anonymous';
import Value from './value';

describe('QueryInParens', () => {
    let context;
    let query;

    beforeEach(() => {
        context = {
            frames: [],
            importantScope: [],
            math: 0,
            numPrecision: 8
        };
    });

    describe('constructor', () => {
        it('should initialize with basic properties', () => {
            const op = 'and';
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            const op2 = 'or';
            const r = new Anonymous('right');
            const i = 1;

            query = new QueryInParens(op, l, m, op2, r, i);

            expect(query.op).toBe('and');
            expect(query.lvalue).toEqual(l);
            expect(query.mvalue).toEqual(m);
            expect(query.op2).toBe('or');
            expect(query.rvalue).toEqual(r);
            expect(query._index).toBe(1);
            expect(query.mvalues).toEqual([]);
        });

        it('should handle missing op2 and rvalue', () => {
            const op = 'and';
            const l = new Anonymous('left');
            const m = new Anonymous('middle');

            query = new QueryInParens(op, l, m);

            expect(query.op).toBe('and');
            expect(query.lvalue).toEqual(l);
            expect(query.mvalue).toEqual(m);
            expect(query.op2).toBeNull();
            expect(query.rvalue).toBeUndefined();
        });

        it('should handle index parameter', () => {
            const op = 'and';
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            const i = 5;

            query = new QueryInParens(op, l, m, null, null, i);

            expect(query._index).toBe(5);
        });

        it('should trim whitespace from operators', () => {
            const op = '  and  ';
            const op2 = '  or  ';
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            const r = new Anonymous('right');

            query = new QueryInParens(op, l, m, op2, r);

            expect(query.op).toBe('and');
            expect(query.op2).toBe('or');
        });

        it('should handle null/undefined values for l and m', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');

            // The implementation doesn't throw errors for null/undefined values
            const query1 = new QueryInParens('and', null, m);
            const query2 = new QueryInParens('and', l, undefined);

            expect(query1.lvalue).toBeNull();
            expect(query2.mvalue).toBeUndefined();
        });

        it('should handle empty string operators', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('', l, m);
            expect(query.op).toBe('');
        });

        it('should handle non-string operators', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');

            // The implementation requires string operators
            query = new QueryInParens('123', l, m);
            expect(query.op).toBe('123');

            // Test with string representations of other types
            query = new QueryInParens('true', l, m);
            expect(query.op).toBe('true');

            query = new QueryInParens('[object Object]', l, m);
            expect(query.op).toBe('[object Object]');
        });
    });

    describe('eval', () => {
        it('should evaluate lvalue, mvalue, and rvalue', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            const r = new Anonymous('right');
            query = new QueryInParens('and', l, m, 'or', r);

            const result = query.eval(context);

            expect(result).toBe(query);
            expect(result.lvalue).toEqual(l);
            expect(result.mvalue).toEqual(m);
            expect(result.rvalue).toEqual(r);
        });

        it('should handle variable declarations in context', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            const r = new Anonymous('right');
            query = new QueryInParens('and', l, m, 'or', r);

            // Add a variable declaration to the context
            const varDecl = new Declaration(
                '@var',
                new Value([new Anonymous('value')]),
                '',
                false,
                0,
                {},
                false,
                true
            );
            context.frames = [{ type: 'Ruleset', rules: [varDecl] }];

            const result = query.eval(context);

            expect(result).toBe(query);
            expect(result.mvalues).toHaveLength(1);
            expect(result.mvalue).toEqual(result.mvalues[0]);
        });

        it('should maintain mvalueCopy for variable declarations', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            // Add a variable declaration to the context
            const varDecl = new Declaration(
                '@var',
                new Value([new Anonymous('value')]),
                '',
                false,
                0,
                {},
                false,
                true
            );
            context.frames = [{ type: 'Ruleset', rules: [varDecl] }];

            const result = query.eval(context);
            const result2 = query.eval(context);

            expect(result.mvalueCopy).toBeDefined();
            expect(result2.mvalueCopy).toBe(result.mvalueCopy);
        });

        it('should handle empty context frames', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            context.frames = [];
            const result = query.eval(context);

            expect(result).toBe(query);
            expect(result.mvalues).toHaveLength(0);
        });

        it('should handle multiple rulesets with variables', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const varDecl1 = new Declaration(
                '@var1',
                new Value([new Anonymous('value1')]),
                '',
                false,
                0,
                {},
                false,
                true
            );
            const varDecl2 = new Declaration(
                '@var2',
                new Value([new Anonymous('value2')]),
                '',
                false,
                0,
                {},
                false,
                true
            );
            context.frames = [
                { type: 'Ruleset', rules: [varDecl1] },
                { type: 'Ruleset', rules: [varDecl2] }
            ];

            const result = query.eval(context);
            // The implementation only processes the first variable declaration it finds
            expect(result.mvalues).toHaveLength(1);
        });

        it('should handle non-Ruleset frame types', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            context.frames = [{ type: 'OtherType', rules: [] }];
            const result = query.eval(context);

            expect(result).toBe(query);
            expect(result.mvalues).toHaveLength(0);
        });

        it('should handle nested variable declarations', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const varDecl1 = new Declaration(
                '@var1',
                new Value([new Anonymous('value1')]),
                '',
                false,
                0,
                {},
                false,
                true
            );
            const varDecl2 = new Declaration(
                '@var2',
                new Value([new Anonymous('value2')]),
                '',
                false,
                0,
                {},
                false,
                true
            );
            context.frames = [
                { type: 'Ruleset', rules: [varDecl1] },
                { type: 'Ruleset', rules: [varDecl2] }
            ];

            const result = query.eval(context);
            expect(result.mvalues).toHaveLength(1);
        });

        it('should handle invalid mvalueCopy', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);
            query.mvalueCopy = null;

            const result = query.eval(context);
            expect(result.mvalueCopy).toBeDefined();
        });

        it('should handle op2 without rvalue', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m, 'or');

            const result = query.eval(context);
            expect(result.op2).toBe('or');
            expect(result.rvalue).toBeUndefined();
        });
    });

    describe('genCSS', () => {
        it('should generate CSS for basic query', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const output = {
                add: (str) => (output.str = (output.str || '') + str)
            };

            query.genCSS(context, output);
            expect(output.str).toBe('left and middle');
        });

        it('should generate CSS for query with op2 and rvalue', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            const r = new Anonymous('right');
            query = new QueryInParens('and', l, m, 'or', r);

            const output = {
                add: (str) => (output.str = (output.str || '') + str)
            };

            query.genCSS(context, output);
            expect(output.str).toBe('left and middle or right');
        });

        it('should handle mvalues array', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            // Add a variable declaration to the context
            const varDecl = new Declaration(
                '@var',
                new Value([new Anonymous('value')]),
                '',
                false,
                0,
                {},
                false,
                true
            );
            context.frames = [{ type: 'Ruleset', rules: [varDecl] }];

            query.eval(context);
            // Replace the mvalue with a new one from mvalues
            query.mvalue = new Anonymous('new-middle');
            query.mvalues = [query.mvalue];

            const output = {
                add: (str) => (output.str = (output.str || '') + str)
            };

            query.genCSS(context, output);
            expect(output.str).toBe('left and new-middle');
        });

        it('should handle multiple mvalues', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            query.mvalues = [
                new Anonymous('value1'),
                new Anonymous('value2'),
                new Anonymous('value3')
            ];

            const output = {
                add: (str) => (output.str = (output.str || '') + str)
            };

            query.genCSS(context, output);
            expect(output.str).toBe('left and value1');
        });

        it('should handle undefined output', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            // The implementation requires a valid output object with an add method
            expect(() => query.genCSS(context, undefined)).toThrow();
        });

        it('should handle empty mvalues array with undefined mvalue', () => {
            const l = new Anonymous('left');
            query = new QueryInParens('and', l, undefined);
            query.mvalues = [];

            const output = {
                add: (str) => (output.str = (output.str || '') + str)
            };

            expect(() => query.genCSS(context, output)).toThrow();
        });

        it('should handle empty operators after trimming', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('   ', l, m, '   ');

            const output = {
                add: (str) => (output.str = (output.str || '') + str)
            };

            query.genCSS(context, output);
            // The implementation uses a single space for empty operators
            expect(output.str).toBe('left  middle');
        });

        it('should handle output.add throwing error', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const output = {
                add: () => {
                    throw new Error('Test error');
                }
            };

            expect(() => query.genCSS(context, output)).toThrow('Test error');
        });
    });

    describe('accept', () => {
        it('should visit lvalue, mvalue, and rvalue', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            const r = new Anonymous('right');
            query = new QueryInParens('and', l, m, 'or', r);

            const visitor = {
                visit: (node) => {
                    if (node instanceof Anonymous) {
                        return new Anonymous(node.value + '-visited');
                    }
                    return node;
                }
            };

            query.accept(visitor);

            expect(query.lvalue.value).toBe('left-visited');
            expect(query.mvalue.value).toBe('middle-visited');
            expect(query.rvalue.value).toBe('right-visited');
        });

        it('should handle missing rvalue', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const visitor = {
                visit: (node) => {
                    if (node instanceof Anonymous) {
                        return new Anonymous(node.value + '-visited');
                    }
                    return node;
                }
            };

            query.accept(visitor);

            expect(query.lvalue.value).toBe('left-visited');
            expect(query.mvalue.value).toBe('middle-visited');
            expect(query.rvalue).toBeUndefined();
        });

        it('should handle visitor returning null', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const visitor = {
                visit: () => null
            };

            expect(() => query.accept(visitor)).not.toThrow();
        });

        it('should handle visitor returning different node type', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const visitor = {
                visit: () => new Declaration('@var', new Value([]))
            };

            expect(() => query.accept(visitor)).not.toThrow();
        });

        it('should handle visitor throwing error', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const visitor = {
                visit: () => {
                    throw new Error('Test error');
                }
            };

            expect(() => query.accept(visitor)).toThrow('Test error');
        });

        it('should handle visitor returning undefined', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const visitor = {
                visit: () => undefined
            };

            expect(() => query.accept(visitor)).not.toThrow();
        });

        it('should handle visitor modifying node in place', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const visitor = {
                visit: (node) => {
                    if (node instanceof Anonymous) {
                        node.value += '-modified';
                        return node;
                    }
                    return node;
                }
            };

            query.accept(visitor);
            expect(query.lvalue.value).toBe('left-modified');
            expect(query.mvalue.value).toBe('middle-modified');
        });

        it('should handle visitor returning non-Node object', () => {
            const l = new Anonymous('left');
            const m = new Anonymous('middle');
            query = new QueryInParens('and', l, m);

            const visitor = {
                visit: () => ({ notANode: true })
            };

            expect(() => query.accept(visitor)).not.toThrow();
        });
    });
});
