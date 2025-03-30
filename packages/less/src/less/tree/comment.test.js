import { describe, it, expect, vi } from 'vitest';
import Comment from './comment';
import Node from './node';

describe('Comment', () => {
    describe('constructor', () => {
        it('should create a comment with the given value', () => {
            const comment = new Comment('/* test */');
            expect(comment.value).toBe('/* test */');
        });

        it('should set isLineComment flag', () => {
            const lineComment = new Comment('// test', true);
            const blockComment = new Comment('/* test */', false);

            expect(lineComment.isLineComment).toBe(true);
            expect(blockComment.isLineComment).toBe(false);
        });

        it('should set index and fileInfo', () => {
            const index = 5;
            const fileInfo = { filename: 'test.less' };
            const comment = new Comment('/* test */', false, index, fileInfo);

            expect(comment._index).toBe(index);
            expect(comment._fileInfo).toBe(fileInfo);
        });

        it('should set allowRoot to true', () => {
            const comment = new Comment('/* test */');
            expect(comment.allowRoot).toBe(true);
        });
    });

    describe('type', () => {
        it('should have type "Comment"', () => {
            const comment = new Comment('/* test */');
            expect(comment.type).toBe('Comment');
        });
    });

    describe('genCSS', () => {
        it('should output the comment value', () => {
            const comment = new Comment('/* test */');
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith('/* test */');
        });

        it('should handle multi-line comments', () => {
            const comment = new Comment('/*\n * Multi-line\n * comment\n */');
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith(
                '/*\n * Multi-line\n * comment\n */'
            );
        });

        it('should handle comments with special characters', () => {
            const comment = new Comment('/* @#$%^&*() */');
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith('/* @#$%^&*() */');
        });

        it('should handle empty comments', () => {
            const comment = new Comment('/* */');
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith('/* */');
        });

        it('should handle comments with whitespace', () => {
            const comment = new Comment('/*   test   */');
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith('/*   test   */');
        });

        it('should handle large comments', () => {
            const largeComment = '/* ' + 'x'.repeat(1000) + ' */';
            const comment = new Comment(largeComment);
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith(largeComment);
        });

        it('should handle comments with Unicode characters', () => {
            const comment = new Comment('/* 🌟 Hello 世界 */');
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith('/* 🌟 Hello 世界 */');
        });

        it('should handle comments with Less-specific syntax', () => {
            const comment = new Comment('/* @variable: value; */');
            const output = { add: vi.fn() };
            const context = {};

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledWith('/* @variable: value; */');
        });

        it('should include debug info when debugInfo is present', () => {
            const comment = new Comment('/* test */');
            const output = { add: vi.fn() };
            const context = { dumpLineNumbers: 'comments' };
            comment.debugInfo = { lineNumber: 1, fileName: 'test.less' };

            comment.genCSS(context, output);

            expect(output.add).toHaveBeenCalledTimes(2);
            expect(output.add).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('line 1'),
                expect.any(Object),
                expect.any(Number)
            );
            expect(output.add).toHaveBeenNthCalledWith(2, '/* test */');
        });
    });

    describe('isSilent', () => {
        it('should return true for line comments', () => {
            const comment = new Comment('// test', true);
            const context = { compress: false };

            expect(comment.isSilent(context)).toBe(true);
        });

        it('should return true for compressed comments without !', () => {
            const comment = new Comment('/* test */', false);
            const context = { compress: true };

            expect(comment.isSilent(context)).toBe(true);
        });

        it('should return false for compressed comments with !', () => {
            const comment = new Comment('/*! test */', false);
            const context = { compress: true };

            expect(comment.isSilent(context)).toBe(false);
        });

        it('should return false for block comments when not compressed', () => {
            const comment = new Comment('/* test */', false);
            const context = { compress: false };

            expect(comment.isSilent(context)).toBe(false);
        });
    });

    describe('Node inheritance', () => {
        it('should inherit from Node', () => {
            const comment = new Comment('/* test */');
            expect(comment instanceof Node).toBe(true);
        });

        it('should handle parent node relationship', () => {
            const parent = new Node();
            const comment = new Comment('/* test */');

            comment.setParent(comment, parent);
            expect(comment.parent).toBe(parent);
        });

        it('should get index from parent if not set', () => {
            const parent = new Node();
            parent._index = 5;
            const comment = new Comment('/* test */');

            comment.setParent(comment, parent);
            expect(comment.getIndex()).toBe(5);
        });

        it('should get fileInfo from parent if not set', () => {
            const parent = new Node();
            parent._fileInfo = { filename: 'test.less' };
            const comment = new Comment('/* test */');

            comment.setParent(comment, parent);
            expect(comment.fileInfo()).toEqual({ filename: 'test.less' });
        });
    });
});
