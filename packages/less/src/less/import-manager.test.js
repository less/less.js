import { describe, it, expect, vi, beforeEach } from 'vitest';
import importManagerFactory from './import-manager';
import contexts from './contexts';
import Parser from './parser/parser';
import LessError from './less-error';
import * as utils from './utils';
import logger from './logger';

// Mock the Parser class
vi.mock('./parser/parser', () => {
    return {
        default: vi.fn()
    };
});

// Mock contexts
vi.mock('./contexts', () => {
    return {
        default: {
            Parse: vi.fn()
        }
    };
});

// Mock logger
vi.mock('./logger', () => {
    return {
        default: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        }
    };
});

describe('ImportManager', () => {
    let mockEnvironment;
    let mockFileManager;
    let mockContext;
    let mockRootFileInfo;
    let mockLess;
    let ImportManager;
    let importManager;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock the environment
        mockFileManager = {
            loadFileSync: vi.fn(),
            loadFile: vi.fn(),
            getPath: vi.fn(),
            join: vi.fn(),
            pathDiff: vi.fn(),
            isPathAbsolute: vi.fn(),
            alwaysMakePathsAbsolute: vi.fn()
        };

        mockEnvironment = {
            getFileManager: vi.fn().mockReturnValue(mockFileManager)
        };

        // Mock context with plugin manager
        mockContext = {
            paths: ['/mock/path1', '/mock/path2'],
            mime: 'text/css',
            rewriteUrls: true,
            rootpath: '/root/',
            pluginManager: {
                Loader: {
                    evalPlugin: vi.fn(),
                    loadPluginSync: vi.fn(),
                    loadPlugin: vi.fn()
                },
                getPreProcessors: vi.fn().mockReturnValue([]),
                getPostProcessors: vi.fn().mockReturnValue([]),
                getVisitors: vi.fn().mockReturnValue([]),
                getFileManagers: vi.fn().mockReturnValue([])
            }
        };

        // Mock root file info
        mockRootFileInfo = {
            filename: '/root/main.less',
            currentDirectory: '/root/',
            rootpath: '/root/',
            entryPath: '/root/',
            rootFilename: '/root/main.less'
        };

        // Mock less instance
        mockLess = {
            parse: vi.fn()
        };

        // Create ImportManager class
        ImportManager = importManagerFactory(mockEnvironment);
        importManager = new ImportManager(
            mockLess,
            mockContext,
            mockRootFileInfo
        );
    });

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            expect(importManager.less).toBe(mockLess);
            expect(importManager.rootFilename).toBe('/root/main.less');
            expect(importManager.paths).toEqual(['/mock/path1', '/mock/path2']);
            expect(importManager.contents).toEqual({});
            expect(importManager.contentsIgnoredChars).toEqual({});
            expect(importManager.mime).toBe('text/css');
            expect(importManager.error).toBe(null);
            expect(importManager.context).toBe(mockContext);
            expect(importManager.queue).toEqual([]);
            expect(importManager.files).toEqual({});
        });

        it('should handle undefined paths in context', () => {
            const contextWithoutPaths = { ...mockContext };
            delete contextWithoutPaths.paths;

            const manager = new ImportManager(
                mockLess,
                contextWithoutPaths,
                mockRootFileInfo
            );
            expect(manager.paths).toEqual([]);
        });
    });

    describe('push - basic functionality', () => {
        it('should add path to queue when called', () => {
            const callback = vi.fn();
            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(importManager.queue).toContain('/test.less');
        });

        it('should call environment.getFileManager with correct parameters', () => {
            const callback = vi.fn();
            const currentFileInfo = { currentDirectory: '/current/' };

            importManager.push(
                '/test.less',
                true,
                currentFileInfo,
                {},
                callback
            );

            expect(mockEnvironment.getFileManager).toHaveBeenCalledWith(
                '/test.less',
                '/current/',
                mockContext,
                mockEnvironment
            );
        });

        it('should handle missing file manager', () => {
            mockEnvironment.getFileManager.mockReturnValue(null);
            const callback = vi.fn();

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                { message: 'Could not find a file-manager for /test.less' },
                undefined,
                false,
                undefined
            );
        });
    });

    describe('push - synchronous file loading', () => {
        beforeEach(() => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/test.less',
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should load file synchronously when syncImport is true', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };

            // Mock Parser constructor and parse method
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                '/test.less',
                mockRootFileInfo.currentDirectory,
                expect.objectContaining({ ext: '.less' }),
                mockEnvironment
            );
        });

        it('should handle tryAppendExtension for .less files', () => {
            const callback = vi.fn();
            importManager.push('/test', true, mockRootFileInfo, {}, callback);

            expect(mockFileManager.loadFileSync).toHaveBeenCalledWith(
                '/test',
                mockRootFileInfo.currentDirectory,
                expect.objectContaining({ ext: '.less' }),
                mockEnvironment
            );
        });

        it('should handle tryAppendExtension for plugin files', () => {
            const callback = vi.fn();
            const importOptions = { isPlugin: true };

            importManager.push(
                '/test',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(
                mockContext.pluginManager.Loader.loadPluginSync
            ).toHaveBeenCalled();
        });

        it('should process file contents and remove BOM', () => {
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/test.less',
                contents: '\uFEFF.test { color: red; }'
            });

            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => {
                expect(content).toBe('.test { color: red; }'); // BOM should be removed
                cb(null, mockRoot);
            });
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );
        });

        it('should store file contents in contents map', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(importManager.contents['/resolved/test.less']).toBe(
                '.test { color: red; }'
            );
        });

        it('should cache parsed files in files map', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            const importOptions = { someOption: true };
            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(importManager.files['/resolved/test.less']).toEqual({
                root: mockRoot,
                options: importOptions
            });
        });

        it('should not cache inline imports', () => {
            const callback = vi.fn();
            const importOptions = { inline: true };

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(importManager.files['/resolved/test.less']).toBeUndefined();
            expect(callback).toHaveBeenCalledWith(
                null,
                '.test { color: red; }',
                false,
                '/resolved/test.less'
            );
        });

        it('should remove path from queue after processing', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(importManager.queue).not.toContain('/test.less');
        });

        it('should detect when imported file equals root filename', () => {
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/root/main.less', // Same as rootFilename
                contents: '.test { color: red; }'
            });

            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                true, // importedEqualsRoot should be true
                '/root/main.less'
            );
        });

        it('should handle file load errors', () => {
            mockFileManager.loadFileSync.mockReturnValue({
                message: 'File not found'
            });

            const callback = vi.fn();
            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                { message: 'File not found' },
                undefined,
                false,
                undefined
            );
        });
    });

    describe('push - asynchronous file loading', () => {
        beforeEach(() => {
            mockContext.syncImport = false;
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should load file asynchronously when syncImport is false', () => {
            const callback = vi.fn();

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(mockFileManager.loadFile).toHaveBeenCalledWith(
                '/test.less',
                mockRootFileInfo.currentDirectory,
                expect.objectContaining({ ext: '.less' }),
                mockEnvironment,
                expect.any(Function)
            );
        });

        it('should handle async file load success', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            mockFileManager.loadFile.mockImplementation(
                (path, dir, context, env, cb) => {
                    cb(null, {
                        filename: '/resolved/test.less',
                        contents: '.test { color: red; }'
                    });
                }
            );

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                false,
                '/resolved/test.less'
            );
        });

        it('should handle async file load errors', () => {
            const callback = vi.fn();
            const error = new Error('Async load failed');

            mockFileManager.loadFile.mockImplementation(
                (path, dir, context, env, cb) => {
                    cb(error);
                }
            );

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                error,
                undefined,
                false,
                undefined
            );
        });
    });

    describe('push - promise-based file loading', () => {
        beforeEach(() => {
            mockContext.syncImport = false;
            mockFileManager.loadFile.mockReturnValue(null); // No callback provided
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should handle promise-based file loading success', async () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            const loadedFile = {
                filename: '/resolved/test.less',
                contents: '.test { color: red; }'
            };

            // Mock a promise that resolves
            const promise = Promise.resolve(loadedFile);
            mockFileManager.loadFile.mockReturnValue(promise);

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            // Wait for promise to resolve
            await promise;

            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                false,
                '/resolved/test.less'
            );
        });

        it('should handle promise-based file loading errors', async () => {
            const callback = vi.fn();
            const error = new Error('Promise load failed');

            // Mock a promise that rejects
            const promise = Promise.reject(error);
            mockFileManager.loadFile.mockReturnValue(promise);

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            // Wait for promise to reject
            try {
                await promise;
            } catch (e) {
                // Expected to reject
            }

            expect(callback).toHaveBeenCalledWith(
                error,
                undefined,
                false,
                undefined
            );
        });
    });

    describe('push - plugin loading', () => {
        beforeEach(() => {
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should load plugin synchronously when syncImport is true', () => {
            mockContext.syncImport = true;
            const callback = vi.fn();
            const importOptions = { isPlugin: true };
            const mockPlugin = { name: 'test-plugin' };

            mockContext.pluginManager.Loader.loadPluginSync.mockReturnValue({
                filename: '/resolved/test.js',
                contents: 'module.exports = {};'
            });
            mockContext.pluginManager.Loader.evalPlugin.mockReturnValue(
                mockPlugin
            );

            importManager.push(
                '/test',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(
                mockContext.pluginManager.Loader.loadPluginSync
            ).toHaveBeenCalledWith(
                '/test',
                mockRootFileInfo.currentDirectory,
                expect.objectContaining({
                    ext: '.js',
                    mime: 'application/javascript'
                }),
                mockEnvironment,
                mockFileManager
            );
        });

        it('should load plugin asynchronously when syncImport is false', () => {
            mockContext.syncImport = false;
            const callback = vi.fn();
            const importOptions = { isPlugin: true };
            const mockPlugin = { name: 'test-plugin' };

            const promise = Promise.resolve({
                filename: '/resolved/test.js',
                contents: 'module.exports = {};'
            });
            mockContext.pluginManager.Loader.loadPlugin.mockReturnValue(
                promise
            );
            mockContext.pluginManager.Loader.evalPlugin.mockReturnValue(
                mockPlugin
            );

            importManager.push(
                '/test',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(
                mockContext.pluginManager.Loader.loadPlugin
            ).toHaveBeenCalledWith(
                '/test',
                mockRootFileInfo.currentDirectory,
                expect.objectContaining({
                    ext: '.js',
                    mime: 'application/javascript'
                }),
                mockEnvironment,
                mockFileManager
            );
        });

        it('should handle plugin evaluation errors', () => {
            mockContext.syncImport = true;
            const callback = vi.fn();
            const importOptions = { isPlugin: true };
            const pluginError = new LessError({ message: 'Plugin error' });

            mockContext.pluginManager.Loader.loadPluginSync.mockReturnValue({
                filename: '/resolved/test.js',
                contents: 'invalid javascript'
            });
            mockContext.pluginManager.Loader.evalPlugin.mockReturnValue(
                pluginError
            );

            importManager.push(
                '/test',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                pluginError,
                null,
                false,
                '/resolved/test.js'
            );
        });

        it('should handle successful plugin evaluation', () => {
            mockContext.syncImport = true;
            const callback = vi.fn();
            const importOptions = { isPlugin: true };
            const mockPlugin = { name: 'test-plugin' };

            mockContext.pluginManager.Loader.loadPluginSync.mockReturnValue({
                filename: '/resolved/test.js',
                contents: 'module.exports = {};'
            });
            mockContext.pluginManager.Loader.evalPlugin.mockReturnValue(
                mockPlugin
            );

            importManager.push(
                '/test',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                null,
                mockPlugin,
                false,
                '/resolved/test.js'
            );
        });
    });

    describe('push - optional imports', () => {
        it('should handle optional import errors gracefully', () => {
            const callback = vi.fn();
            const importOptions = { optional: true };

            mockFileManager.loadFileSync.mockReturnValue({
                message: 'File not found'
            });
            mockContext.syncImport = true;

            importManager.push(
                '/missing.less',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                null,
                { rules: [] },
                false,
                null
            );
            // Logger info should be called with the file path that was skipped
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining(
                    'was skipped because it was not found and the import was marked optional'
                )
            );
        });

        it('should not treat non-optional import errors as optional', () => {
            const callback = vi.fn();
            const importOptions = {}; // Not optional

            mockFileManager.loadFileSync.mockReturnValue({
                message: 'File not found'
            });
            mockContext.syncImport = true;

            importManager.push(
                '/missing.less',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                { message: 'File not found' },
                undefined,
                false,
                undefined
            );
        });
    });

    describe('push - file caching', () => {
        beforeEach(() => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/test.less',
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should use cached file when available and not multiple', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };

            // Pre-populate cache
            importManager.files['/resolved/test.less'] = {
                root: mockRoot,
                options: { someOption: true }
            };

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                false,
                '/resolved/test.less'
            );

            // Parser should not be called for cached files
            expect(Parser).not.toHaveBeenCalled();
        });

        it('should not use cache when import options specify multiple', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            // Pre-populate cache
            importManager.files['/resolved/test.less'] = {
                root: { type: 'CachedRuleset' },
                options: { someOption: true }
            };

            const importOptions = { multiple: true };
            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            // Should parse again instead of using cache
            expect(Parser).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                false,
                '/resolved/test.less'
            );
        });

        it('should not use cache when cached options specify multiple', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            // Pre-populate cache with multiple option
            importManager.files['/resolved/test.less'] = {
                root: { type: 'CachedRuleset' },
                options: { multiple: true }
            };

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            // Should parse again instead of using cache
            expect(Parser).toHaveBeenCalled();
        });
    });

    describe('push - path rewriting', () => {
        beforeEach(() => {
            mockContext.syncImport = true;
            mockContext.rewriteUrls = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/subdir/test.less',
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue('/resolved/subdir/');
            mockFileManager.join.mockImplementation((a, b) =>
                `${a}/${b}`.replace(/\/+/g, '/')
            );
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should rewrite rootpath when rewriteUrls is enabled', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));

            // Capture the newEnv passed to Parser
            // eslint-disable-next-line no-unused-vars
            let capturedNewEnv;
            Parser.mockImplementation((newEnv) => {
                capturedNewEnv = newEnv;
                return { parse: mockParse };
            });

            const currentFileInfo = {
                ...mockRootFileInfo,
                currentDirectory: '/current/',
                entryPath: '/entry/'
            };

            importManager.push(
                '/test.less',
                true,
                currentFileInfo,
                {},
                callback
            );

            expect(mockFileManager.pathDiff).toHaveBeenCalledWith(
                '/resolved/subdir/',
                '/entry/'
            );
            expect(mockFileManager.join).toHaveBeenCalledWith('/root/', '../');
        });

        it('should make rootpath absolute when needed', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);

            const currentFileInfo = {
                ...mockRootFileInfo,
                entryPath: '/entry/'
            };

            importManager.push(
                '/test.less',
                true,
                currentFileInfo,
                {},
                callback
            );

            expect(mockFileManager.join).toHaveBeenCalledWith(
                '/entry/',
                '/root/../'
            );
        });

        it('should not rewrite paths when rewriteUrls is disabled', () => {
            mockContext.rewriteUrls = false;
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(mockFileManager.pathDiff).not.toHaveBeenCalled();
        });
    });

    describe('push - reference handling', () => {
        beforeEach(() => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/test.less',
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should set reference flag when currentFileInfo has reference', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));

            let capturedFileInfo;
            Parser.mockImplementation((newEnv, importManager, newFileInfo) => {
                capturedFileInfo = newFileInfo;
                return { parse: mockParse };
            });

            const currentFileInfo = {
                ...mockRootFileInfo,
                reference: true
            };

            importManager.push(
                '/test.less',
                true,
                currentFileInfo,
                {},
                callback
            );

            expect(capturedFileInfo.reference).toBe(true);
        });

        it('should set reference flag when importOptions has reference', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));

            let capturedFileInfo;
            Parser.mockImplementation((newEnv, importManager, newFileInfo) => {
                capturedFileInfo = newFileInfo;
                return { parse: mockParse };
            });

            const importOptions = { reference: true };

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(capturedFileInfo.reference).toBe(true);
        });
    });

    describe('push - error handling', () => {
        beforeEach(() => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/test.less',
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should store first error in importManager.error', () => {
            const callback = vi.fn();
            const parseError = new Error('Parse error');
            const mockParse = vi.fn((content, cb) => cb(parseError, null));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(importManager.error).toBe(parseError);
            expect(callback).toHaveBeenCalledWith(
                parseError,
                null,
                false,
                '/resolved/test.less'
            );
        });

        it('should not overwrite existing error', () => {
            const firstError = new Error('First error');
            const secondError = new Error('Second error');
            importManager.error = firstError;

            const callback = vi.fn();
            const mockParse = vi.fn((content, cb) => cb(secondError, null));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(importManager.error).toBe(firstError); // Should remain the first error
        });
    });

    describe('push - context creation', () => {
        beforeEach(() => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/test.less',
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should create new Parse context with processImports disabled', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));

            // eslint-disable-next-line no-unused-vars
            let capturedNewEnv;
            Parser.mockImplementation((newEnv) => {
                capturedNewEnv = newEnv;
                return { parse: mockParse };
            });

            // Mock contexts.Parse constructor
            const mockParseContext = { processImports: true };
            contexts.Parse.mockImplementation(() => mockParseContext);

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(contexts.Parse).toHaveBeenCalledWith(mockContext);
            expect(mockParseContext.processImports).toBe(false);
        });

        it('should create correct newFileInfo object', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));

            let capturedFileInfo;
            Parser.mockImplementation((newEnv, importManager, newFileInfo) => {
                capturedFileInfo = newFileInfo;
                return { parse: mockParse };
            });

            const currentFileInfo = {
                currentDirectory: '/current/',
                entryPath: '/entry/',
                rootpath: '/currentroot/',
                rootFilename: '/root.less'
            };

            importManager.push(
                '/test.less',
                true,
                currentFileInfo,
                {},
                callback
            );

            expect(capturedFileInfo).toEqual({
                rewriteUrls: mockContext.rewriteUrls,
                entryPath: '/entry/',
                rootpath: '/entry//root/../', // This is the result of path processing
                rootFilename: '/root.less',
                currentDirectory: '/resolved/',
                filename: '/resolved/test.less'
            });
        });
    });

    describe('edge cases and complex scenarios', () => {
        it('should handle empty file contents', () => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/empty.less',
                contents: ''
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);

            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset', rules: [] };
            const mockParse = vi.fn((content, cb) => {
                expect(content).toBe('');
                cb(null, mockRoot);
            });
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/empty.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                false,
                '/resolved/empty.less'
            );
        });

        it('should handle multiple simultaneous imports', () => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockImplementation((path) => ({
                filename: `/resolved${path}`,
                contents: `.${path.replace('/', '')} { color: red; }`
            }));
            mockFileManager.getPath.mockImplementation((filename) =>
                filename.replace(/\/[^/]*$/, '/')
            );
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);

            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const mockRoot1 = { type: 'Ruleset', name: 'test1' };
            const mockRoot2 = { type: 'Ruleset', name: 'test2' };

            let parseCallCount = 0;
            const mockParse = vi.fn((content, cb) => {
                parseCallCount++;
                const root = parseCallCount === 1 ? mockRoot1 : mockRoot2;
                cb(null, root);
            });
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/test1.less',
                true,
                mockRootFileInfo,
                {},
                callback1
            );
            importManager.push(
                '/test2.less',
                true,
                mockRootFileInfo,
                {},
                callback2
            );

            expect(callback1).toHaveBeenCalledWith(
                null,
                mockRoot1,
                false,
                '/resolved/test1.less'
            );
            expect(callback2).toHaveBeenCalledWith(
                null,
                mockRoot2,
                false,
                '/resolved/test2.less'
            );
            expect(importManager.queue).toEqual([]);
        });

        it('should handle very long file paths', () => {
            const longPath =
                '/very/long/path/that/goes/on/for/quite/a/while/and/has/many/segments/file.less';
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: `/resolved${longPath}`,
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue(
                '/resolved/very/long/path/that/goes/on/for/quite/a/while/and/has/many/segments/'
            );
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);

            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(longPath, true, mockRootFileInfo, {}, callback);

            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                false,
                `/resolved${longPath}`
            );
        });

        it('should handle special characters in file contents', () => {
            const specialContent = '.test { content: "特殊字符 🎨 \n\t\r"; }';
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/special.less',
                contents: specialContent
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);

            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => {
                expect(content).toBe(specialContent);
                cb(null, mockRoot);
            });
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/special.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(importManager.contents['/resolved/special.less']).toBe(
                specialContent
            );
        });
    });

    describe('utils.clone integration', () => {
        it('should clone context correctly', () => {
            const callback = vi.fn();

            // Spy on utils.clone to verify it's called
            const cloneSpy = vi.spyOn(utils, 'clone');

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(cloneSpy).toHaveBeenCalledWith(mockContext);
        });

        it('should not modify original context', () => {
            const originalContext = { ...mockContext };
            const callback = vi.fn();

            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                { isPlugin: true },
                callback
            );

            // Original context should be unchanged
            expect(mockContext).toEqual(originalContext);
        });
    });

    describe('additional edge cases', () => {
        beforeEach(() => {
            mockContext.syncImport = true;
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/test.less',
                contents: '.test { color: red; }'
            });
            mockFileManager.getPath.mockReturnValue('/resolved/');
            mockFileManager.join.mockImplementation((a, b) => `${a}${b}`);
            mockFileManager.pathDiff.mockReturnValue('../');
            mockFileManager.isPathAbsolute.mockReturnValue(false);
            mockFileManager.alwaysMakePathsAbsolute.mockReturnValue(true);
        });

        it('should handle null/undefined currentFileInfo gracefully', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            // Test with null currentFileInfo
            const nullFileInfo = null;

            // This would cause a runtime error if not handled properly
            expect(() => {
                importManager.push(
                    '/test.less',
                    true,
                    nullFileInfo,
                    {},
                    callback
                );
            }).toThrow();
        });

        it('should handle context without rewriteUrls property', () => {
            const contextWithoutRewrite = { ...mockContext };
            delete contextWithoutRewrite.rewriteUrls;

            const manager = new ImportManager(
                mockLess,
                contextWithoutRewrite,
                mockRootFileInfo
            );
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            manager.push('/test.less', true, mockRootFileInfo, {}, callback);

            expect(callback).toHaveBeenCalledWith(
                null,
                mockRoot,
                false,
                '/resolved/test.less'
            );
        });

        it('should handle import with both reference flags set', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));

            let capturedFileInfo;
            Parser.mockImplementation((newEnv, importManager, newFileInfo) => {
                capturedFileInfo = newFileInfo;
                return { parse: mockParse };
            });

            const currentFileInfo = {
                ...mockRootFileInfo,
                reference: true
            };
            const importOptions = { reference: true };

            importManager.push(
                '/test.less',
                true,
                currentFileInfo,
                importOptions,
                callback
            );

            expect(capturedFileInfo.reference).toBe(true);
        });

        it('should handle extremely large file contents', () => {
            const largeContent = '.test { color: red; }'.repeat(10000);
            mockFileManager.loadFileSync.mockReturnValue({
                filename: '/resolved/large.less',
                contents: largeContent
            });

            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => {
                expect(content).toBe(largeContent);
                cb(null, mockRoot);
            });
            Parser.mockImplementation(() => ({ parse: mockParse }));

            importManager.push(
                '/large.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(importManager.contents['/resolved/large.less']).toBe(
                largeContent
            );
        });

        it('should handle mixed sync and async operations correctly', () => {
            const syncCallback = vi.fn();
            const asyncCallback = vi.fn();

            // Setup for sync operation
            mockContext.syncImport = true;
            const mockRoot1 = { type: 'Ruleset', name: 'sync' };
            const mockParse1 = vi.fn((content, cb) => cb(null, mockRoot1));
            Parser.mockImplementation(() => ({ parse: mockParse1 }));

            // First call - sync
            importManager.push(
                '/sync.less',
                true,
                mockRootFileInfo,
                {},
                syncCallback
            );

            // Change to async for second call
            mockContext.syncImport = false;
            const mockRoot2 = { type: 'Ruleset', name: 'async' };
            const mockParse2 = vi.fn((content, cb) => cb(null, mockRoot2));
            Parser.mockImplementation(() => ({ parse: mockParse2 }));

            mockFileManager.loadFile.mockImplementation(
                (path, dir, context, env, cb) => {
                    cb(null, {
                        filename: '/resolved/async.less',
                        contents: '.async { color: blue; }'
                    });
                }
            );

            // Second call - async
            importManager.push(
                '/async.less',
                true,
                mockRootFileInfo,
                {},
                asyncCallback
            );

            expect(syncCallback).toHaveBeenCalledWith(
                null,
                mockRoot1,
                false,
                '/resolved/test.less'
            );
            expect(asyncCallback).toHaveBeenCalledWith(
                null,
                mockRoot2,
                false,
                '/resolved/async.less'
            );
        });

        it('should handle plugin args correctly', () => {
            const callback = vi.fn();
            const importOptions = {
                isPlugin: true,
                pluginArgs: { arg1: 'value1', arg2: 'value2' }
            };
            const mockPlugin = { name: 'test-plugin' };

            mockContext.pluginManager.Loader.loadPluginSync.mockReturnValue({
                filename: '/resolved/plugin.js',
                contents: 'module.exports = {};'
            });
            mockContext.pluginManager.Loader.evalPlugin.mockImplementation(
                (contents, env, manager, args) => {
                    expect(args).toEqual({ arg1: 'value1', arg2: 'value2' });
                    return mockPlugin;
                }
            );

            importManager.push(
                '/plugin',
                true,
                mockRootFileInfo,
                importOptions,
                callback
            );

            expect(
                mockContext.pluginManager.Loader.evalPlugin
            ).toHaveBeenCalledWith(
                'module.exports = {};',
                expect.any(Object),
                importManager,
                { arg1: 'value1', arg2: 'value2' },
                expect.any(Object)
            );
        });

        it('should handle multiple errors without losing the first error', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const firstError = new Error('First parse error');
            const secondError = new Error('Second parse error');

            // Setup different files to avoid caching issues
            mockFileManager.loadFileSync.mockImplementation((path) => {
                if (path === '/error1.less') {
                    return {
                        filename: '/resolved/error1.less',
                        contents: '.error1 { color: red; }'
                    };
                } else if (path === '/error2.less') {
                    return {
                        filename: '/resolved/error2.less',
                        contents: '.error2 { color: blue; }'
                    };
                }
                return {
                    filename: '/resolved/test.less',
                    contents: '.test { color: red; }'
                };
            });

            // First import with error
            const mockParse1 = vi.fn((content, cb) => cb(firstError, null));
            Parser.mockImplementation(() => ({ parse: mockParse1 }));

            importManager.push(
                '/error1.less',
                true,
                mockRootFileInfo,
                {},
                callback1
            );
            expect(importManager.error).toBe(firstError);

            // Second import with different error
            const mockParse2 = vi.fn((content, cb) => cb(secondError, null));
            Parser.mockImplementation(() => ({ parse: mockParse2 }));

            importManager.push(
                '/error2.less',
                true,
                mockRootFileInfo,
                {},
                callback2
            );

            // First error should be preserved
            expect(importManager.error).toBe(firstError);
            expect(callback1).toHaveBeenCalledWith(
                firstError,
                null,
                false,
                '/resolved/error1.less'
            );
            expect(callback2).toHaveBeenCalledWith(
                secondError,
                null,
                false,
                '/resolved/error2.less'
            );
        });

        it('should handle empty queue correctly', () => {
            expect(importManager.queue).toEqual([]);

            const callback = vi.fn();
            importManager.push(
                '/test.less',
                true,
                mockRootFileInfo,
                {},
                callback
            );

            // Path should be added then removed
            expect(importManager.queue).not.toContain('/test.less');
        });

        it('should handle paths with query parameters and fragments', () => {
            const callback = vi.fn();
            const mockRoot = { type: 'Ruleset' };
            const mockParse = vi.fn((content, cb) => cb(null, mockRoot));
            Parser.mockImplementation(() => ({ parse: mockParse }));

            const pathWithQuery = '/test.less?param=value#fragment';

            importManager.push(
                pathWithQuery,
                true,
                mockRootFileInfo,
                {},
                callback
            );

            expect(mockEnvironment.getFileManager).toHaveBeenCalledWith(
                pathWithQuery,
                mockRootFileInfo.currentDirectory,
                expect.any(Object),
                mockEnvironment
            );
        });
    });
});
