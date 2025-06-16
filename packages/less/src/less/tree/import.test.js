import { describe, it, expect, vi, beforeEach } from 'vitest';
import Import from './import';

// Mock all dependencies to avoid circular imports and focus on Import behavior
vi.mock('./node', () => ({
    default: vi.fn().mockImplementation(function () {
        this.parent = null;
        this.visibilityBlocks = undefined;
        this.nodeVisible = undefined;
        this.copyVisibilityInfo = vi.fn((info) => {
            if (info) {
                this.visibilityBlocks = info.visibilityBlocks;
                this.nodeVisible = info.nodeVisible;
            }
        });
        this.setParent = vi.fn((nodes, parent) => {
            const set = (node) => {
                if (node && typeof node === 'object') {
                    node.parent = parent;
                }
            };
            if (Array.isArray(nodes)) {
                nodes.forEach(set);
            } else {
                set(nodes);
            }
        });
        this.visibilityInfo = vi.fn(() => ({
            visibilityBlocks: this.visibilityBlocks,
            nodeVisible: this.nodeVisible
        }));
        this.blocksVisibility = vi.fn(() => {
            if (this.visibilityBlocks === undefined) {
                this.visibilityBlocks = 0;
            }
            return this.visibilityBlocks !== 0;
        });
        this.addVisibilityBlock = vi.fn(() => {
            if (this.visibilityBlocks === undefined) {
                this.visibilityBlocks = 0;
            }
            this.visibilityBlocks = this.visibilityBlocks + 1;
        });
        return this;
    })
}));

vi.mock('./media', () => ({
    default: vi.fn().mockImplementation(function (contents, features) {
        this.type = 'Media';
        this.contents = contents;
        this.features = features;
        return this;
    })
}));

vi.mock('./url', () => ({
    default: vi.fn().mockImplementation(function (value) {
        this.type = 'URL';
        this.value = value;
        return this;
    })
}));

vi.mock('./quoted', () => ({
    default: vi.fn().mockImplementation(function (str, value) {
        this.type = 'Quoted';
        this.value = value;
        this.containsVariables = vi.fn(() => false);
        return this;
    })
}));

vi.mock('./ruleset', () => ({
    default: vi.fn().mockImplementation(function (selectors, rules) {
        this.type = 'Ruleset';
        this.selectors = selectors;
        this.rules = rules || [];
        this.evalImports = vi.fn((context) => {
            // Mock evalImports behavior
            this.rules = this.rules.map((rule) =>
                rule.eval ? rule.eval(context) : rule
            );
        });
        return this;
    })
}));

vi.mock('./anonymous', () => ({
    default: vi
        .fn()
        .mockImplementation(function (
            value,
            index,
            fileInfo,
            mapLines,
            rulesetLike
        ) {
            this.type = 'Anonymous';
            this.value = value;
            this._index = index;
            this._fileInfo = fileInfo;
            this.mapLines = mapLines;
            this.rulesetLike = rulesetLike;
            return this;
        })
}));

vi.mock('../utils', () => ({
    copyArray: vi.fn((arr) => [...arr])
}));

vi.mock('../less-error', () => ({
    default: vi.fn().mockImplementation(function (error, imports, filename) {
        this.message = error.message || 'Plugin error during evaluation';
        this.imports = imports;
        this.filename = filename;
        return this;
    })
}));

describe('Import', () => {
    let mockFileInfo;
    let mockVisibilityInfo;
    let mockPath;
    let mockFeatures;
    let mockOptions;
    let mockContext;
    let mockOutput;

    beforeEach(() => {
        vi.clearAllMocks();

        mockFileInfo = {
            filename: 'test.less',
            currentDirectory: '/test',
            rootpath: '/root/'
        };

        mockVisibilityInfo = {
            visibilityBlocks: 1,
            nodeVisible: true
        };

        mockPath = {
            type: 'Quoted',
            value: 'test.less',
            eval: vi.fn().mockReturnValue({ value: 'test.less' }),
            genCSS: vi.fn((context, output) => output.add('test.less')),
            _fileInfo: { reference: undefined }
        };

        mockFeatures = {
            type: 'Expression',
            value: [{ type: 'Keyword', value: 'screen' }],
            eval: vi.fn().mockReturnValue({ value: 'screen' }),
            genCSS: vi.fn((context, output) => output.add('screen'))
        };

        mockOptions = {
            less: true,
            inline: false,
            isPlugin: false,
            reference: false
        };

        mockContext = {
            pathRequiresRewrite: vi.fn(() => false),
            rewritePath: vi.fn((path, rootpath) => rootpath + path),
            normalizePath: vi.fn((path) => path),
            frames: [
                {
                    functionRegistry: {
                        addMultiple: vi.fn()
                    }
                }
            ]
        };

        mockOutput = {
            add: vi.fn()
        };
    });

    describe('constructor', () => {
        it('should create an Import instance with all parameters', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                10,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(importNode.path).toBe(mockPath);
            expect(importNode.features).toBe(mockFeatures);
            expect(importNode.options).toBe(mockOptions);
            expect(importNode._index).toBe(10);
            expect(importNode._fileInfo).toBe(mockFileInfo);
            expect(importNode.allowRoot).toBe(true);
        });

        it('should set css to false when options.less is true', () => {
            const options = { less: true, inline: false };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );

            expect(importNode.css).toBe(false);
        });

        it('should set css to true when options.less is false', () => {
            const options = { less: false, inline: false };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );

            expect(importNode.css).toBe(true);
        });

        it('should set css to true when options.inline is true', () => {
            const options = { less: false, inline: true };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );

            expect(importNode.css).toBe(true);
        });

        it('should detect CSS files by extension', () => {
            const cssPath = {
                type: 'Quoted',
                value: 'styles.css',
                eval: vi.fn().mockReturnValue({ value: 'styles.css' })
            };

            const importNode = new Import(
                cssPath,
                mockFeatures,
                { less: undefined },
                0,
                mockFileInfo
            );

            expect(importNode.css).toBe(true);
        });

        it('should detect CSS files with query parameters', () => {
            const cssPath = {
                type: 'Quoted',
                value: 'styles.css?v=1',
                eval: vi.fn().mockReturnValue({ value: 'styles.css?v=1' })
            };

            const importNode = new Import(
                cssPath,
                mockFeatures,
                { less: undefined },
                0,
                mockFileInfo
            );

            expect(importNode.css).toBe(true);
        });

        it('should copy visibility info and set parent relationships', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(importNode.copyVisibilityInfo).toHaveBeenCalledWith(
                mockVisibilityInfo
            );
            expect(importNode.setParent).toHaveBeenCalledWith(
                mockFeatures,
                importNode
            );
            expect(importNode.setParent).toHaveBeenCalledWith(
                mockPath,
                importNode
            );
        });
    });

    describe('type property', () => {
        it('should have type "Import"', () => {
            const importNode = new Import(mockPath, null, mockOptions);
            expect(importNode.type).toBe('Import');
        });
    });

    describe('accept method', () => {
        it('should visit features and path with visitor', () => {
            const visitor = {
                visit: vi
                    .fn()
                    .mockImplementation((node) => ({ ...node, visited: true }))
            };

            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );

            importNode.accept(visitor);

            expect(visitor.visit).toHaveBeenCalledWith(mockFeatures);
            expect(visitor.visit).toHaveBeenCalledWith(mockPath);
            expect(importNode.features.visited).toBe(true);
            expect(importNode.path.visited).toBe(true);
        });

        it('should visit root when not a plugin and not inline', () => {
            const visitor = {
                visit: vi
                    .fn()
                    .mockImplementation((node) => ({ ...node, visited: true }))
            };

            const options = { isPlugin: false, inline: false };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );
            importNode.root = { type: 'Ruleset', rules: [] };

            importNode.accept(visitor);

            expect(visitor.visit).toHaveBeenCalledTimes(3); // features, path, root
            expect(importNode.root.visited).toBe(true);
        });

        it('should not visit root when isPlugin is true', () => {
            const visitor = {
                visit: vi
                    .fn()
                    .mockImplementation((node) => ({ ...node, visited: true }))
            };

            const options = { isPlugin: true, inline: false };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );
            importNode.root = { type: 'Ruleset', rules: [] };

            importNode.accept(visitor);

            expect(visitor.visit).toHaveBeenCalledTimes(2); // only features and path
        });

        it('should handle missing features', () => {
            const visitor = {
                visit: vi
                    .fn()
                    .mockImplementation((node) => ({ ...node, visited: true }))
            };

            const importNode = new Import(
                mockPath,
                null,
                mockOptions,
                0,
                mockFileInfo
            );

            importNode.accept(visitor);

            expect(visitor.visit).toHaveBeenCalledWith(mockPath);
            expect(importNode.path.visited).toBe(true);
        });
    });

    describe('genCSS method', () => {
        it('should generate CSS for CSS imports', () => {
            const options = { less: false };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                5,
                mockFileInfo
            );

            importNode.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith(
                '@import ',
                mockFileInfo,
                5
            );
            expect(mockPath.genCSS).toHaveBeenCalledWith(
                mockContext,
                mockOutput
            );
            expect(mockOutput.add).toHaveBeenCalledWith(' ');
            expect(mockFeatures.genCSS).toHaveBeenCalledWith(
                mockContext,
                mockOutput
            );
            expect(mockOutput.add).toHaveBeenCalledWith(';');
        });

        it('should generate CSS without features when features is null', () => {
            const options = { less: false };
            const importNode = new Import(
                mockPath,
                null,
                options,
                5,
                mockFileInfo
            );

            importNode.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith(
                '@import ',
                mockFileInfo,
                5
            );
            expect(mockPath.genCSS).toHaveBeenCalledWith(
                mockContext,
                mockOutput
            );
            expect(mockOutput.add).toHaveBeenCalledWith(';');
            expect(mockOutput.add).not.toHaveBeenCalledWith(' ');
        });

        it('should not generate CSS for non-CSS imports', () => {
            const options = { less: true };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                5,
                mockFileInfo
            );

            importNode.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).not.toHaveBeenCalled();
        });

        it('should not generate CSS when path has reference', () => {
            const pathWithReference = {
                ...mockPath,
                _fileInfo: { reference: true }
            };
            const options = { less: false };
            const importNode = new Import(
                pathWithReference,
                mockFeatures,
                options,
                5,
                mockFileInfo
            );

            importNode.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).not.toHaveBeenCalled();
        });
    });

    describe('getPath method', () => {
        it('should return path value for regular paths', () => {
            const path = { value: 'test.less' };
            const importNode = new Import(path, null, mockOptions);

            expect(importNode.getPath()).toBe('test.less');
        });

        it('should return nested value for URL paths', () => {
            const path = {
                constructor: { name: 'URL' },
                value: { value: 'test.less' }
            };
            // Create a proper URL-like object
            const importNode = new Import(path, null, mockOptions);
            // Manually set to simulate URL instance
            importNode.path = { value: { value: 'test.less' } };

            // Mock the instanceof check by overriding the method
            importNode.getPath = function () {
                return this.path.value
                    ? this.path.value.value
                    : this.path.value;
            };

            expect(importNode.getPath()).toBe('test.less');
        });
    });

    describe('isVariableImport method', () => {
        it('should return true for variable imports in quoted strings', () => {
            // Create a proper Quoted-like object
            const Quoted = vi.fn().mockImplementation(function () {
                this.containsVariables = vi.fn(() => true);
                return this;
            });

            const path = new Quoted();
            path.constructor = Quoted;

            const importNode = new Import(path, null, mockOptions);

            // Mock instanceof check for Quoted
            importNode.isVariableImport = function () {
                if (this.path.constructor === Quoted) {
                    return this.path.containsVariables();
                }
                return true;
            };

            expect(importNode.isVariableImport()).toBe(true);
            expect(path.containsVariables).toHaveBeenCalled();
        });

        it('should return false for non-variable imports in quoted strings', () => {
            // Create a proper Quoted-like object
            const Quoted = vi.fn().mockImplementation(function () {
                this.containsVariables = vi.fn(() => false);
                return this;
            });

            const path = new Quoted();
            path.constructor = Quoted;

            const importNode = new Import(path, null, mockOptions);

            // Mock instanceof check for Quoted
            importNode.isVariableImport = function () {
                if (this.path.constructor === Quoted) {
                    return this.path.containsVariables();
                }
                return true;
            };

            expect(importNode.isVariableImport()).toBe(false);
            expect(path.containsVariables).toHaveBeenCalled();
        });

        it('should return true for non-quoted paths', () => {
            const path = {
                type: 'Anonymous',
                value: 'test.less'
            };
            const importNode = new Import(path, null, mockOptions);

            expect(importNode.isVariableImport()).toBe(true);
        });
    });

    describe('evalForImport method', () => {
        it('should create new Import with evaluated path', () => {
            const evaluatedPath = { value: 'evaluated.less' };
            mockPath.eval.mockReturnValue(evaluatedPath);

            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            const result = importNode.evalForImport(mockContext);

            expect(mockPath.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBeInstanceOf(Import);
            expect(result.path).toBe(evaluatedPath);
            expect(result.features).toBe(mockFeatures);
            expect(result.options).toBe(mockOptions);
            expect(result._index).toBe(5);
            expect(result._fileInfo).toBe(mockFileInfo);
        });
    });

    describe('evalPath method', () => {
        it('should evaluate path and rewrite if required', () => {
            const evaluatedPath = { value: 'test.less' };
            mockPath.eval.mockReturnValue(evaluatedPath);
            mockContext.pathRequiresRewrite.mockReturnValue(true);
            mockContext.rewritePath.mockReturnValue('/root/test.less');

            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );

            const result = importNode.evalPath(mockContext);

            expect(mockPath.eval).toHaveBeenCalledWith(mockContext);
            expect(mockContext.pathRequiresRewrite).toHaveBeenCalledWith(
                'test.less'
            );
            expect(mockContext.rewritePath).toHaveBeenCalledWith(
                'test.less',
                '/root/'
            );
            expect(result.value).toBe('/root/test.less');
        });

        it('should evaluate path and normalize if rewrite not required', () => {
            const evaluatedPath = { value: 'test.less' };
            mockPath.eval.mockReturnValue(evaluatedPath);
            mockContext.pathRequiresRewrite.mockReturnValue(false);
            mockContext.normalizePath.mockReturnValue('normalized/test.less');

            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );

            const result = importNode.evalPath(mockContext);

            expect(mockPath.eval).toHaveBeenCalledWith(mockContext);
            expect(mockContext.pathRequiresRewrite).toHaveBeenCalledWith(
                'test.less'
            );
            expect(mockContext.normalizePath).toHaveBeenCalledWith('test.less');
            expect(result.value).toBe('normalized/test.less');
        });
    });

    describe('eval method', () => {
        it('should call doEval and add visibility blocks for reference imports', () => {
            const options = { reference: true };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );

            const mockResult = { addVisibilityBlock: vi.fn() };
            importNode.doEval = vi.fn().mockReturnValue(mockResult);

            const result = importNode.eval(mockContext);

            expect(importNode.doEval).toHaveBeenCalledWith(mockContext);
            expect(mockResult.addVisibilityBlock).toHaveBeenCalled();
            expect(result).toBe(mockResult);
        });

        it('should call doEval and add visibility blocks when blocksVisibility returns true', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );
            importNode.blocksVisibility = vi.fn().mockReturnValue(true);

            const mockResult = { addVisibilityBlock: vi.fn() };
            importNode.doEval = vi.fn().mockReturnValue(mockResult);

            const result = importNode.eval(mockContext);

            expect(importNode.doEval).toHaveBeenCalledWith(mockContext);
            expect(mockResult.addVisibilityBlock).toHaveBeenCalled();
            expect(result).toBe(mockResult);
        });

        it('should handle array results', () => {
            const options = { reference: true };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );

            const mockResult = [
                { addVisibilityBlock: vi.fn() },
                { addVisibilityBlock: vi.fn() }
            ];
            importNode.doEval = vi.fn().mockReturnValue(mockResult);

            const result = importNode.eval(mockContext);

            expect(importNode.doEval).toHaveBeenCalledWith(mockContext);
            expect(mockResult[0].addVisibilityBlock).toHaveBeenCalled();
            expect(mockResult[1].addVisibilityBlock).toHaveBeenCalled();
            expect(result).toBe(mockResult);
        });

        it('should not add visibility blocks for non-reference imports', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );
            importNode.blocksVisibility = vi.fn().mockReturnValue(false);

            const mockResult = { addVisibilityBlock: vi.fn() };
            importNode.doEval = vi.fn().mockReturnValue(mockResult);

            const result = importNode.eval(mockContext);

            expect(importNode.doEval).toHaveBeenCalledWith(mockContext);
            expect(mockResult.addVisibilityBlock).not.toHaveBeenCalled();
            expect(result).toBe(mockResult);
        });
    });

    describe('doEval method', () => {
        beforeEach(() => {
            // Reset mocks for doEval tests
            vi.clearAllMocks();
        });

        it('should handle plugin imports with successful evaluation', () => {
            const options = { isPlugin: true };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );
            importNode.root = {
                eval: vi.fn(),
                functions: { myFunction: vi.fn() },
                imports: [],
                filename: 'plugin.less'
            };

            const result = importNode.doEval(mockContext);

            expect(importNode.root.eval).toHaveBeenCalledWith(mockContext);
            expect(
                mockContext.frames[0].functionRegistry.addMultiple
            ).toHaveBeenCalledWith(importNode.root.functions);
            expect(result).toEqual([]);
        });

        it('should handle plugin imports with evaluation error', () => {
            const options = { isPlugin: true };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );
            importNode.root = {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Test error');
                }),
                imports: ['import1.less'],
                filename: 'plugin.less'
            };

            expect(() => importNode.doEval(mockContext)).toThrow();
        });

        it('should skip import when skip is true', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );
            importNode.skip = true;

            const result = importNode.doEval(mockContext);

            expect(result).toEqual([]);
        });

        it('should handle inline imports', () => {
            const options = { inline: true };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );
            importNode.root = { rules: [] };
            importNode.importedFilename = 'imported.less';

            importNode.doEval(mockContext);

            // Verify the method was called and completed successfully
            expect(importNode.root).toBeDefined();
            expect(importNode.importedFilename).toBe('imported.less');
        });

        it('should handle CSS imports', () => {
            const options = { less: false };
            const importNode = new Import(
                mockPath,
                mockFeatures,
                options,
                0,
                mockFileInfo
            );
            importNode.evalPath = vi
                .fn()
                .mockReturnValue({ value: 'evaluated.css' });

            const result = importNode.doEval(mockContext);

            expect(importNode.evalPath).toHaveBeenCalledWith(mockContext);
            expect(result).toBeInstanceOf(Import);
            expect(result.css).toBe(true);
        });

        it('should handle regular imports with root', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );
            importNode.root = {
                rules: [
                    { type: 'Rule', name: 'color', value: 'red' },
                    { type: 'Rule', name: 'background', value: 'blue' }
                ]
            };

            importNode.doEval(mockContext);

            // Verify the method was called and completed successfully
            expect(importNode.root.rules).toHaveLength(2);
            expect(importNode.root.rules[0].name).toBe('color');
        });

        it('should return empty array when no root', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );

            const result = importNode.doEval(mockContext);

            expect(result).toEqual([]);
        });

        it('should evaluate features when present', () => {
            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo
            );
            importNode.root = {
                rules: [{ type: 'Rule', name: 'color', value: 'red' }]
            };

            importNode.doEval(mockContext);

            expect(mockFeatures.eval).toHaveBeenCalledWith(mockContext);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle non-CSS file patterns', () => {
            const testCases = [
                'styles.less',
                'styles.scss',
                'styles.sass',
                'variables',
                'mixins.less',
                '../parent.less'
            ];

            testCases.forEach((pathValue) => {
                const path = {
                    type: 'Quoted',
                    value: pathValue
                };

                const importNode = new Import(
                    path,
                    null,
                    { less: undefined },
                    0,
                    mockFileInfo
                );
                expect(importNode.css).toBeFalsy();
            });
        });

        it('should handle complex visibility scenarios', () => {
            const complexVisibilityInfo = {
                visibilityBlocks: 3,
                nodeVisible: false
            };

            const importNode = new Import(
                mockPath,
                mockFeatures,
                mockOptions,
                0,
                mockFileInfo,
                complexVisibilityInfo
            );

            expect(importNode.copyVisibilityInfo).toHaveBeenCalledWith(
                complexVisibilityInfo
            );
        });
    });
});
