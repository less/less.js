import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Environment from './environment.js';
import logger from '../logger.js';

// Mock logger
vi.mock('../logger.js', () => ({
    default: {
        warn: vi.fn()
    }
}));

describe('Environment', () => {
    let mockFileManager;
    let mockFileManager2;
    let mockPluginManager;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockFileManager = {
            supports: vi.fn(),
            supportsSync: vi.fn()
        };
        
        mockFileManager2 = {
            supports: vi.fn(),
            supportsSync: vi.fn()
        };

        mockPluginManager = {
            getFileManagers: vi.fn(() => [mockFileManager2])
        };
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        it('should create an Environment with empty fileManagers when none provided', () => {
            const env = new Environment();
            expect(env.fileManagers).toEqual([]);
        });

        it('should create an Environment with provided fileManagers', () => {
            const fileManagers = [mockFileManager];
            const env = new Environment(null, fileManagers);
            expect(env.fileManagers).toBe(fileManagers);
        });

        it('should handle null externalEnvironment', () => {
            const env = new Environment(null);
            expect(env.fileManagers).toEqual([]);
        });

        it('should handle undefined externalEnvironment', () => {
            const env = new Environment(undefined);
            expect(env.fileManagers).toEqual([]);
        });

        it('should bind optional functions from externalEnvironment', () => {
            const mockEncodeBase64 = vi.fn();
            const mockMimeLookup = vi.fn();
            const mockCharsetLookup = vi.fn();
            const mockGetSourceMapGenerator = vi.fn();
            
            const externalEnv = {
                encodeBase64: mockEncodeBase64,
                mimeLookup: mockMimeLookup,
                charsetLookup: mockCharsetLookup,
                getSourceMapGenerator: mockGetSourceMapGenerator,
                someOtherProp: 'ignored'
            };

            const env = new Environment(externalEnv);

            expect(env.encodeBase64).toBeDefined();
            expect(env.mimeLookup).toBeDefined();
            expect(env.charsetLookup).toBeDefined();
            expect(env.getSourceMapGenerator).toBeDefined();
            expect(env.someOtherProp).toBeUndefined();
        });

        it('should bind functions with correct context', () => {
            const externalEnv = {
                testValue: 'test',
                encodeBase64: function() {
                    return this.testValue;
                }
            };

            const env = new Environment(externalEnv);
            expect(env.encodeBase64()).toBe('test');
        });

        it('should handle missing optional functions gracefully', () => {
            const externalEnv = {
                encodeBase64: vi.fn()
                // missing mimeLookup, charsetLookup, getSourceMapGenerator
            };

            const env = new Environment(externalEnv);

            expect(env.encodeBase64).toBeDefined();
            expect(env.mimeLookup).toBeUndefined();
            expect(env.charsetLookup).toBeUndefined();
            expect(env.getSourceMapGenerator).toBeUndefined();
        });

        it('should not warn for missing optional functions', () => {
            new Environment({});
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('should handle empty externalEnvironment object', () => {
            const env = new Environment({});
            expect(env.encodeBase64).toBeUndefined();
            expect(env.mimeLookup).toBeUndefined();
            expect(env.charsetLookup).toBeUndefined();
            expect(env.getSourceMapGenerator).toBeUndefined();
        });
    });

    describe('getFileManager', () => {
        let env;

        beforeEach(() => {
            env = new Environment(null, [mockFileManager]);
        });

        it('should warn when filename is not provided', () => {
            env.getFileManager(undefined, '/path', {});
            expect(logger.warn).toHaveBeenCalledWith('getFileManager called with no filename.. Please report this issue. continuing.');
        });

        it('should warn when filename is empty string', () => {
            env.getFileManager('', '/path', {});
            expect(logger.warn).toHaveBeenCalledWith('getFileManager called with no filename.. Please report this issue. continuing.');
        });

        it('should warn when currentDirectory is undefined', () => {
            env.getFileManager('test.less', undefined, {});
            expect(logger.warn).toHaveBeenCalledWith('getFileManager called with null directory.. Please report this issue. continuing.');
        });

        it('should not warn when currentDirectory is null', () => {
            mockFileManager.supports.mockReturnValue(true);
            env.getFileManager('test.less', null, {});
            expect(logger.warn).toHaveBeenCalledTimes(0);
        });

        it('should not warn when currentDirectory is empty string', () => {
            mockFileManager.supports.mockReturnValue(true);
            env.getFileManager('test.less', '', {});
            expect(logger.warn).toHaveBeenCalledTimes(0);
        });

        it('should return file manager that supports the file (async)', () => {
            mockFileManager.supports.mockReturnValue(true);
            
            const result = env.getFileManager('test.less', '/path', {}, {}, false);
            
            expect(mockFileManager.supports).toHaveBeenCalledWith('test.less', '/path', {}, {});
            expect(result).toBe(mockFileManager);
        });

        it('should return file manager that supports the file (sync)', () => {
            mockFileManager.supportsSync.mockReturnValue(true);
            
            const result = env.getFileManager('test.less', '/path', {}, {}, true);
            
            expect(mockFileManager.supportsSync).toHaveBeenCalledWith('test.less', '/path', {}, {});
            expect(result).toBe(mockFileManager);
        });

        it('should return null when no file manager supports the file', () => {
            mockFileManager.supports.mockReturnValue(false);
            
            const result = env.getFileManager('test.less', '/path', {}, {}, false);
            
            expect(result).toBe(null);
        });

        it('should check file managers in reverse order', () => {
            const fileManager1 = { supports: vi.fn(() => false) };
            const fileManager2 = { supports: vi.fn(() => true) };
            const fileManager3 = { supports: vi.fn(() => true) };
            
            env.fileManagers = [fileManager1, fileManager2, fileManager3];
            
            const result = env.getFileManager('test.less', '/path', {}, {}, false);
            
            // Should check in reverse order and return the last one that supports
            expect(fileManager3.supports).toHaveBeenCalled();
            expect(fileManager2.supports).not.toHaveBeenCalled();
            expect(fileManager1.supports).not.toHaveBeenCalled();
            expect(result).toBe(fileManager3);
        });

        it('should include plugin manager file managers when pluginManager is provided', () => {
            const options = { pluginManager: mockPluginManager };
            mockFileManager2.supports.mockReturnValue(true);
            
            const result = env.getFileManager('test.less', '/path', options, {}, false);
            
            expect(mockPluginManager.getFileManagers).toHaveBeenCalled();
            expect(mockFileManager2.supports).toHaveBeenCalledWith('test.less', '/path', options, {});
            expect(result).toBe(mockFileManager2);
        });

        it('should prioritize plugin manager file managers over environment file managers', () => {
            const options = { pluginManager: mockPluginManager };
            mockFileManager.supports.mockReturnValue(true);
            mockFileManager2.supports.mockReturnValue(true);
            
            const result = env.getFileManager('test.less', '/path', options, {}, false);
            
            // Plugin manager file managers come after environment file managers,
            // so they're checked first (reverse order)
            expect(mockFileManager2.supports).toHaveBeenCalled();
            expect(mockFileManager.supports).not.toHaveBeenCalled();
            expect(result).toBe(mockFileManager2);
        });

        it('should handle empty plugin manager file managers', () => {
            const emptyPluginManager = { getFileManagers: vi.fn(() => []) };
            const options = { pluginManager: emptyPluginManager };
            mockFileManager.supports.mockReturnValue(true);
            
            const result = env.getFileManager('test.less', '/path', options, {}, false);
            
            expect(result).toBe(mockFileManager);
        });

        it('should handle options without pluginManager', () => {
            const options = {};
            mockFileManager.supports.mockReturnValue(true);
            
            const result = env.getFileManager('test.less', '/path', options, {}, false);
            
            expect(result).toBe(mockFileManager);
        });

        it('should handle null options', () => {
            mockFileManager.supports.mockReturnValue(true);
            
            // The original code has a bug - it doesn't handle null options
            // This test documents the current behavior
            expect(() => {
                env.getFileManager('test.less', '/path', null, {}, false);
            }).toThrow();
        });

        it('should handle undefined options', () => {
            mockFileManager.supports.mockReturnValue(true);
            
            // The original code has a bug - it doesn't handle undefined options
            // This test documents the current behavior
            expect(() => {
                env.getFileManager('test.less', '/path', undefined, {}, false);
            }).toThrow();
        });

        it('should pass all parameters to supports method', () => {
            const filename = 'test.less';
            const currentDirectory = '/some/path';
            const options = { compress: true };
            const environment = { debug: true };
            
            mockFileManager.supports.mockReturnValue(true);
            
            env.getFileManager(filename, currentDirectory, options, environment, false);
            
            expect(mockFileManager.supports).toHaveBeenCalledWith(filename, currentDirectory, options, environment);
        });

        it('should pass all parameters to supportsSync method', () => {
            const filename = 'test.less';
            const currentDirectory = '/some/path';
            const options = { compress: true };
            const environment = { debug: true };
            
            mockFileManager.supportsSync.mockReturnValue(true);
            
            env.getFileManager(filename, currentDirectory, options, environment, true);
            
            expect(mockFileManager.supportsSync).toHaveBeenCalledWith(filename, currentDirectory, options, environment);
        });
    });

    describe('addFileManager', () => {
        it('should add file manager to the list', () => {
            const env = new Environment();
            expect(env.fileManagers).toHaveLength(0);
            
            env.addFileManager(mockFileManager);
            
            expect(env.fileManagers).toHaveLength(1);
            expect(env.fileManagers[0]).toBe(mockFileManager);
        });

        it('should add multiple file managers', () => {
            const env = new Environment();
            
            env.addFileManager(mockFileManager);
            env.addFileManager(mockFileManager2);
            
            expect(env.fileManagers).toHaveLength(2);
            expect(env.fileManagers[0]).toBe(mockFileManager);
            expect(env.fileManagers[1]).toBe(mockFileManager2);
        });

        it('should add file manager to existing list', () => {
            const env = new Environment(null, [mockFileManager]);
            expect(env.fileManagers).toHaveLength(1);
            
            env.addFileManager(mockFileManager2);
            
            expect(env.fileManagers).toHaveLength(2);
            expect(env.fileManagers[0]).toBe(mockFileManager);
            expect(env.fileManagers[1]).toBe(mockFileManager2);
        });

        it('should handle null file manager', () => {
            const env = new Environment();
            
            env.addFileManager(null);
            
            expect(env.fileManagers).toHaveLength(1);
            expect(env.fileManagers[0]).toBe(null);
        });

        it('should handle undefined file manager', () => {
            const env = new Environment();
            
            env.addFileManager(undefined);
            
            expect(env.fileManagers).toHaveLength(1);
            expect(env.fileManagers[0]).toBe(undefined);
        });
    });

    describe('clearFileManagers', () => {
        it('should clear empty file managers list', () => {
            const env = new Environment();
            
            env.clearFileManagers();
            
            expect(env.fileManagers).toEqual([]);
        });

        it('should clear file managers list with items', () => {
            const env = new Environment(null, [mockFileManager, mockFileManager2]);
            expect(env.fileManagers).toHaveLength(2);
            
            env.clearFileManagers();
            
            expect(env.fileManagers).toEqual([]);
        });

        it('should allow adding file managers after clearing', () => {
            const env = new Environment(null, [mockFileManager]);
            
            env.clearFileManagers();
            env.addFileManager(mockFileManager2);
            
            expect(env.fileManagers).toHaveLength(1);
            expect(env.fileManagers[0]).toBe(mockFileManager2);
        });
    });

    describe('integration tests', () => {
        it('should work with complete workflow', () => {
            const externalEnv = {
                encodeBase64: vi.fn(() => 'encoded'),
                mimeLookup: vi.fn(() => 'text/css')
            };
            
            const env = new Environment(externalEnv, [mockFileManager]);
            
            // Test external environment functions
            expect(env.encodeBase64()).toBe('encoded');
            expect(env.mimeLookup()).toBe('text/css');
            
            // Test file manager operations
            env.addFileManager(mockFileManager2);
            expect(env.fileManagers).toHaveLength(2);
            
            // Test getFileManager
            mockFileManager2.supports.mockReturnValue(true);
            const result = env.getFileManager('test.less', '/path', {}, {}, false);
            expect(result).toBe(mockFileManager2);
            
            // Test clear
            env.clearFileManagers();
            expect(env.fileManagers).toHaveLength(0);
        });

        it('should handle complex plugin manager scenario', () => {
            const pluginFileManager1 = { supports: vi.fn(() => false) };
            const pluginFileManager2 = { supports: vi.fn(() => true) };
            const complexPluginManager = {
                getFileManagers: vi.fn(() => [pluginFileManager1, pluginFileManager2])
            };
            
            const env = new Environment(null, [mockFileManager]);
            mockFileManager.supports.mockReturnValue(true);
            
            const options = { pluginManager: complexPluginManager };
            const result = env.getFileManager('test.less', '/path', options, {}, false);
            
            // Should return the plugin file manager that supports (checked first due to reverse order)
            expect(result).toBe(pluginFileManager2);
            expect(pluginFileManager2.supports).toHaveBeenCalled();
            expect(pluginFileManager1.supports).not.toHaveBeenCalled();
            expect(mockFileManager.supports).not.toHaveBeenCalled();
        });
    });
});