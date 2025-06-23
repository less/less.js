import { describe, it, expect, beforeEach, vi } from 'vitest';
import PluginManagerFactory from './plugin-manager';

describe('PluginManagerFactory', () => {
    let mockLess;
    let mockPluginLoader;

    beforeEach(() => {
        mockPluginLoader = {
            // Mock PluginLoader methods if needed
        };
        
        mockLess = {
            PluginLoader: vi.fn(() => mockPluginLoader),
            functions: {
                functionRegistry: {}
            }
        };
    });

    describe('Factory Function', () => {
        it('should create a new PluginManager instance when first called', () => {
            const pm1 = PluginManagerFactory(mockLess);
            expect(pm1).toBeDefined();
            expect(mockLess.PluginLoader).toHaveBeenCalledWith(mockLess);
        });

        it('should return the same instance on subsequent calls', () => {
            const pm1 = PluginManagerFactory(mockLess);
            const pm2 = PluginManagerFactory(mockLess);
            expect(pm1).toBe(pm2);
        });

        it('should create a new instance when newFactory is true', () => {
            const pm1 = PluginManagerFactory(mockLess);
            const pm2 = PluginManagerFactory(mockLess, true);
            expect(pm1).not.toBe(pm2);
        });
    });

    describe('PluginManager Constructor', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should initialize with correct default values', () => {
            expect(pluginManager.less).toBe(mockLess);
            expect(pluginManager.visitors).toEqual([]);
            expect(pluginManager.preProcessors).toEqual([]);
            expect(pluginManager.postProcessors).toEqual([]);
            expect(pluginManager.installedPlugins).toEqual([]);
            expect(pluginManager.fileManagers).toEqual([]);
            expect(pluginManager.iterator).toBe(-1);
            expect(pluginManager.pluginCache).toEqual({});
            expect(pluginManager.Loader).toBe(mockPluginLoader);
        });
    });

    describe('addPlugins', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should add multiple plugins from array', () => {
            const plugin1 = { name: 'plugin1' };
            const plugin2 = { name: 'plugin2' };
            const plugins = [plugin1, plugin2];

            pluginManager.addPlugins(plugins);

            expect(pluginManager.installedPlugins).toEqual([plugin1, plugin2]);
        });

        it('should handle empty array', () => {
            pluginManager.addPlugins([]);
            expect(pluginManager.installedPlugins).toEqual([]);
        });

        it('should handle null/undefined plugins', () => {
            pluginManager.addPlugins(null);
            expect(pluginManager.installedPlugins).toEqual([]);
            
            pluginManager.addPlugins(undefined);
            expect(pluginManager.installedPlugins).toEqual([]);
        });

        it('should call addPlugin for each plugin in array', () => {
            const plugin1 = { name: 'plugin1' };
            const plugin2 = { name: 'plugin2' };
            const plugins = [plugin1, plugin2];

            const addPluginSpy = vi.spyOn(pluginManager, 'addPlugin');
            pluginManager.addPlugins(plugins);

            expect(addPluginSpy).toHaveBeenCalledTimes(2);
            expect(addPluginSpy).toHaveBeenCalledWith(plugin1);
            expect(addPluginSpy).toHaveBeenCalledWith(plugin2);
        });
    });

    describe('addPlugin', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should add plugin to installedPlugins', () => {
            const plugin = { name: 'testPlugin' };
            pluginManager.addPlugin(plugin);
            expect(pluginManager.installedPlugins).toContain(plugin);
        });

        it('should cache plugin with filename when provided', () => {
            const plugin = { name: 'testPlugin' };
            const filename = 'test-plugin.js';
            
            pluginManager.addPlugin(plugin, filename);
            
            expect(pluginManager.pluginCache[filename]).toBe(plugin);
        });

        it('should not cache plugin when filename is not provided', () => {
            const plugin = { name: 'testPlugin' };
            pluginManager.addPlugin(plugin);
            expect(Object.keys(pluginManager.pluginCache)).toHaveLength(0);
        });

        it('should call plugin.install when install method exists', () => {
            const plugin = {
                name: 'testPlugin',
                install: vi.fn()
            };
            const filename = 'test-plugin.js';
            
            pluginManager.addPlugin(plugin, filename);
            
            expect(plugin.install).toHaveBeenCalledWith(
                mockLess,
                pluginManager,
                mockLess.functions.functionRegistry
            );
        });

        it('should use custom functionRegistry when provided', () => {
            const plugin = {
                name: 'testPlugin',
                install: vi.fn()
            };
            const customRegistry = { custom: true };
            
            pluginManager.addPlugin(plugin, null, customRegistry);
            
            expect(plugin.install).toHaveBeenCalledWith(
                mockLess,
                pluginManager,
                customRegistry
            );
        });

        it('should not call install when plugin has no install method', () => {
            const plugin = { name: 'testPlugin' };
            
            expect(() => {
                pluginManager.addPlugin(plugin);
            }).not.toThrow();
            
            expect(pluginManager.installedPlugins).toContain(plugin);
        });
    });

    describe('get', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should return cached plugin by filename', () => {
            const plugin = { name: 'testPlugin' };
            const filename = 'test-plugin.js';
            
            pluginManager.addPlugin(plugin, filename);
            
            expect(pluginManager.get(filename)).toBe(plugin);
        });

        it('should return undefined for non-existent filename', () => {
            expect(pluginManager.get('non-existent.js')).toBeUndefined();
        });
    });

    describe('addVisitor', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should add visitor to visitors array', () => {
            const visitor = { name: 'testVisitor' };
            pluginManager.addVisitor(visitor);
            expect(pluginManager.visitors).toContain(visitor);
        });

        it('should add multiple visitors in order', () => {
            const visitor1 = { name: 'visitor1' };
            const visitor2 = { name: 'visitor2' };
            
            pluginManager.addVisitor(visitor1);
            pluginManager.addVisitor(visitor2);
            
            expect(pluginManager.visitors).toEqual([visitor1, visitor2]);
        });
    });

    describe('addPreProcessor', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should add preProcessor with priority', () => {
            const preProcessor = { name: 'testPreProcessor' };
            const priority = 1000;
            
            pluginManager.addPreProcessor(preProcessor, priority);
            
            expect(pluginManager.preProcessors).toHaveLength(1);
            expect(pluginManager.preProcessors[0]).toEqual({
                preProcessor,
                priority
            });
        });

        it('should insert preProcessors in priority order (ascending)', () => {
            const preProcessor1 = { name: 'high' };
            const preProcessor2 = { name: 'low' };
            const preProcessor3 = { name: 'medium' };
            
            pluginManager.addPreProcessor(preProcessor1, 2000);
            pluginManager.addPreProcessor(preProcessor2, 500);
            pluginManager.addPreProcessor(preProcessor3, 1000);
            
            expect(pluginManager.preProcessors).toEqual([
                { preProcessor: preProcessor2, priority: 500 },
                { preProcessor: preProcessor3, priority: 1000 },
                { preProcessor: preProcessor1, priority: 2000 }
            ]);
        });

        it('should handle same priority correctly', () => {
            const preProcessor1 = { name: 'first' };
            const preProcessor2 = { name: 'second' };
            
            pluginManager.addPreProcessor(preProcessor1, 1000);
            pluginManager.addPreProcessor(preProcessor2, 1000);
            
            expect(pluginManager.preProcessors).toEqual([
                { preProcessor: preProcessor2, priority: 1000 },
                { preProcessor: preProcessor1, priority: 1000 }
            ]);
        });
    });

    describe('addPostProcessor', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should add postProcessor with priority', () => {
            const postProcessor = { name: 'testPostProcessor' };
            const priority = 1000;
            
            pluginManager.addPostProcessor(postProcessor, priority);
            
            expect(pluginManager.postProcessors).toHaveLength(1);
            expect(pluginManager.postProcessors[0]).toEqual({
                postProcessor,
                priority
            });
        });

        it('should insert postProcessors in priority order (ascending)', () => {
            const postProcessor1 = { name: 'high' };
            const postProcessor2 = { name: 'low' };
            const postProcessor3 = { name: 'medium' };
            
            pluginManager.addPostProcessor(postProcessor1, 2000);
            pluginManager.addPostProcessor(postProcessor2, 500);
            pluginManager.addPostProcessor(postProcessor3, 1000);
            
            expect(pluginManager.postProcessors).toEqual([
                { postProcessor: postProcessor2, priority: 500 },
                { postProcessor: postProcessor3, priority: 1000 },
                { postProcessor: postProcessor1, priority: 2000 }
            ]);
        });

        it('should handle same priority correctly', () => {
            const postProcessor1 = { name: 'first' };
            const postProcessor2 = { name: 'second' };
            
            pluginManager.addPostProcessor(postProcessor1, 1000);
            pluginManager.addPostProcessor(postProcessor2, 1000);
            
            expect(pluginManager.postProcessors).toEqual([
                { postProcessor: postProcessor2, priority: 1000 },
                { postProcessor: postProcessor1, priority: 1000 }
            ]);
        });
    });

    describe('addFileManager', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should add file manager to fileManagers array', () => {
            const manager = { name: 'testFileManager' };
            pluginManager.addFileManager(manager);
            expect(pluginManager.fileManagers).toContain(manager);
        });

        it('should add multiple file managers in order', () => {
            const manager1 = { name: 'manager1' };
            const manager2 = { name: 'manager2' };
            
            pluginManager.addFileManager(manager1);
            pluginManager.addFileManager(manager2);
            
            expect(pluginManager.fileManagers).toEqual([manager1, manager2]);
        });
    });

    describe('getPreProcessors', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should return array of preProcessors only', () => {
            const preProcessor1 = { name: 'pre1' };
            const preProcessor2 = { name: 'pre2' };
            
            pluginManager.addPreProcessor(preProcessor1, 1000);
            pluginManager.addPreProcessor(preProcessor2, 500);
            
            const result = pluginManager.getPreProcessors();
            expect(result).toEqual([preProcessor2, preProcessor1]);
        });

        it('should return empty array when no preProcessors', () => {
            expect(pluginManager.getPreProcessors()).toEqual([]);
        });
    });

    describe('getPostProcessors', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should return array of postProcessors only', () => {
            const postProcessor1 = { name: 'post1' };
            const postProcessor2 = { name: 'post2' };
            
            pluginManager.addPostProcessor(postProcessor1, 1000);
            pluginManager.addPostProcessor(postProcessor2, 500);
            
            const result = pluginManager.getPostProcessors();
            expect(result).toEqual([postProcessor2, postProcessor1]);
        });

        it('should return empty array when no postProcessors', () => {
            expect(pluginManager.getPostProcessors()).toEqual([]);
        });
    });

    describe('getVisitors', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should return visitors array', () => {
            const visitor1 = { name: 'visitor1' };
            const visitor2 = { name: 'visitor2' };
            
            pluginManager.addVisitor(visitor1);
            pluginManager.addVisitor(visitor2);
            
            expect(pluginManager.getVisitors()).toEqual([visitor1, visitor2]);
        });

        it('should return empty array when no visitors', () => {
            expect(pluginManager.getVisitors()).toEqual([]);
        });
    });

    describe('getFileManagers', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should return fileManagers array', () => {
            const manager1 = { name: 'manager1' };
            const manager2 = { name: 'manager2' };
            
            pluginManager.addFileManager(manager1);
            pluginManager.addFileManager(manager2);
            
            expect(pluginManager.getFileManagers()).toEqual([manager1, manager2]);
        });

        it('should return empty array when no file managers', () => {
            expect(pluginManager.getFileManagers()).toEqual([]);
        });
    });

    describe('visitor iterator', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should return visitor iterator object', () => {
            const iterator = pluginManager.visitor();
            expect(iterator).toHaveProperty('first');
            expect(iterator).toHaveProperty('get');
            expect(typeof iterator.first).toBe('function');
            expect(typeof iterator.get).toBe('function');
        });

        it('should reset iterator with first() and return undefined for empty visitors', () => {
            const iterator = pluginManager.visitor();
            const result = iterator.first();
            
            expect(pluginManager.iterator).toBe(-1);
            expect(result).toBeUndefined();
        });

        it('should iterate through visitors with get()', () => {
            const visitor1 = { name: 'visitor1' };
            const visitor2 = { name: 'visitor2' };
            
            pluginManager.addVisitor(visitor1);
            pluginManager.addVisitor(visitor2);
            
            const iterator = pluginManager.visitor();
            iterator.first();
            
            const first = iterator.get();
            const second = iterator.get();
            const third = iterator.get();
            
            expect(first).toBe(visitor1);
            expect(second).toBe(visitor2);
            expect(third).toBeUndefined();
        });

        it('should handle multiple iterator calls correctly', () => {
            const visitor1 = { name: 'visitor1' };
            const visitor2 = { name: 'visitor2' };
            
            pluginManager.addVisitor(visitor1);
            pluginManager.addVisitor(visitor2);
            
            const iterator = pluginManager.visitor();
            
            // First iteration
            iterator.first();
            expect(iterator.get()).toBe(visitor1);
            expect(iterator.get()).toBe(visitor2);
            
            // Reset and iterate again
            iterator.first();
            expect(iterator.get()).toBe(visitor1);
            expect(iterator.get()).toBe(visitor2);
        });

        it('should maintain iterator state across multiple get() calls', () => {
            const visitor1 = { name: 'visitor1' };
            const visitor2 = { name: 'visitor2' };
            const visitor3 = { name: 'visitor3' };
            
            pluginManager.addVisitor(visitor1);
            pluginManager.addVisitor(visitor2);
            pluginManager.addVisitor(visitor3);
            
            const iterator = pluginManager.visitor();
            iterator.first();
            
            expect(pluginManager.iterator).toBe(-1);
            expect(iterator.get()).toBe(visitor1);
            expect(pluginManager.iterator).toBe(0);
            expect(iterator.get()).toBe(visitor2);
            expect(pluginManager.iterator).toBe(1);
            expect(iterator.get()).toBe(visitor3);
            expect(pluginManager.iterator).toBe(2);
            expect(iterator.get()).toBeUndefined();
            expect(pluginManager.iterator).toBe(3);
        });
    });

    describe('Integration Tests', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should handle complex plugin with all features', () => {
            const mockVisitor = { name: 'pluginVisitor' };
            const mockPreProcessor = { name: 'pluginPreProcessor' };
            const mockPostProcessor = { name: 'pluginPostProcessor' };
            const mockFileManager = { name: 'pluginFileManager' };
            
            const complexPlugin = {
                name: 'complexPlugin',
                install: vi.fn((less, pluginManager) => {
                    pluginManager.addVisitor(mockVisitor);
                    pluginManager.addPreProcessor(mockPreProcessor, 1000);
                    pluginManager.addPostProcessor(mockPostProcessor, 1000);
                    pluginManager.addFileManager(mockFileManager);
                })
            };
            
            pluginManager.addPlugin(complexPlugin, 'complex-plugin.js');
            
            expect(complexPlugin.install).toHaveBeenCalled();
            expect(pluginManager.get('complex-plugin.js')).toBe(complexPlugin);
            expect(pluginManager.getVisitors()).toContain(mockVisitor);
            expect(pluginManager.getPreProcessors()).toContain(mockPreProcessor);
            expect(pluginManager.getPostProcessors()).toContain(mockPostProcessor);
            expect(pluginManager.getFileManagers()).toContain(mockFileManager);
        });

        it('should handle multiple plugins with priority ordering', () => {
            const earlyPreProcessor = { name: 'early' };
            const latePreProcessor = { name: 'late' };
            const middlePreProcessor = { name: 'middle' };
            
            const plugin1 = {
                install: (less, pm) => pm.addPreProcessor(latePreProcessor, 2000)
            };
            const plugin2 = {
                install: (less, pm) => pm.addPreProcessor(earlyPreProcessor, 500)
            };
            const plugin3 = {
                install: (less, pm) => pm.addPreProcessor(middlePreProcessor, 1000)
            };
            
            pluginManager.addPlugins([plugin1, plugin2, plugin3]);
            
            const processors = pluginManager.getPreProcessors();
            expect(processors).toEqual([earlyPreProcessor, middlePreProcessor, latePreProcessor]);
        });

        it('should maintain separate instances when newFactory is used', () => {
            const pm1 = PluginManagerFactory(mockLess, true);
            const pm2 = PluginManagerFactory(mockLess, true);
            
            const visitor1 = { name: 'visitor1' };
            const visitor2 = { name: 'visitor2' };
            
            pm1.addVisitor(visitor1);
            pm2.addVisitor(visitor2);
            
            expect(pm1.getVisitors()).toEqual([visitor1]);
            expect(pm2.getVisitors()).toEqual([visitor2]);
        });
    });

    describe('Edge Cases', () => {
        let pluginManager;

        beforeEach(() => {
            pluginManager = PluginManagerFactory(mockLess, true);
        });

        it('should handle null/undefined plugins gracefully', () => {
            expect(() => {
                pluginManager.addPlugin(null);
            }).toThrow('Cannot read properties of null');
            
            expect(() => {
                pluginManager.addPlugin(undefined);
            }).toThrow('Cannot read properties of undefined');
        });

        it('should handle plugins with install method that throws', () => {
            const faultyPlugin = {
                install: () => {
                    throw new Error('Installation failed');
                }
            };
            
            expect(() => {
                pluginManager.addPlugin(faultyPlugin);
            }).toThrow('Installation failed');
        });

        it('should handle negative priorities', () => {
            const processor1 = { name: 'negative' };
            const processor2 = { name: 'positive' };
            
            pluginManager.addPreProcessor(processor1, -100);
            pluginManager.addPreProcessor(processor2, 100);
            
            expect(pluginManager.getPreProcessors()).toEqual([processor1, processor2]);
        });

        it('should handle zero priority', () => {
            const processor = { name: 'zero' };
            
            pluginManager.addPreProcessor(processor, 0);
            
            expect(pluginManager.getPreProcessors()).toEqual([processor]);
        });

        it('should handle very large arrays', () => {
            const visitors = Array.from({ length: 1000 }, (_, i) => ({ name: `visitor${i}` }));
            
            visitors.forEach(visitor => pluginManager.addVisitor(visitor));
            
            expect(pluginManager.getVisitors()).toHaveLength(1000);
            expect(pluginManager.getVisitors()[0]).toEqual({ name: 'visitor0' });
            expect(pluginManager.getVisitors()[999]).toEqual({ name: 'visitor999' });
        });
    });
});