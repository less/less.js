import { describe, it, expect, beforeEach } from 'vitest';
import parserInputFactory from './parser-input';

describe('parser-input', () => {
    let parserInput;

    beforeEach(() => {
        parserInput = parserInputFactory();
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(parserInput.autoCommentAbsorb).toBe(true);
            expect(parserInput.commentStore).toEqual([]);
            expect(parserInput.finished).toBe(false);
        });
    });

    describe('start method', () => {
        it('should initialize with input string', () => {
            parserInput.start('test string');
            expect(parserInput.getInput()).toBe('test string');
            expect(parserInput.i).toBe(0);
        });

        it('should skip leading whitespace on start', () => {
            parserInput.start('  test string');
            expect(parserInput.i).toBe(2);
        });

        it('should handle chunked input', () => {
            parserInput.start('test string', true);
            expect(parserInput.getInput()).toBe('test string');
        });
    });

    describe('$re method', () => {
        beforeEach(() => {
            parserInput.start('test123');
        });

        it('should match regex pattern', () => {
            const result = parserInput.$re(/test/);
            expect(result).toBe('test');
            expect(parserInput.i).toBe(4);
        });

        it('should return null for no match', () => {
            const result = parserInput.$re(/xyz/);
            expect(result).toBeNull();
            expect(parserInput.i).toBe(0);
        });
    });

    describe('$char method', () => {
        beforeEach(() => {
            parserInput.start('test');
        });

        it('should match single character', () => {
            const result = parserInput.$char('t');
            expect(result).toBe('t');
            expect(parserInput.i).toBe(1);
        });

        it('should return null for no match', () => {
            const result = parserInput.$char('x');
            expect(result).toBeNull();
            expect(parserInput.i).toBe(0);
        });
    });

    describe('$str method', () => {
        beforeEach(() => {
            parserInput.start('test string');
        });

        it('should match exact string', () => {
            const result = parserInput.$str('test');
            expect(result).toBe('test');
            expect(parserInput.i).toBe(5);
        });

        it('should return null for no match', () => {
            const result = parserInput.$str('xyz');
            expect(result).toBeNull();
            expect(parserInput.i).toBe(0);
        });
    });

    describe('$quoted method', () => {
        it('should parse single quoted string', () => {
            parserInput.start("'test'");
            const result = parserInput.$quoted();
            expect(result).toBe("'test'");
            expect(parserInput.i).toBe(6);
        });

        it('should parse double quoted string', () => {
            parserInput.start('"test"');
            const result = parserInput.$quoted();
            expect(result).toBe('"test"');
            expect(parserInput.i).toBe(6);
        });

        it('should handle escaped quotes', () => {
            parserInput.start('"test\\"test"');
            const result = parserInput.$quoted();
            expect(result).toBe('"test\\"test"');
            expect(parserInput.i).toBe(12);
        });

        it('should return null for unclosed quotes', () => {
            parserInput.start('"test');
            const result = parserInput.$quoted();
            expect(result).toBeNull();
            expect(parserInput.i).toBe(0);
        });
    });

    describe('$parseUntil method', () => {
        it('should parse until matching character', () => {
            parserInput.start('test;end');
            const result = parserInput.$parseUntil(';');
            expect(result).toEqual(['test']);
            expect(parserInput.i).toBe(4);
        });

        it('should return null if token not found', () => {
            parserInput.start('test { block }');
            const result = parserInput.$parseUntil(';');
            expect(result).toBeNull();
        });
    });

    describe('peek methods', () => {
        beforeEach(() => {
            parserInput.start('test');
        });

        it('should peek at next character without consuming', () => {
            expect(parserInput.peek('t')).toBe(true);
            expect(parserInput.i).toBe(0);
        });

        it('should peek at current character', () => {
            expect(parserInput.currentChar()).toBe('t');
        });

        it('should peek at previous character', () => {
            parserInput.i = 1;
            expect(parserInput.prevChar()).toBe('t');
        });
    });

    describe('save and restore', () => {
        beforeEach(() => {
            parserInput.start('test string');
        });

        it('should save and restore parser state', () => {
            parserInput.save();
            parserInput.i = 5;
            parserInput.restore();
            expect(parserInput.i).toBe(0);
        });

        it('should track furthest position with error message', () => {
            parserInput.save();
            parserInput.i = 5;
            parserInput.restore('test error');
            expect(parserInput.i).toBe(0);
            const endState = parserInput.end();
            expect(endState.furthest).toBe(5);
            expect(endState.furthestPossibleErrorMessage).toBe('test error');
        });

        it('should forget saved state', () => {
            parserInput.save();
            parserInput.i = 5;
            parserInput.forget();
            expect(() => parserInput.restore()).toThrow();
        });
    });

    describe('end method', () => {
        it('should return correct end state when finished', () => {
            parserInput.start('test');
            parserInput.i = 4;
            const result = parserInput.end();
            expect(result.isFinished).toBe(true);
            expect(result.furthest).toBe(4);
        });

        it('should return correct end state when not finished', () => {
            parserInput.start('test string');
            parserInput.i = 4;
            const result = parserInput.end();
            expect(result.isFinished).toBe(false);
            expect(result.furthest).toBe(4);
        });

        it('should return furthest position with error message if error occurred', () => {
            parserInput.start('test');
            parserInput.save();
            parserInput.i = 2;
            parserInput.restore('test error');
            const result = parserInput.end();
            expect(result.isFinished).toBe(false);
            expect(result.furthest).toBe(2);
            expect(result.furthestPossibleErrorMessage).toBe('test error');
        });
    });

    describe('isWhitespace method', () => {
        it('should identify whitespace characters using offset', () => {
            const testString = 'test \t\n\r';
            parserInput.start(testString);
            expect(parserInput.i).toBe(0);
            expect(parserInput.isWhitespace(4)).toBe(true);
            expect(parserInput.isWhitespace(5)).toBe(true);
            expect(parserInput.isWhitespace(6)).toBe(true);
            expect(parserInput.isWhitespace(7)).toBe(true);
        });

        it('should identify non-whitespace characters', () => {
            const testString = 'test';
            parserInput.start(testString);
            expect(parserInput.i).toBe(0);
            expect(parserInput.isWhitespace(0)).toBe(false);
            expect(parserInput.isWhitespace(3)).toBe(false);
        });
    });

    describe('peekNotNumeric method', () => {
        it('should identify non-numeric characters', () => {
            parserInput.start('test');
            expect(parserInput.peekNotNumeric()).toBe(true);
        });

        it('should identify numeric characters', () => {
            parserInput.start('123');
            expect(parserInput.peekNotNumeric()).toBe(false);
        });

        it('should identify numeric characters with sign', () => {
            parserInput.start('+123');
            expect(parserInput.peekNotNumeric()).toBe(false);
            parserInput.start('-123');
            expect(parserInput.peekNotNumeric()).toBe(false);
        });

        it('should identify special characters as non-numeric', () => {
            parserInput.start('/123');
            expect(parserInput.peekNotNumeric()).toBe(true);
            parserInput.start(',123');
            expect(parserInput.peekNotNumeric()).toBe(true);
            parserInput.start('.123');
            expect(parserInput.peekNotNumeric()).toBe(false);
        });
    });

    describe('comment handling', () => {
        it('should handle line comments with autoCommentAbsorb enabled', () => {
            parserInput.start('test // comment\nend');
            const result = parserInput.$re(/test/);
            expect(result).toBe('test');
            expect(parserInput.i).toBe(16);
            expect(parserInput.commentStore).toHaveLength(1);
            expect(parserInput.commentStore[0].isLineComment).toBe(true);
            expect(parserInput.commentStore[0].text).toBe('// comment');
        });

        it('should handle block comments with autoCommentAbsorb enabled', () => {
            parserInput.start('test /* comment */ end');
            const result = parserInput.$re(/test/);
            expect(result).toBe('test');
            expect(parserInput.i).toBe(19);
            expect(parserInput.commentStore).toHaveLength(1);
            expect(parserInput.commentStore[0].isLineComment).toBe(false);
            expect(parserInput.commentStore[0].text).toBe('/* comment */');
        });

        it('should handle comments with autoCommentAbsorb disabled', () => {
            parserInput.autoCommentAbsorb = false;
            parserInput.start('test // comment\nend');
            const result = parserInput.$re(/test/);
            expect(result).toBe('test');
            expect(parserInput.i).toBe(5);
            expect(parserInput.commentStore).toHaveLength(0);
        });
    });

    describe('chunking', () => {
        it('should handle input with multiple chunks', () => {
            parserInput.start('chunk1;chunk2;chunk3', true);
            expect(parserInput.getInput()).toBe('chunk1;chunk2;chunk3');
        });

        it('should handle special characters at chunk boundaries', () => {
            parserInput.start('{chunk1};{chunk2}', true);
            expect(parserInput.getInput()).toBe('{chunk1};{chunk2}');
        });
    });

    describe('error handling', () => {
        it('should handle unmatched quotes', () => {
            parserInput.start('"unmatched quote');
            const result = parserInput.$quoted();
            expect(result).toBeNull();
        });

        it('should handle unmatched brackets', () => {
            parserInput.start('{unmatched bracket');
            const result = parserInput.$parseUntil('}');
            expect(result).toBeNull();
        });
    });

    describe('edge cases', () => {
        it('should handle empty input string', () => {
            parserInput.start('');
            expect(parserInput.getInput()).toBe('');
            expect(parserInput.i).toBe(0);
        });

        it('should handle input with only whitespace', () => {
            parserInput.start(' \t\n\r');
            expect(parserInput.i).toBe(4);
        });

        it('should handle input with only comments', () => {
            parserInput.start('/* comment */ // comment');
            const result = parserInput.$re(/.*/);
            expect(result).toBe('');
            expect(parserInput.i).toBe(25);
            expect(parserInput.commentStore).toHaveLength(2);
            expect(parserInput.commentStore[0].isLineComment).toBe(false);
            expect(parserInput.commentStore[0].text).toBe('/* comment */');
            expect(parserInput.commentStore[1].isLineComment).toBe(true);
            expect(parserInput.commentStore[1].text).toBe('// comment');
        });
    });

    describe('state management', () => {
        it('should handle multiple save/restore operations', () => {
            parserInput.start('test string');
            parserInput.save();
            parserInput.i = 5;
            parserInput.save();
            parserInput.i = 10;
            parserInput.restore();
            expect(parserInput.i).toBe(5);
            parserInput.restore();
            expect(parserInput.i).toBe(0);
        });

        it('should handle save/restore with different error messages', () => {
            parserInput.start('test string');
            parserInput.save();
            parserInput.i = 5;
            parserInput.restore('error1');
            parserInput.save();
            parserInput.i = 10;
            parserInput.restore('error2');
            const endState = parserInput.end();
            expect(endState.furthest).toBe(10);
            expect(endState.furthestPossibleErrorMessage).toBe('error2');
        });
    });

    describe('$parseUntil method', () => {
        it('should handle nested blocks', () => {
            parserInput.start('test { nested { block } } end');
            const result = parserInput.$parseUntil(';');
            expect(result).toBeNull();
        });

        it('should handle quoted strings inside blocks', () => {
            parserInput.start('test { "quoted" } end');
            const result = parserInput.$parseUntil(';');
            expect(result).toBeNull();
        });

        it('should handle comments inside blocks', () => {
            parserInput.start('test { /* comment */ } end');
            const result = parserInput.$parseUntil(';');
            expect(result).toBeNull();
        });
    });

    describe('whitespace handling', () => {
        it('should handle different whitespace combinations', () => {
            parserInput.start(' \t\n\r test');
            expect(parserInput.i).toBe(5);
        });

        it('should handle whitespace at boundaries', () => {
            parserInput.start(' test ');
            expect(parserInput.i).toBe(1);
        });

        it('should preserve whitespace inside quoted strings', () => {
            parserInput.start('" test "');
            const result = parserInput.$quoted();
            expect(result).toBe('" test "');
        });
    });

    describe('character code handling', () => {
        it('should handle ASCII boundary characters', () => {
            parserInput.start('\u0000\u007F');
            expect(parserInput.getInput()).toBe('\u0000\u007F');
        });

        it('should handle special characters', () => {
            parserInput.start('\\"\'`');
            expect(parserInput.getInput()).toBe('\\"\'`');
        });

        it('should handle non-breaking space', () => {
            parserInput.start('\u00A0');
            expect(parserInput.isWhitespace(0)).toBe(false);
        });
    });
});
