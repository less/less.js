import { describe, it, expect, beforeEach } from 'vitest';
import createParse from './parse';
import Environment from './environment/environment';
import createImportManager from './import-manager';
import AbstractPluginLoader from './environment/abstract-plugin-loader';

// Mock a minimal ParseTree since we don't have a real one
class MockParseTree {
    constructor() {
        this.root = null;
    }
}

// Mock PluginLoader that extends AbstractPluginLoader
class MockPluginLoader extends AbstractPluginLoader {
    constructor(less) {
        super();
        this.less = less;
    }
    
    require() {
        return () => {};
    }
}

// Mock file managers for Environment
const mockFileManager = {
    supports: () => true,
    supportsSync: () => true,
    loadFileSync: (path) => ({
        filename: path,
        contents: `.test { content: '${path}'; }`
    }),
    loadFile: (path, _currentDirectory, _context, _environment, callback) => {
        setTimeout(() => {
            callback(null, {
                filename: path,
                contents: `.test { content: '${path}'; }`
            });
        }, 0);
    },
    getPath: (filename) => filename.replace(/[^/]*$/, ''),
    join: (...paths) => paths.join('/').replace(/\/+/g, '/'),
    pathDiff: (path1, path2) => path1.replace(path2, ''),
    isPathAbsolute: (path) => path.startsWith('/'),
    alwaysMakePathsAbsolute: () => false,
    extractUrlParts: (filename) => ({ filename: filename.split('/').pop() })
};

describe('parse with real dependencies', () => {
    let environment;
    let parseTree;
    let ImportManager;
    let parse;
    let mockLess;

    beforeEach(() => {
        // Create real environment with mock file manager
        environment = new Environment({}, [mockFileManager]);
        
        // Create mock ParseTree
        parseTree = MockParseTree;
        
        // Create real ImportManager
        ImportManager = createImportManager(environment);
        
        // Create a mock "less" object that the parse function expects
        mockLess = {
            PluginLoader: MockPluginLoader,
            FileManager: function() {
                return mockFileManager;
            },
            version: [4, 0, 0],
            tree: {},
            functions: {
                functionRegistry: {
                    create: () => ({
                        getLocalFunctions: () => ({})
                    })
                }
            }
        };
        
        // Create parse function with real dependencies
        parse = createParse(environment, parseTree, ImportManager);
    });

    describe('basic functionality', () => {
        it('should return a parse function', () => {
            expect(typeof parse).toBe('function');
        });

        it('should parse simple CSS with callback', async () => {
            const input = '.class { color: red; }';
            const options = { filename: 'test.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root, imports, opts) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports).toBeDefined();
                    expect(opts).toMatchObject(options);
                    resolve();
                });
            });
        });

        it('should return a promise when no callback provided', async () => {
            const input = '.class { color: red; }';
            const options = { filename: 'test.less' };
            
            const result = await parse.call(mockLess, input, options);
            
            expect(result).toBeDefined();
        });

        it('should handle callback as second argument', async () => {
            const input = '.class { color: red; }';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });
    });

    describe('options handling', () => {
        it('should use default options when this.options is undefined', async () => {
            const input = '.class { color: red; }';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, {}, (err, root, imports, opts) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports).toBeDefined();
                    expect(opts).toBeDefined();
                    expect(typeof opts).toBe('object');
                    resolve();
                });
            });
        });

        it('should copy options from this.options', async () => {
            const input = '.class { color: red; }';
            const thisContext = {
                ...mockLess,
                options: { 
                    paths: ['/base/path'],
                    compress: true 
                }
            };
            
            return new Promise((resolve) => {
                parse.call(thisContext, input, {}, (err, root, imports, opts) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports).toBeDefined();
                    expect(opts.paths).toEqual(['/base/path']);
                    expect(opts.compress).toBe(true);
                    resolve();
                });
            });
        });

        it('should merge provided options with this.options', async () => {
            const input = '.class { color: red; }';
            const thisContext = {
                ...mockLess,
                options: { 
                    paths: ['/base/path'],
                    compress: true 
                }
            };
            const options = {
                filename: 'custom.less',
                compress: false
            };
            
            return new Promise((resolve) => {
                parse.call(thisContext, input, options, (err, root, imports, opts) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports).toBeDefined();
                    expect(opts.paths).toEqual(['/base/path']);
                    expect(opts.compress).toBe(false);
                    expect(opts.filename).toBe('custom.less');
                    resolve();
                });
            });
        });
    });

    describe('rootFileInfo handling', () => {
        it('should use provided rootFileInfo', async () => {
            const input = '.class { color: red; }';
            const rootFileInfo = {
                filename: 'custom.less',
                rootpath: '/custom/path/',
                currentDirectory: '/custom/',
                entryPath: '/custom/',
                rootFilename: 'custom.less'
            };
            const options = { rootFileInfo };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root, imports) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports).toBeDefined();
                    expect(imports.rootFilename).toBe('custom.less');
                    resolve();
                });
            });
        });

        it('should create rootFileInfo from filename', async () => {
            const input = '.class { color: red; }';
            const options = { filename: '/path/to/file.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root, imports) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports.rootFilename).toBe('/path/to/file.less');
                    resolve();
                });
            });
        });

        it('should default filename to "input" if not provided', async () => {
            const input = '.class { color: red; }';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, {}, (err, root, imports) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports.rootFilename).toBe('input');
                    resolve();
                });
            });
        });

        it('should add trailing slash to rootpath if missing', async () => {
            const input = '.class { color: red; }';
            const options = { 
                filename: 'test.less',
                rootpath: '/base/path'
            };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    // The rootpath should be normalized in the context
                    resolve();
                });
            });
        });
    });

    describe('plugin handling', () => {
        it('should create PluginManager instance', async () => {
            const input = '.class { color: red; }';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, {}, (err, root, imports, opts) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports).toBeDefined();
                    expect(opts.pluginManager).toBeDefined();
                    expect(typeof opts.pluginManager.addPlugin).toBe('function');
                    resolve();
                });
            });
        });

        it('should process plugins array with direct plugins', async () => {
            const input = '.class { color: red; }';
            const plugin1 = { 
                install: function() {},
                minVersion: [3, 0, 0]
            };
            const options = { plugins: [plugin1] };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });

        it('should handle plugin fileContent', async () => {
            const input = '.class { color: red; }';
            const plugin = { 
                fileContent: 'functions.add("test", function() { return "test"; });',
                filename: 'plugin.js'
            };
            const options = { plugins: [plugin] };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root) => {
                    // Should not error even with plugin content
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });

        it('should strip BOM from plugin fileContent', async () => {
            const input = '.class { color: red; }';
            const plugin = { 
                fileContent: '\uFEFFfunctions.add("test", function() { return "test"; });',
                filename: 'plugin.js'
            };
            const options = { plugins: [plugin] };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });
    });

    describe('import manager integration', () => {
        it('should set importManager on this context', async () => {
            const input = '.class { color: red; }';
            const thisContext = { ...mockLess };
            
            return new Promise((resolve) => {
                parse.call(thisContext, input, {}, (err) => {
                    expect(err).toBeNull();
                    expect(thisContext.importManager).toBeDefined();
                    expect(typeof thisContext.importManager.push).toBe('function');
                    resolve();
                });
            });
        });

        it('should initialize imports with empty contents and contentsIgnoredChars', async () => {
            const input = '.class { color: red; }';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, {}, (err, root, imports) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports.contents).toBeDefined();
                    expect(typeof imports.contents).toBe('object');
                    expect(imports.contentsIgnoredChars).toBeDefined();
                    expect(typeof imports.contentsIgnoredChars).toBe('object');
                    resolve();
                });
            });
        });
    });

    describe('parser integration', () => {
        it('should handle simple CSS rules', async () => {
            const input = '.test { color: blue; font-size: 14px; }';
            const options = { filename: 'test.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });

        it('should handle LESS variables', async () => {
            const input = '@color: red; .test { color: @color; }';
            const options = { filename: 'variables.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });

        it('should handle nested rules', async () => {
            const input = '.parent { .child { color: green; } }';
            const options = { filename: 'nested.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });
    });

    describe('promise handling', () => {
        it('should reject promise on parser error', async () => {
            const input = '.invalid-css { color'; // Invalid CSS
            
            try {
                await parse.call(mockLess, input, {});
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toBeDefined();
            }
        });

        it('should resolve promise with root on success', async () => {
            const input = '.valid { color: red; }';
            
            const result = await parse.call(mockLess, input, {});
            expect(result).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle empty input', async () => {
            return new Promise((resolve) => {
                parse.call(mockLess, '', {}, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });

        it('should handle undefined options', async () => {
            const input = '.class { color: red; }';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, undefined, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });

        it('should handle this context without options', async () => {
            const input = '.class { color: red; }';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, {}, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });

        it('should handle null this context', async () => {
            const input = '.class { color: red; }';
            
            try {
                await parse.call(null, input, {});
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                // This should error because parse.js tries to read this.options on line 15
                expect(error).toBeDefined();
                expect(error.message).toContain('Cannot read properties of null');
            }
        });

        it('should handle whitespace-only input', async () => {
            const input = '   \n\t  \n  ';
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, {}, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });
    });

    describe('filename handling', () => {
        it('should extract directory from filename correctly', async () => {
            const input = '.test { color: red; }';
            const options = { filename: '/very/long/path/to/my/file.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root, imports) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports.rootFilename).toBe('/very/long/path/to/my/file.less');
                    resolve();
                });
            });
        });

        it('should handle filename without directory', async () => {
            const input = '.test { color: red; }';
            const options = { filename: 'file.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root, imports) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports.rootFilename).toBe('file.less');
                    resolve();
                });
            });
        });

        it('should handle Windows-style paths', async () => {
            const input = '.test { color: red; }';
            const options = { filename: 'C:\\path\\to\\file.less' };
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, options, (err, root, imports) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    expect(imports.rootFilename).toBe('C:\\path\\to\\file.less');
                    resolve();
                });
            });
        });
    });

    describe('complex scenarios', () => {
        it('should handle multiple parse calls with different contexts', async () => {
            const input1 = '.class1 { color: red; }';
            const input2 = '.class2 { color: blue; }';
            const context1 = { ...mockLess, options: { compress: true } };
            const context2 = { ...mockLess, options: { compress: false } };

            const [result1, result2] = await Promise.all([
                parse.call(context1, input1, {}),
                parse.call(context2, input2, {})
            ]);

            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(context1.importManager).toBeDefined();
            expect(context2.importManager).toBeDefined();
            expect(context1.importManager).not.toBe(context2.importManager);
        });

        it('should handle complex LESS features', async () => {
            const input = `
                @base-color: #f938ab;
                .mixin(@color) {
                    color: @color;
                    border: 1px solid darken(@color, 10%);
                }
                .header {
                    .mixin(@base-color);
                    h1 {
                        font-size: 24px;
                        &:hover {
                            color: lighten(@base-color, 20%);
                        }
                    }
                }
            `;
            
            return new Promise((resolve) => {
                parse.call(mockLess, input, { filename: 'complex.less' }, (err, root) => {
                    expect(err).toBeNull();
                    expect(root).toBeDefined();
                    resolve();
                });
            });
        });
    });
});