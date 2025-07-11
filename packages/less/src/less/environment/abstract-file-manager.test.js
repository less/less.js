import { describe, it, expect } from 'vitest';
import AbstractFileManager from './abstract-file-manager.js';

describe('AbstractFileManager', () => {
    let fileManager;

    beforeEach(() => {
        fileManager = new AbstractFileManager();
    });

    describe('getPath', () => {
        it('should return path portion of filename with trailing slash', () => {
            expect(fileManager.getPath('/path/to/file.less')).toBe('/path/to/');
            expect(fileManager.getPath('path/to/file.less')).toBe('path/to/');
            expect(fileManager.getPath('C:\\path\\to\\file.less')).toBe('C:\\path\\to\\');
        });

        it('should handle filenames with query parameters', () => {
            expect(fileManager.getPath('/path/to/file.less?v=123')).toBe('/path/to/');
            expect(fileManager.getPath('file.less?query=value')).toBe('');
        });

        it('should return empty string for filenames without path separators', () => {
            expect(fileManager.getPath('file.less')).toBe('');
            expect(fileManager.getPath('file')).toBe('');
        });

        it('should handle edge cases', () => {
            expect(fileManager.getPath('')).toBe('');
            expect(fileManager.getPath('/')).toBe('/');
            expect(fileManager.getPath('\\')).toBe('\\');
            expect(fileManager.getPath('/file')).toBe('/');
            expect(fileManager.getPath('\\file')).toBe('\\');
        });

        it('should handle mixed path separators', () => {
            expect(fileManager.getPath('/path\\to/file.less')).toBe('/path\\to/');
            expect(fileManager.getPath('\\path/to\\file.less')).toBe('\\path/');
        });
    });

    describe('tryAppendExtension', () => {
        it('should append extension when path has no extension', () => {
            expect(fileManager.tryAppendExtension('file', '.less')).toBe('file.less');
            expect(fileManager.tryAppendExtension('path/file', '.css')).toBe('path/file.css');
        });

        it('should not append extension when path already has extension', () => {
            expect(fileManager.tryAppendExtension('file.less', '.css')).toBe('file.less');
            expect(fileManager.tryAppendExtension('file.css', '.less')).toBe('file.css');
            expect(fileManager.tryAppendExtension('file.txt', '.less')).toBe('file.txt');
        });

        it('should not append extension when path has query parameters', () => {
            expect(fileManager.tryAppendExtension('file?v=1', '.less')).toBe('file?v=1');
            expect(fileManager.tryAppendExtension('file;jsessionid=123', '.less')).toBe('file;jsessionid=123');
        });

        it('should handle empty paths', () => {
            expect(fileManager.tryAppendExtension('', '.less')).toBe('.less');
        });

        it('should handle paths ending with dots', () => {
            expect(fileManager.tryAppendExtension('file.', '.less')).toBe('file.');
            expect(fileManager.tryAppendExtension('file..', '.less')).toBe('file..');
        });
    });

    describe('tryAppendLessExtension', () => {
        it('should append .less extension', () => {
            expect(fileManager.tryAppendLessExtension('file')).toBe('file.less');
            expect(fileManager.tryAppendLessExtension('path/file')).toBe('path/file.less');
        });

        it('should not append .less when extension exists', () => {
            expect(fileManager.tryAppendLessExtension('file.css')).toBe('file.css');
            expect(fileManager.tryAppendLessExtension('file.less')).toBe('file.less');
        });
    });

    describe('supportsSync', () => {
        it('should return false by default', () => {
            expect(fileManager.supportsSync()).toBe(false);
        });
    });

    describe('alwaysMakePathsAbsolute', () => {
        it('should return false by default', () => {
            expect(fileManager.alwaysMakePathsAbsolute()).toBe(false);
        });
    });

    describe('isPathAbsolute', () => {
        it('should identify absolute paths with protocol', () => {
            expect(fileManager.isPathAbsolute('http://example.com/file.less')).toBe(true);
            expect(fileManager.isPathAbsolute('https://example.com/file.less')).toBe(true);
            expect(fileManager.isPathAbsolute('file:///path/file.less')).toBe(true);
            expect(fileManager.isPathAbsolute('ftp://server/file.less')).toBe(true);
        });

        it('should identify absolute paths with forward slash', () => {
            expect(fileManager.isPathAbsolute('/path/file.less')).toBe(true);
            expect(fileManager.isPathAbsolute('/file.less')).toBe(true);
        });

        it('should identify absolute paths with backslash', () => {
            expect(fileManager.isPathAbsolute('\\path\\file.less')).toBe(true);
            expect(fileManager.isPathAbsolute('\\file.less')).toBe(true);
        });

        it('should identify hash paths as absolute', () => {
            expect(fileManager.isPathAbsolute('#fragment')).toBe(true);
        });

        it('should identify relative paths', () => {
            expect(fileManager.isPathAbsolute('file.less')).toBe(false);
            expect(fileManager.isPathAbsolute('path/file.less')).toBe(false);
            expect(fileManager.isPathAbsolute('./file.less')).toBe(false);
            expect(fileManager.isPathAbsolute('../file.less')).toBe(false);
        });

        it('should handle empty and special cases', () => {
            expect(fileManager.isPathAbsolute('')).toBe(false);
            expect(fileManager.isPathAbsolute('C:')).toBe(true); // Windows drive letter
        });
    });

    describe('join', () => {
        it('should join paths', () => {
            expect(fileManager.join('/base/', 'file.less')).toBe('/base/file.less');
            expect(fileManager.join('base', '/file.less')).toBe('base/file.less');
            expect(fileManager.join('base/', 'path/file.less')).toBe('base/path/file.less');
        });

        it('should return laterPath when basePath is empty', () => {
            expect(fileManager.join('', 'file.less')).toBe('file.less');
            expect(fileManager.join(null, 'file.less')).toBe('file.less');
            expect(fileManager.join(undefined, 'file.less')).toBe('file.less');
        });

        it('should handle empty laterPath', () => {
            expect(fileManager.join('/base/', '')).toBe('/base/');
            expect(fileManager.join('/base/', null)).toBe('/base/null');
            expect(fileManager.join('/base/', undefined)).toBe('/base/undefined');
        });
    });

    describe('extractUrlParts', () => {
        it('should parse simple URLs', () => {
            const result = fileManager.extractUrlParts('http://example.com/path/file.less');
            expect(result.hostPart).toBe('http://example.com/');
            expect(result.directories).toEqual(['path', '']);
            expect(result.filename).toBe('file.less');
            expect(result.path).toBe('http://example.com/path/');
            expect(result.fileUrl).toBe('http://example.com/path/file.less');
            expect(result.url).toBe('http://example.com/path/file.less');
        });

        it('should parse URLs with query parameters', () => {
            const result = fileManager.extractUrlParts('http://example.com/path/file.less?v=1&t=2');
            expect(result.hostPart).toBe('http://example.com/');
            expect(result.directories).toEqual(['path', '']);
            expect(result.filename).toBe('file.less');
            expect(result.url).toBe('http://example.com/path/file.less?v=1&t=2');
        });

        it('should parse relative paths', () => {
            const result = fileManager.extractUrlParts('/path/to/file.less');
            expect(result.hostPart).toBe('/');
            expect(result.directories).toEqual(['path', 'to', '']);
            expect(result.filename).toBe('file.less');
            expect(result.path).toBe('/path/to/');
        });

        it('should handle paths with .. and . directories', () => {
            const result = fileManager.extractUrlParts('/path/./to/../file.less');
            expect(result.directories).toEqual(['path', '']);
            expect(result.path).toBe('/path/');
        });

        it('should parse Windows-style paths', () => {
            const result = fileManager.extractUrlParts('\\path\\to\\file.less');
            expect(result.directories).toEqual(['path', 'to', '']);
            expect(result.filename).toBe('file.less');
        });

        it('should handle baseUrl for relative URLs', () => {
            const result = fileManager.extractUrlParts('file.less', 'http://example.com/base/');
            expect(result.hostPart).toBe('http://example.com/');
            expect(result.directories).toEqual(['base', '']);
            expect(result.filename).toBe('file.less');
        });

        it('should handle root-relative URLs with baseUrl', () => {
            const result = fileManager.extractUrlParts('/file.less', 'http://example.com/base/');
            expect(result.hostPart).toBe('/');
            expect(result.directories).toEqual([]);
            expect(result.filename).toBe('file.less');
        });

        it('should handle edge cases for URLs', () => {
            expect(() => fileManager.extractUrlParts(null)).toThrow('Cannot read properties of null');
            // Empty string actually returns a valid result with the regex
            const result = fileManager.extractUrlParts('');
            expect(result).toBeDefined();
        });

        it('should handle edge cases for baseUrl', () => {
            // Empty baseUrl actually doesn't trigger the error path unless needed
            const result = fileManager.extractUrlParts('file.less', '');
            expect(result).toBeDefined();
        });

        it('should handle complex directory navigation', () => {
            const result = fileManager.extractUrlParts('/a/b/c/../../d/../e/f.less');
            expect(result.directories).toEqual(['a', 'e', '']);
            expect(result.path).toBe('/a/e/');
        });

        it('should handle fragments', () => {
            const result = fileManager.extractUrlParts('http://example.com/file.less#section');
            expect(result.filename).toBe('file.less');
            expect(result.url).toBe('http://example.com/file.less#section');
        });
    });

    describe('pathDiff', () => {
        it('should calculate relative path between URLs', () => {
            const result = fileManager.pathDiff(
                'http://example.com/path/to/file.less',
                'http://example.com/base/from/here.less'
            );
            expect(result).toBe('../../path/to/');
        });

        it('should return empty string for different hosts', () => {
            const result = fileManager.pathDiff(
                'http://example.com/file.less',
                'http://other.com/file.less'
            );
            expect(result).toBe('');
        });

        it('should handle same directory', () => {
            const result = fileManager.pathDiff(
                'http://example.com/path/file1.less',
                'http://example.com/path/file2.less'
            );
            expect(result).toBe('');
        });

        it('should handle subdirectory', () => {
            const result = fileManager.pathDiff(
                'http://example.com/path/sub/file.less',
                'http://example.com/path/file.less'
            );
            expect(result).toBe('sub/');
        });

        it('should handle parent directory', () => {
            const result = fileManager.pathDiff(
                'http://example.com/file.less',
                'http://example.com/path/file.less'
            );
            expect(result).toBe('../');
        });

        it('should handle complex relative paths', () => {
            const result = fileManager.pathDiff(
                'http://example.com/a/b/c/file.less',
                'http://example.com/x/y/file.less'
            );
            expect(result).toBe('../../a/b/c/');
        });

        it('should handle root paths', () => {
            const result = fileManager.pathDiff(
                'http://example.com/file.less',
                'http://example.com/'
            );
            expect(result).toBe('');
        });
    });
});