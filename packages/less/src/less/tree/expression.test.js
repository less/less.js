import { describe, it, expect, vi } from 'vitest';
import Expression from './expression';
import Paren from './paren';
import Comment from './comment';
import Dimension from './dimension';
import Anonymous from './anonymous';

describe('Expression', () => {
    // Helper function to create a basic context
    const createContext = (mathOn = false) => ({
        isMathOn: () => mathOn,
        inParenthesis: () => {},
        outOfParenthesis: () => {},
        inCalc: false
    });

    describe('constructor', () => {
        it('should throw error when constructed without value array', () => {
            expect(() => new Expression()).toThrow(
                'Expression requires an array parameter'
            );
            expect(() => new Expression(null)).toThrow(
                'Expression requires an array parameter'
            );
        });

        it('should accept empty array', () => {
            expect(() => new Expression([])).not.toThrow();
            const expr = new Expression([]);
            expect(expr.value).toEqual([]);
        });

        it('should store value and noSpacing properties', () => {
            const value = [new Anonymous('test')];
            const expr = new Expression(value, true);
            expect(expr.value).toBe(value);
            expect(expr.noSpacing).toBe(true);
        });

        it('should handle noSpacing with empty array', () => {
            const expr = new Expression([], true);
            expect(expr.value).toEqual([]);
            expect(expr.noSpacing).toBe(true);
        });
    });

    describe('eval', () => {
        it('should return same expression when empty', () => {
            const expr = new Expression([]);
            const result = expr.eval(createContext());
            expect(result).toBe(expr);
        });

        it('should eval single value without parens', () => {
            const anonymous = new Anonymous('test');
            const expr = new Expression([anonymous]);
            const result = expr.eval(createContext());
            expect(result).toEqual(anonymous.eval(createContext()));
        });

        it('should wrap result in Paren when has parens and parensInOp', () => {
            const anonymous = new Anonymous('test');
            const expr = new Expression([anonymous]);
            expr.parens = true;
            expr.parensInOp = true;
            const result = expr.eval(createContext());
            expect(result).toBeInstanceOf(Paren);
            expect(result.value).toEqual(anonymous.eval(createContext()));
        });

        it('should not wrap result in Paren when math mode is on', () => {
            const anonymous = new Anonymous('test');
            const expr = new Expression([anonymous]);
            expr.parens = true;
            expr.parensInOp = true;
            const result = expr.eval(createContext(true)); // mathOn = true
            expect(result).not.toBeInstanceOf(Paren);
            expect(result).toEqual(anonymous.eval(createContext(true)));
        });

        it('should handle double paren case', () => {
            const innerExpr = new Expression([new Anonymous('test')]);
            innerExpr.parens = true;
            innerExpr.parensInOp = false;

            const expr = new Expression([innerExpr]);
            const context = createContext();
            const result = expr.eval(context);
            expect(result).toEqual(new Anonymous('test'));
        });

        it('should handle double paren case in calc context', () => {
            const innerExpr = new Expression([new Anonymous('test')]);
            innerExpr.parens = true;
            innerExpr.parensInOp = false;

            const expr = new Expression([innerExpr]);
            const context = { ...createContext(), inCalc: true };
            const result = expr.eval(context);
            expect(result).toEqual(new Anonymous('test'));
        });

        it('should handle multiple nested expressions', () => {
            const innermost = new Expression([new Anonymous('test')]);
            const middle = new Expression([innermost, new Anonymous('middle')]);
            const outer = new Expression([middle, new Anonymous('outer')]);

            const result = outer.eval(createContext());
            expect(result).toBeInstanceOf(Expression);
            expect(result.value).toHaveLength(2);
            // First value should be the evaluated middle expression
            const evaluatedMiddle = result.value[0];
            expect(evaluatedMiddle).toBeInstanceOf(Expression);
            expect(evaluatedMiddle.value).toHaveLength(2);
            expect(evaluatedMiddle.value[0]).toEqual(new Anonymous('test'));
            expect(evaluatedMiddle.value[1].value).toBe('middle');
            // Second value should be the outer anonymous node
            expect(result.value[1].value).toBe('outer');
        });

        it('should preserve non-evaluatable values', () => {
            const nonEvaluatable = { type: 'NonEvaluatable' };
            const expr = new Expression([
                nonEvaluatable,
                new Anonymous('test')
            ]);
            const result = expr.eval(createContext());
            expect(result.value[0]).toBe(nonEvaluatable);
            expect(result.value[1].value).toBe('test');
        });

        it('should handle mix of evaluatable and non-evaluatable values', () => {
            const nonEval1 = { type: 'NonEval1' };
            const nonEval2 = { type: 'NonEval2' };
            const anonymous = new Anonymous('test');
            const dimension = new Dimension('5', 'px');

            const expr = new Expression([
                nonEval1,
                anonymous,
                nonEval2,
                dimension
            ]);
            const result = expr.eval(createContext());

            expect(result.value[0]).toBe(nonEval1);
            expect(result.value[1].value).toBe('test');
            expect(result.value[2]).toBe(nonEval2);
            expect(result.value[3]).toEqual(dimension);
        });

        it('should not wrap Dimension in Paren even with parens and parensInOp', () => {
            const dimension = new Dimension('5', 'px');
            const expr = new Expression([dimension]);
            expr.parens = true;
            expr.parensInOp = true;
            const result = expr.eval(createContext());
            expect(result).not.toBeInstanceOf(Paren);
            expect(result).toEqual(dimension);
        });

        it('should eval multiple values', () => {
            const dim1 = new Dimension('5', 'px');
            const dim2 = new Dimension('10', 'px');
            const expr = new Expression([dim1, dim2]);
            const result = expr.eval(createContext());
            expect(result).toBeInstanceOf(Expression);
            expect(result.value).toHaveLength(2);
            expect(result.value[0]).toEqual(dim1);
            expect(result.value[1]).toEqual(dim2);
        });

        it('should handle mixed values with different paren settings', () => {
            const anonymous1 = new Anonymous('test1');
            const anonymous2 = new Anonymous('test2');
            const innerExpr = new Expression([anonymous2]);
            innerExpr.parens = true;
            innerExpr.parensInOp = true;

            const expr = new Expression([anonymous1, innerExpr]);
            const result = expr.eval(createContext());

            expect(result).toBeInstanceOf(Expression);
            expect(result.value).toHaveLength(2);
            expect(result.value[0]).toEqual(anonymous1);
            expect(result.value[1]).toBeInstanceOf(Paren);
        });

        it('should handle nested parenthesis context', () => {
            const dim = new Dimension('5', 'px');
            const expr = new Expression([dim]);
            expr.parens = true;
            let inParenCount = 0;
            let outParenCount = 0;
            const context = {
                ...createContext(),
                inParenthesis: () => {
                    inParenCount++;
                },
                outOfParenthesis: () => {
                    outParenCount++;
                }
            };
            expr.eval(context);
            expect(inParenCount).toBe(1);
            expect(outParenCount).toBe(1);
        });

        it('should handle calc context', () => {
            const anonymous = new Anonymous('test');
            const expr = new Expression([anonymous]);
            expr.parens = true;
            expr.parensInOp = true;
            const context = { ...createContext(), inCalc: true };
            const result = expr.eval(context);
            expect(result).toBeInstanceOf(Paren);
            expect(result.value).toEqual(anonymous.eval(context));
        });

        it('should not wrap in Paren when has parensInOp but no parens', () => {
            const anonymous = new Anonymous('test');
            const expr = new Expression([anonymous]);
            expr.parensInOp = true; // parens not set
            const result = expr.eval(createContext());
            expect(result).not.toBeInstanceOf(Paren);
            expect(result).toEqual(anonymous.eval(createContext()));
        });

        it('should handle value[0].parens without parensInOp in calc context', () => {
            const innerExpr = new Expression([new Anonymous('test')]);
            innerExpr.parens = true; // but no parensInOp

            const expr = new Expression([innerExpr]);
            const context = { ...createContext(), inCalc: true };
            const result = expr.eval(context);
            expect(result).toEqual(new Anonymous('test'));
        });

        it('should handle nested expressions with mathOn=true', () => {
            const innerExpr = new Expression([new Anonymous('test')]);
            innerExpr.parens = true;
            innerExpr.parensInOp = true;

            const expr = new Expression([innerExpr]);
            const result = expr.eval(createContext(true));
            expect(result).toEqual(new Anonymous('test'));
        });

        it('should handle value[0].parens with inCalc=true', () => {
            const innerExpr = new Expression([new Anonymous('test')]);
            innerExpr.parens = true;

            const expr = new Expression([innerExpr]);
            const context = { ...createContext(), inCalc: true };
            const result = expr.eval(context);
            expect(result).toEqual(new Anonymous('test'));
        });
    });

    describe('genCSS', () => {
        it('should generate CSS for empty expression', () => {
            const expr = new Expression([]);
            const output = { add: vi.fn() };
            expr.genCSS({}, output);
            expect(output.add).not.toHaveBeenCalled();
        });

        it('should generate CSS for single value', () => {
            const expr = new Expression([new Anonymous('test')]);
            const output = { add: vi.fn() };
            expr.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith(
                'test',
                undefined,
                undefined,
                undefined
            );
        });

        it('should add spaces between values when noSpacing is false', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual(['test1', ' ', 'test2']);
        });

        it('should not add spaces when noSpacing is true', () => {
            const expr = new Expression(
                [new Anonymous('test1'), new Anonymous('test2')],
                true
            );
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual(['test1', 'test2']);
        });

        it('should not add space before comma', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Anonymous(','),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual(['test1', ',', ' ', 'test2']);
        });

        it('should handle multiple consecutive commas', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Anonymous(','),
                new Anonymous(','),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual(['test1', ',', ',', ' ', 'test2']);
        });

        it('should handle spacing with non-Anonymous nodes', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Dimension('5', 'px'),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual(['test1', ' ', '5', 'px', ' ', 'test2']);
        });

        it('should handle mixed node types with commas', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Anonymous(','),
                new Dimension('5', 'px'),
                new Anonymous(','),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual([
                'test1',
                ',',
                ' ',
                '5',
                'px',
                ',',
                ' ',
                'test2'
            ]);
        });

        it('should handle comments before they are thrown away', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Comment('/* comment */', false),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual([
                'test1',
                ' ',
                '/* comment */',
                ' ',
                'test2'
            ]);
        });

        it('should handle empty string Anonymous nodes', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Anonymous(''),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            // Empty string nodes are ignored but still affect spacing
            expect(calls).toEqual(['test1', ' ', ' ', 'test2']);
        });

        it('should handle consecutive empty string Anonymous nodes', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Anonymous(''),
                new Anonymous(''),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            // Multiple empty strings result in multiple spaces
            expect(calls).toEqual(['test1', ' ', ' ', ' ', 'test2']);
        });

        it('should handle empty string at start and end', () => {
            const expr = new Expression([
                new Anonymous(''),
                new Anonymous('test'),
                new Anonymous('')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            // Empty strings at boundaries add spaces
            expect(calls).toEqual([' ', 'test', ' ']);
        });

        it('should handle empty string nodes with noSpacing=true', () => {
            const expr = new Expression(
                [
                    new Anonymous('test1'),
                    new Anonymous(''),
                    new Anonymous('test2')
                ],
                true
            );
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            // With noSpacing, empty strings are completely ignored
            expect(calls).toEqual(['test1', 'test2']);
        });

        it('should handle multiple consecutive spaces in values', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Anonymous('   '),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual(['test1', ' ', '   ', ' ', 'test2']);
        });

        it('should handle line comments', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Comment('// line comment', true),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual([
                'test1',
                ' ',
                '// line comment',
                ' ',
                'test2'
            ]);
        });

        it('should handle mixed comment types', () => {
            const expr = new Expression([
                new Anonymous('test1'),
                new Comment('// line comment', true),
                new Comment('/* block comment */', false),
                new Anonymous('test2')
            ]);
            const calls = [];
            const output = { add: (val) => calls.push(val) };
            expr.genCSS({}, output);
            expect(calls).toEqual([
                'test1',
                ' ',
                '// line comment',
                ' ',
                '/* block comment */',
                ' ',
                'test2'
            ]);
        });
    });

    describe('throwAwayComments', () => {
        it('should remove all Comment nodes', () => {
            const anonymous = new Anonymous('test');
            const comment = new Comment('/* comment */', false);
            const expr = new Expression([anonymous, comment]);
            expr.throwAwayComments();
            expect(expr.value).toHaveLength(1);
            expect(expr.value[0]).toBe(anonymous);
        });

        it('should preserve non-Comment nodes', () => {
            const anonymous1 = new Anonymous('test1');
            const anonymous2 = new Anonymous('test2');
            const comment = new Comment('/* comment */', false);
            const expr = new Expression([anonymous1, comment, anonymous2]);
            expr.throwAwayComments();
            expect(expr.value).toHaveLength(2);
            expect(expr.value[0]).toBe(anonymous1);
            expect(expr.value[1]).toBe(anonymous2);
        });

        it('should handle multiple comments between values', () => {
            const anonymous1 = new Anonymous('test1');
            const anonymous2 = new Anonymous('test2');
            const comment1 = new Comment('/* comment1 */', false);
            const comment2 = new Comment('/* comment2 */', false);
            const expr = new Expression([
                anonymous1,
                comment1,
                comment2,
                anonymous2
            ]);
            expr.throwAwayComments();
            expect(expr.value).toHaveLength(2);
            expect(expr.value[0]).toBe(anonymous1);
            expect(expr.value[1]).toBe(anonymous2);
        });

        it('should handle mix of line and block comments', () => {
            const anonymous1 = new Anonymous('test1');
            const anonymous2 = new Anonymous('test2');
            const lineComment = new Comment('// line comment', true);
            const blockComment = new Comment('/* block comment */', false);
            const expr = new Expression([
                anonymous1,
                lineComment,
                blockComment,
                anonymous2
            ]);
            expr.throwAwayComments();
            expect(expr.value).toHaveLength(2);
            expect(expr.value[0]).toBe(anonymous1);
            expect(expr.value[1]).toBe(anonymous2);
        });

        it('should handle all comment nodes', () => {
            const comment1 = new Comment('// comment1', true);
            const comment2 = new Comment('/* comment2 */', false);
            const expr = new Expression([comment1, comment2]);
            expr.throwAwayComments();
            expect(expr.value).toHaveLength(0);
        });
    });
});
