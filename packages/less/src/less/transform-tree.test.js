import { describe, it, expect, vi, beforeEach } from 'vitest';
import transformTree from './transform-tree';
import contexts from './contexts';
import visitor from './visitors';
import tree from './tree';

// Mock dependencies
vi.mock('./contexts');
vi.mock('./visitors');
vi.mock('./tree');

describe('transform-tree', () => {
    let mockRoot;
    let mockEvalEnv;
    let mockEvaldRoot;
    let mockVisitors;
    let mockPluginManager;
    let mockVisitorIterator;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock root node
        mockEvaldRoot = {
            type: 'MockEvaldRoot'
        };
        mockRoot = {
            eval: vi.fn().mockReturnValue(mockEvaldRoot)
        };

        // Mock evaluation environment
        mockEvalEnv = {
            frames: []
        };
        contexts.Eval = vi.fn().mockReturnValue(mockEvalEnv);

        // Mock visitors
        mockVisitors = {
            JoinSelectorVisitor: vi.fn().mockImplementation(() => ({
                run: vi.fn()
            })),
            MarkVisibleSelectorsVisitor: vi.fn().mockImplementation(() => ({
                run: vi.fn()
            })),
            ExtendVisitor: vi.fn().mockImplementation(() => ({
                run: vi.fn()
            })),
            ToCSSVisitor: vi.fn().mockImplementation(() => ({
                run: vi.fn()
            }))
        };
        Object.assign(visitor, mockVisitors);

        // Mock tree classes
        tree.Value = vi.fn().mockImplementation((expressions) => ({
            type: 'Value',
            value: expressions
        }));
        tree.Expression = vi.fn().mockImplementation((elements) => ({
            type: 'Expression',
            value: elements
        }));
        tree.Declaration = vi.fn().mockImplementation((name, value, important, merge, index) => ({
            type: 'Declaration',
            name,
            value,
            important,
            merge,
            index
        }));
        tree.Ruleset = vi.fn().mockImplementation((selectors, rules) => ({
            type: 'Ruleset',
            selectors,
            rules
        }));
        tree.Color = vi.fn().mockImplementation((rgb) => ({
            type: 'Color',
            rgb
        }));

        // Mock plugin manager and visitor iterator
        mockVisitorIterator = {
            first: vi.fn(),
            get: vi.fn()
        };
        mockPluginManager = {
            visitor: vi.fn().mockReturnValue(mockVisitorIterator)
        };
    });

    describe('basic functionality', () => {
        it('should transform a root node with default options', () => {
            const result = transformTree(mockRoot);

            expect(contexts.Eval).toHaveBeenCalledWith({});
            expect(mockRoot.eval).toHaveBeenCalledWith(mockEvalEnv);
            expect(result).toBe(mockEvaldRoot);
        });

        it('should transform a root node with custom options', () => {
            const options = { compress: true, someOption: 'value' };
            const result = transformTree(mockRoot, options);

            expect(contexts.Eval).toHaveBeenCalledWith(options);
            expect(mockRoot.eval).toHaveBeenCalledWith(mockEvalEnv);
            expect(result).toBe(mockEvaldRoot);
        });

        it('should handle undefined options', () => {
            const result = transformTree(mockRoot, undefined);

            expect(contexts.Eval).toHaveBeenCalledWith({});
            expect(result).toBe(mockEvaldRoot);
        });
    });

    describe('visitor execution', () => {
        it('should create and run default visitors in correct order', () => {
            transformTree(mockRoot);

            expect(visitor.JoinSelectorVisitor).toHaveBeenCalledWith();
            expect(visitor.MarkVisibleSelectorsVisitor).toHaveBeenCalledWith(true);
            expect(visitor.ExtendVisitor).toHaveBeenCalledWith();
            expect(visitor.ToCSSVisitor).toHaveBeenCalledWith({ compress: false });

            // Get instances from the mock calls
            const joinSelectorInstance = visitor.JoinSelectorVisitor.mock.results[0].value;
            const markVisibleInstance = visitor.MarkVisibleSelectorsVisitor.mock.results[0].value;
            const extendInstance = visitor.ExtendVisitor.mock.results[0].value;
            const toCSSInstance = visitor.ToCSSVisitor.mock.results[0].value;

            expect(joinSelectorInstance.run).toHaveBeenCalledWith(mockEvaldRoot);
            expect(markVisibleInstance.run).toHaveBeenCalledWith(mockEvaldRoot);
            expect(extendInstance.run).toHaveBeenCalledWith(mockEvaldRoot);
            expect(toCSSInstance.run).toHaveBeenCalledWith(mockEvaldRoot);
        });

        it('should pass compress option to ToCSSVisitor', () => {
            const options = { compress: true };
            transformTree(mockRoot, options);

            expect(visitor.ToCSSVisitor).toHaveBeenCalledWith({ compress: true });
        });

        it('should handle boolean false compress option', () => {
            const options = { compress: false };
            transformTree(mockRoot, options);

            expect(visitor.ToCSSVisitor).toHaveBeenCalledWith({ compress: false });
        });

        it('should handle truthy compress values', () => {
            const options = { compress: 'yes' };
            transformTree(mockRoot, options);

            expect(visitor.ToCSSVisitor).toHaveBeenCalledWith({ compress: true });
        });
    });

    describe('variables handling', () => {
        it('should handle variables as object and convert to declarations', () => {
            const colorValue = { type: 'Color', rgb: '#f01' };
            const expressionValue = { type: 'Expression', value: [colorValue] };
            const valueInstance = { type: 'Value', value: [expressionValue] };
            
            const variables = {
                color: colorValue,
                size: valueInstance
            };
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Declaration).toHaveBeenCalledWith('@color', expect.any(Object), false, null, 0);
            expect(tree.Declaration).toHaveBeenCalledWith('@size', expect.any(Object), false, null, 0);
            expect(tree.Ruleset).toHaveBeenCalledWith(null, expect.any(Array));
            expect(mockEvalEnv.frames).toHaveLength(1);
        });

        it('should wrap non-Value variables in Value and Expression', () => {
            const colorValue = new tree.Color('#f01');
            const variables = { color: colorValue };
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Expression).toHaveBeenCalledWith([colorValue]);
            expect(tree.Value).toHaveBeenCalledWith([expect.any(Object)]);
        });

        it('should wrap non-Expression values in Expression then Value', () => {
            const dimensionValue = { type: 'Dimension' };
            const variables = { width: dimensionValue };
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Expression).toHaveBeenCalledWith([dimensionValue]);
            expect(tree.Value).toHaveBeenCalledWith([expect.any(Object)]);
        });

        it('should handle variables that are already Value instances', () => {
            // Mock a Value instance that will pass instanceof check
            const valueInstance = { type: 'Value', value: [] };
            
            // Mock the instanceof check to return true for this instance
            const originalValue = tree.Value;
            tree.Value = vi.fn().mockImplementation((expressions) => ({
                type: 'Value',
                value: expressions
            }));
            // Make the valueInstance pass instanceof check
            Object.setPrototypeOf(valueInstance, tree.Value.prototype);
            
            const variables = { color: valueInstance };
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Declaration).toHaveBeenCalledWith('@color', valueInstance, false, null, 0);
            
            // Restore original
            tree.Value = originalValue;
        });

        it('should ignore array variables', () => {
            const variables = ['item1', 'item2'];
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Declaration).not.toHaveBeenCalled();
            expect(tree.Ruleset).not.toHaveBeenCalled();
            expect(mockEvalEnv.frames).toHaveLength(0);
        });

        it('should handle null variables (this is a bug in original code)', () => {
            const options = { variables: null };

            // The original code has a bug where null passes typeof === 'object' check
            // This will throw an error when trying to call Object.keys(null)
            expect(() => transformTree(mockRoot, options)).toThrow('Cannot convert undefined or null to object');
        });

        it('should ignore undefined variables', () => {
            const options = { variables: undefined };

            transformTree(mockRoot, options);

            expect(tree.Declaration).not.toHaveBeenCalled();
            expect(tree.Ruleset).not.toHaveBeenCalled();
            expect(mockEvalEnv.frames).toHaveLength(0);
        });

        it('should handle empty variables object', () => {
            const options = { variables: {} };

            transformTree(mockRoot, options);

            expect(tree.Declaration).not.toHaveBeenCalled();
            expect(tree.Ruleset).toHaveBeenCalledWith(null, []);
            expect(mockEvalEnv.frames).toHaveLength(1);
        });

        it('should prefix variable names with @', () => {
            const variables = { 
                myColor: new tree.Color('#f01'),
                mySize: new tree.Color('#abc')
            };
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Declaration).toHaveBeenCalledWith('@myColor', expect.any(Object), false, null, 0);
            expect(tree.Declaration).toHaveBeenCalledWith('@mySize', expect.any(Object), false, null, 0);
        });
    });

    describe('plugin manager integration', () => {
        beforeEach(() => {
            mockVisitorIterator.get
                .mockReturnValueOnce(null); // End first iteration
        });

        it('should handle plugin manager with no visitors', () => {
            const options = { pluginManager: mockPluginManager };

            const result = transformTree(mockRoot, options);

            expect(mockPluginManager.visitor).toHaveBeenCalled();
            expect(mockVisitorIterator.first).toHaveBeenCalled();
            expect(mockVisitorIterator.get).toHaveBeenCalled();
            expect(result).toBe(mockEvaldRoot);
        });

        it('should run pre-eval visitors before evaluation', () => {
            const preEvalVisitor = {
                isPreEvalVisitor: true,
                run: vi.fn()
            };
            
            mockVisitorIterator.get
                .mockReturnValueOnce(preEvalVisitor)
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(preEvalVisitor)
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            expect(preEvalVisitor.run).toHaveBeenCalledWith(mockRoot);
            expect(preEvalVisitor.run).toHaveBeenCalledTimes(1); // Should not run twice
        });

        it('should add pre-visitors to beginning of visitors array', () => {
            const preVisitor = {
                isPreVisitor: true,
                run: vi.fn()
            };
            
            mockVisitorIterator.get
                .mockReturnValueOnce(preVisitor)
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(preVisitor)
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            expect(preVisitor.run).toHaveBeenCalledWith(mockEvaldRoot);
        });

        it('should add regular visitors to end of visitors array', () => {
            const regularVisitor = {
                run: vi.fn()
            };
            
            mockVisitorIterator.get
                .mockReturnValueOnce(regularVisitor)
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(regularVisitor)
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            expect(regularVisitor.run).toHaveBeenCalledWith(mockEvaldRoot);
        });

        it('should not duplicate visitors across iterations', () => {
            const regularVisitor = {
                run: vi.fn()
            };
            
            mockVisitorIterator.get
                .mockReturnValueOnce(regularVisitor)
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(regularVisitor) // Same visitor returned again
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            // Visitor should only run once even though returned twice
            expect(regularVisitor.run).toHaveBeenCalledTimes(1);
        });

        it('should run post-eval visitors after main visitors', () => {
            const postEvalVisitor = {
                run: vi.fn()
            };
            
            // Clear the default mock setup
            mockVisitorIterator.get.mockReset();
            mockVisitorIterator.get
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(postEvalVisitor) // Return in post-eval iteration
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            expect(postEvalVisitor.run).toHaveBeenCalledWith(mockEvaldRoot);
        });

        it('should not run pre-eval or main visitors in post-eval phase', () => {
            const preEvalVisitor = {
                isPreEvalVisitor: true,
                run: vi.fn()
            };
            const regularVisitor = {
                run: vi.fn()
            };
            
            mockVisitorIterator.get
                .mockReturnValueOnce(preEvalVisitor)
                .mockReturnValueOnce(regularVisitor)
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(preEvalVisitor)
                .mockReturnValueOnce(regularVisitor)
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(preEvalVisitor) // Should not run again
                .mockReturnValueOnce(regularVisitor) // Should not run again
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            // Each visitor should only run once
            expect(preEvalVisitor.run).toHaveBeenCalledTimes(1);
            expect(regularVisitor.run).toHaveBeenCalledTimes(1);
        });

        it('should handle complex visitor scenario with all types', () => {
            const preEvalVisitor = {
                isPreEvalVisitor: true,
                run: vi.fn()
            };
            const preVisitor = {
                isPreVisitor: true,
                run: vi.fn()
            };
            const regularVisitor = {
                run: vi.fn()
            };
            const postEvalVisitor = {
                run: vi.fn()
            };
            
            // Clear the default mock setup
            mockVisitorIterator.get.mockReset();
            mockVisitorIterator.get
                .mockReturnValueOnce(preEvalVisitor)
                .mockReturnValueOnce(preVisitor)
                .mockReturnValueOnce(regularVisitor)
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(preEvalVisitor)
                .mockReturnValueOnce(preVisitor)
                .mockReturnValueOnce(regularVisitor)
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(postEvalVisitor)
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            expect(preEvalVisitor.run).toHaveBeenCalledWith(mockRoot);
            expect(preVisitor.run).toHaveBeenCalledWith(mockEvaldRoot);
            expect(regularVisitor.run).toHaveBeenCalledWith(mockEvaldRoot);
            expect(postEvalVisitor.run).toHaveBeenCalledWith(mockEvaldRoot);

            // Each should run only once
            expect(preEvalVisitor.run).toHaveBeenCalledTimes(1);
            expect(preVisitor.run).toHaveBeenCalledTimes(1);
            expect(regularVisitor.run).toHaveBeenCalledTimes(1);
            expect(postEvalVisitor.run).toHaveBeenCalledTimes(1);
        });
    });

    describe('visitor order verification', () => {
        it('should run visitors in correct order', () => {
            const runOrder = [];
            const joinSelectorInstance = { run: vi.fn(() => runOrder.push('JoinSelector')) };
            const markVisibleInstance = { run: vi.fn(() => runOrder.push('MarkVisible')) };
            const extendInstance = { run: vi.fn(() => runOrder.push('Extend')) };
            const toCSSInstance = { run: vi.fn(() => runOrder.push('ToCSS')) };

            visitor.JoinSelectorVisitor.mockReturnValue(joinSelectorInstance);
            visitor.MarkVisibleSelectorsVisitor.mockReturnValue(markVisibleInstance);
            visitor.ExtendVisitor.mockReturnValue(extendInstance);
            visitor.ToCSSVisitor.mockReturnValue(toCSSInstance);

            transformTree(mockRoot);

            expect(runOrder).toEqual(['JoinSelector', 'MarkVisible', 'Extend', 'ToCSS']);
        });

        it('should run pre-visitors before default visitors', () => {
            const runOrder = [];
            const preVisitor = {
                isPreVisitor: true,
                run: vi.fn(() => runOrder.push('PreVisitor'))
            };
            
            const joinSelectorInstance = { run: vi.fn(() => runOrder.push('JoinSelector')) };
            visitor.JoinSelectorVisitor.mockReturnValue(joinSelectorInstance);

            mockVisitorIterator.get
                .mockReturnValueOnce(preVisitor)
                .mockReturnValueOnce(null) // End first iteration
                .mockReturnValueOnce(preVisitor)
                .mockReturnValueOnce(null) // End second iteration
                .mockReturnValueOnce(null); // End post-eval iteration

            const options = { pluginManager: mockPluginManager };

            transformTree(mockRoot, options);

            expect(runOrder[0]).toBe('PreVisitor');
            expect(runOrder.includes('JoinSelector')).toBe(true);
            expect(runOrder.indexOf('PreVisitor')).toBeLessThan(runOrder.indexOf('JoinSelector'));
        });
    });

    describe('edge cases', () => {
        it('should handle variables with special characters in keys', () => {
            const variables = {
                'my-color': new tree.Color('#f01'),
                'my_size': new tree.Color('#abc'),
                'my.spacing': new tree.Color('#def')
            };
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Declaration).toHaveBeenCalledWith('@my-color', expect.any(Object), false, null, 0);
            expect(tree.Declaration).toHaveBeenCalledWith('@my_size', expect.any(Object), false, null, 0);
            expect(tree.Declaration).toHaveBeenCalledWith('@my.spacing', expect.any(Object), false, null, 0);
        });

        it('should handle visitor iterator that throws errors', () => {
            mockVisitorIterator.get.mockImplementation(() => {
                throw new Error('Visitor error');
            });

            const options = { pluginManager: mockPluginManager };

            expect(() => transformTree(mockRoot, options)).toThrow('Visitor error');
        });

        it('should handle root.eval that throws errors', () => {
            mockRoot.eval.mockImplementation(() => {
                throw new Error('Eval error');
            });

            expect(() => transformTree(mockRoot)).toThrow('Eval error');
        });

        it('should handle visitor.run that throws errors', () => {
            const joinSelectorInstance = { 
                run: vi.fn(() => { throw new Error('Visitor run error'); })
            };
            visitor.JoinSelectorVisitor.mockReturnValue(joinSelectorInstance);

            expect(() => transformTree(mockRoot)).toThrow('Visitor run error');
        });

        it('should handle falsy values in variables', () => {
            const variables = {
                zero: 0,
                emptyString: '',
                falseBool: false
            };
            const options = { variables };

            transformTree(mockRoot, options);

            expect(tree.Declaration).toHaveBeenCalledWith('@zero', expect.any(Object), false, null, 0);
            expect(tree.Declaration).toHaveBeenCalledWith('@emptyString', expect.any(Object), false, null, 0);
            expect(tree.Declaration).toHaveBeenCalledWith('@falseBool', expect.any(Object), false, null, 0);
        });
    });

    describe('variable type handling behavior', () => {
        it('should handle existing Value instances without modification', () => {
            // Create a mock Value that will pass instanceof check
            const existingValue = { type: 'Value', value: [] };
            Object.setPrototypeOf(existingValue, tree.Value.prototype);
            
            const variables = { color: existingValue };
            const options = { variables };

            transformTree(mockRoot, options);

            // Should use the existing Value directly without creating new ones
            expect(tree.Declaration).toHaveBeenCalledWith('@color', existingValue, false, null, 0);
        });

        it('should wrap raw values in Expression and Value', () => {
            // Test the wrapping behavior for raw values
            const rawValue = { type: 'Color', value: '#f01' };
            const variables = { color: rawValue };
            const options = { variables };

            transformTree(mockRoot, options);

            // Should wrap in Expression first, then Value
            expect(tree.Expression).toHaveBeenCalledWith([rawValue]);
            expect(tree.Value).toHaveBeenCalledWith([expect.any(Object)]);
            expect(tree.Declaration).toHaveBeenCalledWith('@color', expect.any(Object), false, null, 0);
        });
    });
});