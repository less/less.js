import { describe, it, expect, beforeEach, vi } from 'vitest';
import dataUriFactory from './data-uri.js';
import Quoted from '../tree/quoted.js';
import URL from '../tree/url.js';
import * as utils from '../utils.js';

describe('Data URI Functions', () => {
    let mockEnvironment;
    let mockContext;
    let mockFileManager;
    let mockCurrentFileInfo;
    let dataUriFunctions;

    beforeEach(() => {
        // Mock file manager
        mockFileManager = {
            loadFileSync: vi.fn()
        };

        // Mock environment
        mockEnvironment = {
            getFileManager: vi.fn(() => mockFileManager),
            mimeLookup: vi.fn(),
            charsetLookup: vi.fn(),
            encodeBase64: vi.fn()
        };

        // Mock current file info
        mockCurrentFileInfo = {
            rewriteUrls: false,
            currentDirectory: '/test/dir',
            entryPath: '/test/entry'
        };

        // Mock context
        mockContext = {
            frames: [],
            rawBuffer: false,
            normalizePath: vi.fn((path) => path),
            rewritePath: vi.fn((path) => path)
        };

        // Mock utils.clone
        vi.spyOn(utils, 'clone').mockImplementation((obj) => ({ ...obj }));

        // Create data-uri functions
        dataUriFunctions = dataUriFactory(mockEnvironment);
    });

    describe('data-uri function', () => {
        let mockThis;

        beforeEach(() => {
            mockThis = {
                index: 0,
                currentFileInfo: mockCurrentFileInfo,
                context: mockContext
            };
        });

        it('should exist and be a function', () => {
            expect(typeof dataUriFunctions['data-uri']).toBe('function');
        });

        it('should handle single parameter (file path only)', () => {
            const filePathNode = new Quoted('"', 'test.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockEnvironment.charsetLookup.mockReturnValue('binary');
            mockEnvironment.encodeBase64.mockReturnValue('aGVsbG8=');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'hello'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            expect(mockEnvironment.mimeLookup).toHaveBeenCalledWith('test.png');
        });

        it('should handle two parameters (mimetype and file path)', () => {
            const mimetypeNode = new Quoted('"', 'image/jpeg', true);
            const filePathNode = new Quoted('"', 'test.jpg', true);
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'jpeg-data'
            });
            mockEnvironment.encodeBase64.mockReturnValue('anBlZy1kYXRh');

            const result = dataUriFunctions['data-uri'].call(mockThis, mimetypeNode, filePathNode);

            expect(result).toBeInstanceOf(URL);
            expect(mockEnvironment.getFileManager).toHaveBeenCalledWith(
                'test.jpg',
                '/test/entry',
                expect.objectContaining({ rawBuffer: true }),
                mockEnvironment,
                true
            );
        });

        it('should auto-detect mimetype when not provided', () => {
            const filePathNode = new Quoted('"', 'image.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockEnvironment.charsetLookup.mockReturnValue('binary');
            mockEnvironment.encodeBase64.mockReturnValue('cG5nZGF0YQ==');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'pngdata'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.mimeLookup).toHaveBeenCalledWith('image.png');
            expect(mockEnvironment.charsetLookup).toHaveBeenCalledWith('image/png');
            expect(result).toBeInstanceOf(URL);
        });

        it('should handle SVG files without base64 encoding', () => {
            const filePathNode = new Quoted('"', 'icon.svg', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/svg+xml');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: '<svg>test</svg>'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.encodeBase64).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(URL);
        });

        it('should use base64 for binary files', () => {
            const filePathNode = new Quoted('"', 'binary.bin', true);
            mockEnvironment.mimeLookup.mockReturnValue('application/octet-stream');
            mockEnvironment.charsetLookup.mockReturnValue('binary');
            mockEnvironment.encodeBase64.mockReturnValue('YmluYXJ5ZGF0YQ==');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'binarydata'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.encodeBase64).toHaveBeenCalledWith('binarydata');
            expect(result).toBeInstanceOf(URL);
        });

        it('should not use base64 for UTF-8 text files', () => {
            const filePathNode = new Quoted('"', 'text.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'hello world'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.encodeBase64).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(URL);
        });

        it('should not use base64 for US-ASCII text files', () => {
            const filePathNode = new Quoted('"', 'ascii.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('US-ASCII');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'ascii text'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.encodeBase64).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(URL);
        });

        it('should detect base64 from explicit mimetype', () => {
            const mimetypeNode = new Quoted('"', 'image/png;base64', true);
            const filePathNode = new Quoted('"', 'test.png', true);
            mockEnvironment.encodeBase64.mockReturnValue('base64data');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'imagedata'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, mimetypeNode, filePathNode);

            expect(mockEnvironment.encodeBase64).toHaveBeenCalledWith('imagedata');
            expect(result).toBeInstanceOf(URL);
        });

        it('should handle file fragments (hash parts)', () => {
            const filePathNode = new Quoted('"', 'icon.svg#icon-home', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/svg+xml');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: '<svg>icon</svg>'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                'icon.svg',
                '/test/entry',
                expect.any(Object),
                mockEnvironment
            );
            expect(result).toBeInstanceOf(URL);
        });

        it('should handle rewriteUrls option in currentFileInfo', () => {
            mockCurrentFileInfo.rewriteUrls = true;
            const filePathNode = new Quoted('"', 'test.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockEnvironment.charsetLookup.mockReturnValue('binary');
            mockEnvironment.encodeBase64.mockReturnValue('data');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'content'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.getFileManager).toHaveBeenCalledWith(
                'test.png',
                '/test/dir', // Should use currentDirectory when rewriteUrls is true
                expect.any(Object),
                mockEnvironment,
                true
            );
            expect(result).toBeInstanceOf(URL);
        });

        it('should fallback when file manager is not available', () => {
            mockEnvironment.getFileManager.mockReturnValue(null);
            const filePathNode = new Quoted('"', 'missing.png', true);

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Should create a URL node as fallback
        });

        it('should fallback when file contents are empty', () => {
            const filePathNode = new Quoted('"', 'empty.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: ''
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Should create a URL node as fallback
        });

        it('should fallback when file contents are null', () => {
            const filePathNode = new Quoted('"', 'null.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: null
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Should create a URL node as fallback
        });

        it('should fallback when base64 encoding is required but not available', () => {
            const filePathNode = new Quoted('"', 'image.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockEnvironment.charsetLookup.mockReturnValue('binary');
            mockEnvironment.encodeBase64 = undefined; // No base64 encoder available
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'imagedata'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Should create a URL node as fallback
        });

        it('should handle various file extensions correctly', () => {
            const testCases = [
                { file: 'test.jpg', mimetype: 'image/jpeg' },
                { file: 'test.gif', mimetype: 'image/gif' },
                { file: 'test.css', mimetype: 'text/css' },
                { file: 'test.js', mimetype: 'application/javascript' },
                { file: 'test.json', mimetype: 'application/json' }
            ];

            testCases.forEach(({ file, mimetype }) => {
                mockEnvironment.mimeLookup.mockReturnValue(mimetype);
                mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
                mockFileManager.loadFileSync.mockReturnValue({
                    contents: 'test content'
                });

                const filePathNode = new Quoted('"', file, true);
                const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

                expect(result).toBeInstanceOf(URL);
                expect(mockEnvironment.mimeLookup).toHaveBeenCalledWith(file);
            });
        });

        it('should clone context and set rawBuffer to true', () => {
            const filePathNode = new Quoted('"', 'test.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'text content'
            });

            dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(utils.clone).toHaveBeenCalledWith(mockContext);
            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                'test.txt',
                '/test/entry',
                expect.objectContaining({ rawBuffer: true }),
                mockEnvironment
            );
        });

        it('should handle complex file paths with directories', () => {
            const filePathNode = new Quoted('"', 'images/icons/home.svg', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/svg+xml');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: '<svg>home</svg>'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                'images/icons/home.svg',
                '/test/entry',
                expect.any(Object),
                mockEnvironment
            );
            expect(result).toBeInstanceOf(URL);
        });

        it('should create proper data URI format', () => {
            const filePathNode = new Quoted('"', 'test.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'hello world'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            expect(result.value).toBeInstanceOf(Quoted);
            // The result should contain a data URI
            const dataUri = result.value.value;
            expect(dataUri).toMatch(/^data:text\/plain,/);
        });

        it('should handle edge case with empty fragment', () => {
            const filePathNode = new Quoted('"', 'test.svg#', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/svg+xml');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: '<svg>test</svg>'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                'test.svg',
                '/test/entry',
                expect.any(Object),
                mockEnvironment
            );
            expect(result).toBeInstanceOf(URL);
        });

        it('should handle case where mimetype already includes charset', () => {
            const mimetypeNode = new Quoted('"', 'text/css;charset=utf-8', true);
            const filePathNode = new Quoted('"', 'styles.css', true);
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'body { color: red; }'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, mimetypeNode, filePathNode);

            expect(result).toBeInstanceOf(URL);
            expect(mockEnvironment.mimeLookup).not.toHaveBeenCalled();
            expect(mockEnvironment.charsetLookup).not.toHaveBeenCalled();
        });

        it('should encode URI components for non-base64 content', () => {
            const filePathNode = new Quoted('"', 'test.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'hello world & special chars!'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Content should be URI encoded, not base64 encoded
            const dataUri = result.value.value;
            expect(dataUri).toContain('hello%20world%20%26%20special%20chars!');
        });

        it('should preserve fragment in final data URI', () => {
            const filePathNode = new Quoted('"', 'sprite.svg#icon-home', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/svg+xml');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: '<svg>sprite</svg>'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            const dataUri = result.value.value;
            expect(dataUri).toMatch(/#icon-home$/);
        });

        it('should handle multiple fragments in file path', () => {
            const filePathNode = new Quoted('"', 'file.svg#first#second', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/svg+xml');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: '<svg>multi</svg>'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                'file.svg',
                '/test/entry',
                expect.any(Object),
                mockEnvironment
            );
            expect(result).toBeInstanceOf(URL);
            const dataUri = result.value.value;
            expect(dataUri).toMatch(/#first#second$/);
        });

        it('should handle no file manager with two parameters', () => {
            mockEnvironment.getFileManager.mockReturnValue(null);
            const mimetypeNode = new Quoted('"', 'image/png', true);
            const filePathNode = new Quoted('"', 'missing.png', true);

            const result = dataUriFunctions['data-uri'].call(mockThis, mimetypeNode, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Should fallback with the filePathNode
        });

        it('should handle file load failure with two parameters', () => {
            const mimetypeNode = new Quoted('"', 'image/png', true);
            const filePathNode = new Quoted('"', 'missing.png', true);
            mockFileManager.loadFileSync.mockReturnValue({
                contents: null
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, mimetypeNode, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Should fallback with mimetypeNode when filePathNode is available
        });
    });

    describe('edge cases and error handling', () => {
        let mockThis;

        beforeEach(() => {
            mockThis = {
                index: 0,
                currentFileInfo: mockCurrentFileInfo,
                context: mockContext
            };
        });

        it('should handle unusual charset values', () => {
            const filePathNode = new Quoted('"', 'unusual.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('ISO-8859-1');
            mockEnvironment.encodeBase64.mockReturnValue('dW51c3VhbA==');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'unusual'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.encodeBase64).toHaveBeenCalled();
            expect(result).toBeInstanceOf(URL);
        });

        it('should handle missing mimetype lookup', () => {
            const filePathNode = new Quoted('"', 'unknown.xyz', true);
            mockEnvironment.mimeLookup.mockReturnValue(undefined);
            mockEnvironment.charsetLookup.mockReturnValue(undefined);
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'unknown content'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
        });

        it('should handle empty currentFileInfo', () => {
            mockThis.currentFileInfo = {};
            const filePathNode = new Quoted('"', 'test.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'test'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
        });

        it('should handle file manager that throws errors', () => {
            mockFileManager.loadFileSync.mockImplementation(() => {
                throw new Error('File system error');
            });
            const filePathNode = new Quoted('"', 'error.txt', true);

            expect(() => {
                dataUriFunctions['data-uri'].call(mockThis, filePathNode);
            }).toThrow('File system error');
        });

        it('should handle very long file paths', () => {
            const longPath = 'a'.repeat(1000) + '.txt';
            const filePathNode = new Quoted('"', longPath, true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'long path content'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                longPath,
                '/test/entry',
                expect.any(Object),
                mockEnvironment
            );
            expect(result).toBeInstanceOf(URL);
        });

        it('should handle special characters in file names', () => {
            const specialPath = 'special chars and symbols.txt';
            const filePathNode = new Quoted('"', specialPath, true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'special content'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                specialPath,
                '/test/entry',
                expect.any(Object),
                mockEnvironment
            );
            expect(result).toBeInstanceOf(URL);
        });

        it('should handle Unicode content properly', () => {
            const filePathNode = new Quoted('"', 'unicode.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.charsetLookup.mockReturnValue('UTF-8');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: '你好世界 🌍'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            const dataUri = result.value.value;
            expect(dataUri).toContain('text/plain');
        });
    });

    describe('integration with environment', () => {
        let mockThis;

        beforeEach(() => {
            mockThis = {
                index: 0,
                currentFileInfo: mockCurrentFileInfo,
                context: mockContext
            };
        });

        it('should call environment methods with correct parameters', () => {
            const filePathNode = new Quoted('"', 'test.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockEnvironment.charsetLookup.mockReturnValue('binary');
            mockEnvironment.encodeBase64.mockReturnValue('encoded');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'content'
            });

            dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(mockEnvironment.getFileManager).toHaveBeenCalledWith(
                'test.png',
                '/test/entry',
                expect.objectContaining({ rawBuffer: true }),
                mockEnvironment,
                true
            );
            expect(mockEnvironment.mimeLookup).toHaveBeenCalledWith('test.png');
            expect(mockEnvironment.charsetLookup).toHaveBeenCalledWith('image/png');
            expect(mockEnvironment.encodeBase64).toHaveBeenCalledWith('content');
        });

        it('should handle environment without encodeBase64 method', () => {
            mockEnvironment.encodeBase64 = null;
            const filePathNode = new Quoted('"', 'test.png', true);
            mockEnvironment.mimeLookup.mockReturnValue('image/png');
            mockEnvironment.charsetLookup.mockReturnValue('binary');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'content'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // Should fallback when base64 is needed but not available
        });

        it('should handle environment with null charset lookup result', () => {
            mockEnvironment.charsetLookup.mockReturnValue(null);
            const filePathNode = new Quoted('"', 'test.txt', true);
            mockEnvironment.mimeLookup.mockReturnValue('text/plain');
            mockEnvironment.encodeBase64.mockReturnValue('dGVzdCBjb250ZW50');
            mockFileManager.loadFileSync.mockReturnValue({
                contents: 'text content'
            });

            const result = dataUriFunctions['data-uri'].call(mockThis, filePathNode);

            expect(result).toBeInstanceOf(URL);
            // When charset is null/undefined, it should use base64
            expect(mockEnvironment.encodeBase64).toHaveBeenCalled();
        });
    });
});