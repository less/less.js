import { expect } from 'vitest';
import debugInfo from './debug-info';

describe('debugInfo', () => {
    const createContext = (dumpLineNumbers, compress = false) => ({
        dumpLineNumbers,
        compress
    });

    const createDebugContext = (lineNumber, fileName) => ({
        debugInfo: {
            lineNumber,
            fileName
        }
    });

    it('should return empty string when dumpLineNumbers is not set', () => {
        const context = createContext(null);
        const ctx = createDebugContext(1, 'test.less');
        expect(debugInfo(context, ctx)).toBe('');
    });

    it('should return empty string when compress is true', () => {
        const context = createContext('comments', true);
        const ctx = createDebugContext(1, 'test.less');
        expect(debugInfo(context, ctx)).toBe('');
    });

    describe('when dumpLineNumbers is "comments"', () => {
        it('should generate correct comment format', () => {
            const context = createContext('comments');
            const ctx = createDebugContext(42, 'test.less');
            expect(debugInfo(context, ctx)).toBe('/* line 42, test.less */\n');
        });

        it('should handle different line numbers', () => {
            const context = createContext('comments');
            const ctx = createDebugContext(999, 'test.less');
            expect(debugInfo(context, ctx)).toBe('/* line 999, test.less */\n');
        });

        it('should handle different file names', () => {
            const context = createContext('comments');
            const ctx = createDebugContext(1, 'path/to/file.less');
            expect(debugInfo(context, ctx)).toBe(
                '/* line 1, path/to/file.less */\n'
            );
        });
    });

    describe('when dumpLineNumbers is "mediaquery"', () => {
        it('should generate correct media query format for local file', () => {
            const context = createContext('mediaquery');
            const ctx = createDebugContext(42, 'test.less');
            const expected =
                '@media -sass-debug-info{filename{font-family:file\\:\\/\\/test\\.less}line{font-family:\\0000342}}\n';
            expect(debugInfo(context, ctx)).toBe(expected);
        });

        it('should handle URLs with protocols', () => {
            const context = createContext('mediaquery');
            const ctx = createDebugContext(1, 'https://example.com/test.less');
            const expected =
                '@media -sass-debug-info{filename{font-family:https\\:\\/\\/example\\.com\\/test\\.less}line{font-family:\\000031}}\n';
            expect(debugInfo(context, ctx)).toBe(expected);
        });

        it('should handle Windows-style paths', () => {
            const context = createContext('mediaquery');
            const ctx = createDebugContext(1, 'C:\\path\\to\\file.less');
            const expected =
                '@media -sass-debug-info{filename{font-family:file\\:\\/\\/C\\:\\/path\\/to\\/file\\.less}line{font-family:\\000031}}\n';
            expect(debugInfo(context, ctx)).toBe(expected);
        });
    });

    describe('when dumpLineNumbers is "all"', () => {
        it('should combine both comment and media query formats', () => {
            const context = createContext('all');
            const ctx = createDebugContext(42, 'test.less');
            const expected =
                '/* line 42, test.less */\n@media -sass-debug-info{filename{font-family:file\\:\\/\\/test\\.less}line{font-family:\\0000342}}\n';
            expect(debugInfo(context, ctx)).toBe(expected);
        });

        it('should handle custom line separator', () => {
            const context = createContext('all');
            const ctx = createDebugContext(42, 'test.less');
            const lineSeparator = '\n\n';
            const expected =
                '/* line 42, test.less */\n\n\n@media -sass-debug-info{filename{font-family:file\\:\\/\\/test\\.less}line{font-family:\\0000342}}\n';
            expect(debugInfo(context, ctx, lineSeparator)).toBe(expected);
        });
    });

    it('should handle empty file names', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(1, '');
        expect(debugInfo(context, ctx)).toBe('/* line 1,  */\n');
    });

    it('should handle special characters in file names', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(1, 'test@#$%.less');
        expect(debugInfo(context, ctx)).toBe('/* line 1, test@#$%.less */\n');
    });

    it('should handle invalid dumpLineNumbers values', () => {
        const context = createContext('invalid');
        const ctx = createDebugContext(1, 'test.less');
        expect(debugInfo(context, ctx)).toBe('');
    });

    it('should handle negative line numbers', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(-1, 'test.less');
        expect(debugInfo(context, ctx)).toBe('/* line -1, test.less */\n');
    });

    it('should handle very large line numbers', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(999999, 'test.less');
        expect(debugInfo(context, ctx)).toBe('/* line 999999, test.less */\n');
    });

    it('should handle filenames with spaces', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(1, 'my file.less');
        expect(debugInfo(context, ctx)).toBe('/* line 1, my file.less */\n');
    });

    it('should handle filenames with unicode characters', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(1, '测试.less');
        expect(debugInfo(context, ctx)).toBe('/* line 1, 测试.less */\n');
    });

    it('should handle undefined line numbers', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(undefined, 'test.less');
        expect(debugInfo(context, ctx)).toBe(
            '/* line undefined, test.less */\n'
        );
    });

    it('should handle null line numbers', () => {
        const context = createContext('comments');
        const ctx = createDebugContext(null, 'test.less');
        expect(debugInfo(context, ctx)).toBe('/* line null, test.less */\n');
    });

    it('should handle different protocols in filenames', () => {
        const context = createContext('mediaquery');
        const ctx = createDebugContext(1, 'ftp://example.com/test.less');
        const expected =
            '@media -sass-debug-info{filename{font-family:ftp\\:\\/\\/example\\.com\\/test\\.less}line{font-family:\\000031}}\n';
        expect(debugInfo(context, ctx)).toBe(expected);
    });

    it('should handle file:// protocol in filenames', () => {
        const context = createContext('mediaquery');
        const ctx = createDebugContext(1, 'file:///path/to/test.less');
        const expected =
            '@media -sass-debug-info{filename{font-family:file\\:\\/\\/\\/path\\/to\\/test\\.less}line{font-family:\\000031}}\n';
        expect(debugInfo(context, ctx)).toBe(expected);
    });
});
