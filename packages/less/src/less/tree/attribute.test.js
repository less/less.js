import { describe, it, expect, vi } from 'vitest';
import Attribute from './attribute';

describe('Attribute', () => {
    it('should create an attribute with key, operator, and value', () => {
        const attr = new Attribute('data-test', '=', 'value');
        expect(attr.key).toBe('data-test');
        expect(attr.op).toBe('=');
        expect(attr.value).toBe('value');
        expect(attr.cif).toBeUndefined();
    });

    it('should create an attribute with key, operator, value, and cif', () => {
        const attr = new Attribute('data-test', '=', 'value', 'if (condition)');
        expect(attr.key).toBe('data-test');
        expect(attr.op).toBe('=');
        expect(attr.value).toBe('value');
        expect(attr.cif).toBe('if (condition)');
    });

    it('should evaluate key and value when they are evaluable', () => {
        const context = {
            variables: { key: 'data-test', value: 'test-value' }
        };
        const evaluableKey = { eval: (ctx) => ctx.variables.key };
        const evaluableValue = { eval: (ctx) => ctx.variables.value };

        const attr = new Attribute(evaluableKey, '=', evaluableValue);
        const evaluated = attr.eval(context);

        expect(evaluated.key).toBe('data-test');
        expect(evaluated.value).toBe('test-value');
    });

    it('should not evaluate non-evaluable key and value', () => {
        const context = { variables: {} };
        const attr = new Attribute('data-test', '=', 'value');
        const evaluated = attr.eval(context);

        expect(evaluated.key).toBe('data-test');
        expect(evaluated.value).toBe('value');
    });

    it('should generate CSS with key only when no operator is present', () => {
        const attr = new Attribute('data-test');
        expect(attr.toCSS()).toBe('[data-test]');
    });

    it('should generate CSS with key and value when operator is present', () => {
        const attr = new Attribute('data-test', '=', 'value');
        expect(attr.toCSS()).toBe('[data-test=value]');
    });

    it('should generate CSS with key, value, and cif when present', () => {
        const attr = new Attribute('data-test', '=', 'value', 'if (condition)');
        expect(attr.toCSS()).toBe('[data-test=value if (condition)]');
    });

    it('should handle evaluable key and value in toCSS', () => {
        const context = {
            variables: { key: 'data-test', value: 'test-value' }
        };
        const evaluableKey = {
            eval: (ctx) => ctx.variables.key,
            toCSS: (ctx) => ctx.variables.key
        };
        const evaluableValue = {
            eval: (ctx) => ctx.variables.value,
            toCSS: (ctx) => ctx.variables.value
        };

        const attr = new Attribute(evaluableKey, '=', evaluableValue);
        expect(attr.toCSS(context)).toBe('[data-test=test-value]');
    });

    it('should add CSS to output in genCSS', () => {
        const attr = new Attribute('data-test', '=', 'value');
        const output = { add: vi.fn() };
        attr.genCSS({}, output);
        expect(output.add).toHaveBeenCalledWith('[data-test=value]');
    });

    it('should handle empty string values', () => {
        const attr = new Attribute('data-test', '=', '');
        expect(attr.toCSS()).toBe('[data-test=]');
    });

    it('should handle special characters in key and value', () => {
        const attr = new Attribute('data-test[0]', '=', 'value with spaces');
        expect(attr.toCSS()).toBe('[data-test[0]=value with spaces]');
    });

    it('should handle different operators', () => {
        const operators = ['=', '~=', '|=', '^=', '$=', '*='];
        operators.forEach((op) => {
            const attr = new Attribute('data-test', op, 'value');
            expect(attr.toCSS()).toBe(`[data-test${op}value]`);
        });
    });

    it('should handle evaluable key with toCSS but without eval', () => {
        const context = { variables: { key: 'data-test' } };
        const evaluableKey = { toCSS: (ctx) => ctx.variables.key };
        const attr = new Attribute(evaluableKey, '=', 'value');
        expect(attr.toCSS(context)).toBe('[data-test=value]');
    });

    it('should handle evaluable value with toCSS but without eval', () => {
        const context = { variables: { value: 'test-value' } };
        const evaluableValue = { toCSS: (ctx) => ctx.variables.value };
        const attr = new Attribute('data-test', '=', evaluableValue);
        expect(attr.toCSS(context)).toBe('[data-test=test-value]');
    });

    it('should preserve operator in eval when key and value are not evaluable', () => {
        const context = { variables: {} };
        const attr = new Attribute('data-test', '~=', 'value');
        const evaluated = attr.eval(context);
        expect(evaluated.op).toBe('~=');
    });

    it('should handle empty context in eval', () => {
        const attr = new Attribute('data-test', '=', 'value');
        const evaluated = attr.eval();
        expect(evaluated.key).toBe('data-test');
        expect(evaluated.value).toBe('value');
    });

    it('should handle undefined context in toCSS', () => {
        const attr = new Attribute('data-test', '=', 'value');
        expect(attr.toCSS(undefined)).toBe('[data-test=value]');
    });

    it('should handle null context in toCSS', () => {
        const attr = new Attribute('data-test', '=', 'value');
        expect(attr.toCSS(null)).toBe('[data-test=value]');
    });

    it('should handle null/undefined key', () => {
        const attr = new Attribute(null, '=', 'value');
        expect(() => attr.toCSS()).toThrow(
            "Cannot read properties of null (reading 'toCSS')"
        );

        const attr2 = new Attribute(undefined, '=', 'value');
        expect(() => attr2.toCSS()).toThrow(
            "Cannot read properties of undefined (reading 'toCSS')"
        );
    });

    it('should handle null/undefined value', () => {
        const attr = new Attribute('data-test', '=', null);
        expect(() => attr.toCSS()).toThrow(
            "Cannot read properties of null (reading 'toCSS')"
        );

        const attr2 = new Attribute('data-test', '=', undefined);
        expect(() => attr2.toCSS()).toThrow(
            "Cannot read properties of undefined (reading 'toCSS')"
        );
    });

    it('should handle null/undefined operator', () => {
        const attr = new Attribute('data-test', null, 'value');
        expect(attr.toCSS()).toBe('[data-test]');

        const attr2 = new Attribute('data-test', undefined, 'value');
        expect(attr2.toCSS()).toBe('[data-test]');
    });

    it('should handle evaluable object with only eval method', () => {
        const context = { variables: { key: 'data-test' } };
        const evaluableKey = { eval: (ctx) => ctx.variables.key };
        const attr = new Attribute(evaluableKey, '=', 'value');
        const evaluated = attr.eval(context);
        expect(evaluated.key).toBe('data-test');
        expect(evaluated.toCSS()).toBe('[data-test=value]');
    });

    it('should handle evaluable object with only toCSS method', () => {
        const context = { variables: { key: 'data-test' } };
        const evaluableKey = { toCSS: (ctx) => ctx.variables.key };
        const attr = new Attribute(evaluableKey, '=', 'value');
        expect(attr.toCSS(context)).toBe('[data-test=value]');
    });

    it('should handle special characters in cif condition', () => {
        const attr = new Attribute(
            'data-test',
            '=',
            'value',
            'if (condition && value > 0)'
        );
        expect(attr.toCSS()).toBe(
            '[data-test=value if (condition && value > 0)]'
        );
    });

    it('should handle whitespace in various positions', () => {
        const attr = new Attribute(' data-test ', '=', ' value ');
        expect(attr.toCSS()).toBe('[ data-test = value ]');
    });

    it('should handle very long key/value combinations', () => {
        const longKey = 'data-' + 'x'.repeat(1000);
        const longValue = 'value-' + 'y'.repeat(1000);
        const attr = new Attribute(longKey, '=', longValue);
        expect(attr.toCSS()).toBe(`[${longKey}=${longValue}]`);
    });

    it('should handle malformed evaluable objects gracefully', () => {
        const malformedKey = { eval: null };
        const attr = new Attribute(malformedKey, '=', 'value');
        expect(attr.toCSS()).toBe('[[object Object]=value]');
    });

    it('should handle invalid operator values', () => {
        const attr = new Attribute('data-test', 'invalid', 'value');
        expect(attr.toCSS()).toBe('[data-testinvalidvalue]');
    });
});
