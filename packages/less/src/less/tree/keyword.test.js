import { describe, it, expect, vi } from 'vitest';
import Keyword from './keyword';
import Node from './node';

describe('Keyword', () => {
    it('should store the provided value', () => {
        const keyword = new Keyword('test');
        expect(keyword.value).toBe('test');
    });

    it('should inherit from Node', () => {
        const keyword = new Keyword('test');
        expect(keyword instanceof Node).toBe(true);
    });

    it('should have correct type property', () => {
        const keyword = new Keyword('test');
        expect(keyword.type).toBe('Keyword');
    });

    describe('genCSS', () => {
        it('should add value to output', () => {
            const keyword = new Keyword('test');
            const output = {
                add: vi.fn()
            };

            keyword.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('test');
        });

        it('should throw error for % value', () => {
            const keyword = new Keyword('%');
            const output = {
                add: vi.fn()
            };

            expect(() => keyword.genCSS({}, output)).toThrow(
                'Invalid % without number'
            );
            expect(output.add).not.toHaveBeenCalled();
        });

        it('should handle empty string value', () => {
            const keyword = new Keyword('');
            const output = {
                add: vi.fn()
            };

            keyword.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('');
        });

        it('should handle special characters except %', () => {
            const keyword = new Keyword('$#@!');
            const output = {
                add: vi.fn()
            };

            keyword.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('$#@!');
        });
    });

    describe('predefined keywords', () => {
        it('should have True keyword with value "true"', () => {
            expect(Keyword.True).toBeInstanceOf(Keyword);
            expect(Keyword.True.value).toBe('true');
        });

        it('should have False keyword with value "false"', () => {
            expect(Keyword.False).toBeInstanceOf(Keyword);
            expect(Keyword.False.value).toBe('false');
        });

        it('should ensure True and False are unique instances', () => {
            expect(Keyword.True).not.toBe(Keyword.False);
        });
    });

    describe('Node inheritance behavior', () => {
        it('should inherit Node methods', () => {
            const keyword = new Keyword('test');
            expect(typeof keyword.eval).toBe('function');
            expect(typeof keyword.accept).toBe('function');
            expect(typeof keyword.toCSS).toBe('function');
        });

        it('should maintain Node properties', () => {
            const keyword = new Keyword('test');
            expect(keyword.parent).toBeNull();
            expect(keyword.visibilityBlocks).toBeUndefined();
            expect(keyword.nodeVisible).toBeUndefined();
            expect(keyword.rootNode).toBeNull();
            expect(keyword.parsed).toBeNull();
        });
    });
});
