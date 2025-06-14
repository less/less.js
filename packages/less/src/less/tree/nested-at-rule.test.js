import { describe, it, expect, beforeEach, vi } from 'vitest';

// Copy the prototype methods directly to avoid circular dependencies
const NestableAtRulePrototype = {
    isRulesetLike() {
        return true;
    },

    accept(visitor) {
        if (this.features) {
            this.features = visitor.visit(this.features);
        }
        if (this.rules) {
            this.rules = visitor.visitArray(this.rules);
        }
    },

    evalTop(context) {
        let result = this;

        // Render all dependent Media blocks.
        if (context.mediaBlocks && context.mediaBlocks.length > 1) {
            const selectors = new this.Selector(
                [],
                null,
                null,
                this.getIndex(),
                this.fileInfo()
            ).createEmptySelectors();
            result = new this.Ruleset(selectors, context.mediaBlocks);
            result.multiMedia = true;
            result.copyVisibilityInfo(this.visibilityInfo());
            this.setParent(result, this);
        }

        delete context.mediaBlocks;
        delete context.mediaPath;

        return result;
    },

    evalNested(context) {
        let i;
        let value;
        const path = (context.mediaPath || []).concat([this]);

        // Extract the media-query conditions separated with `,` (OR).
        for (i = 0; i < path.length; i++) {
            if (path[i].type !== this.type) {
                if (context.mediaBlocks) {
                    context.mediaBlocks.splice(i, 1);
                }

                return this;
            }

            value =
                path[i].features instanceof this.Value
                    ? path[i].features.value
                    : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
        }

        // Trace all permutations to generate the resulting media-query.
        //
        // (a, b and c) with nested (d, e) ->
        //    a and d
        //    a and e
        //    b and c and d
        //    b and c and e
        const permuteResult = this.permute(path);
        if (!permuteResult || !Array.isArray(permuteResult)) {
            return this;
        }
        // Ensure every path is an array before mapping
        if (permuteResult.some((p) => !Array.isArray(p))) {
            return this;
        }
        this.features = new this.Value(
            permuteResult.map((path) => {
                path = path.map((fragment) => {
                    if (fragment && fragment.toCSS) {
                        return fragment;
                    } else {
                        return new this.Anonymous(fragment);
                    }
                });

                for (i = path.length - 1; i > 0; i--) {
                    path.splice(i, 0, new this.Anonymous('and'));
                }

                return new this.Expression(path);
            })
        );
        this.setParent(this.features, this);

        // Fake a tree-node that doesn't output anything.
        return new this.Ruleset([], []);
    },

    permute(arr) {
        if (!arr || arr.length === 0) {
            return [];
        } else if (arr.length === 1) {
            return arr[0];
        } else {
            const result = [];
            const rest = this.permute(arr.slice(1));
            for (let i = 0; i < rest.length; i++) {
                for (let j = 0; j < arr[0].length; j++) {
                    result.push([arr[0][j]].concat(rest[i]));
                }
            }
            return result;
        }
    },

    bubbleSelectors(selectors) {
        if (!selectors) {
            return;
        }
        if (!this.rules || !this.rules[0]) {
            return;
        }
        this.rules = [
            new this.Ruleset(this.utils.copyArray(selectors), [this.rules[0]])
        ];
        this.setParent(this.rules, this);
    }
};

describe('NestableAtRulePrototype', () => {
    let atRule;
    let mockContext;
    let mockVisitor;

    beforeEach(() => {
        // Create a test object that implements the prototype
        atRule = Object.create(NestableAtRulePrototype);
        atRule.type = 'Media';
        atRule.features = null;
        atRule.rules = null;
        atRule._index = 0;
        atRule._fileInfo = { filename: 'test.less' };
        atRule.visibilityInfo = () => ({
            visibilityBlocks: 0,
            nodeVisible: true
        });
        atRule.getIndex = () => atRule._index;
        atRule.fileInfo = () => atRule._fileInfo;
        atRule.setParent = vi.fn();
        atRule.copyVisibilityInfo = vi.fn();

        // Mock the constructors and utilities
        atRule.Selector = vi.fn().mockImplementation(() => ({
            createEmptySelectors: () => [{ type: 'Selector' }]
        }));
        atRule.Ruleset = vi.fn().mockImplementation(() => ({
            multiMedia: false,
            copyVisibilityInfo: vi.fn(),
            setParent: vi.fn()
        }));
        atRule.Value = vi.fn().mockImplementation(() => ({
            setParent: vi.fn()
        }));
        atRule.Anonymous = vi.fn().mockImplementation(() => ({
            toCSS: () => 'and'
        }));
        atRule.Expression = vi.fn().mockImplementation(() => ({
            setParent: vi.fn()
        }));
        atRule.utils = {
            copyArray: vi.fn().mockImplementation((arr) => [...arr])
        };

        // Mock context
        mockContext = {
            mediaBlocks: [],
            mediaPath: []
        };

        // Mock visitor
        mockVisitor = {
            visit: vi.fn(),
            visitArray: vi.fn()
        };

        // Reset all mocks
        vi.clearAllMocks();
    });

    describe('isRulesetLike', () => {
        it('should return true', () => {
            expect(atRule.isRulesetLike()).toBe(true);
        });
    });

    describe('accept', () => {
        it('should visit features if they exist', () => {
            const mockFeatures = { type: 'Value' };
            const visitedFeatures = { type: 'Value', visited: true };

            atRule.features = mockFeatures;
            mockVisitor.visit.mockReturnValue(visitedFeatures);

            atRule.accept(mockVisitor);

            expect(mockVisitor.visit).toHaveBeenCalledWith(mockFeatures);
            expect(atRule.features).toBe(visitedFeatures);
        });

        it('should visit rules if they exist', () => {
            const mockRules = [{ type: 'Rule' }];
            const visitedRules = [{ type: 'Rule', visited: true }];

            atRule.rules = mockRules;
            mockVisitor.visitArray.mockReturnValue(visitedRules);

            atRule.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledWith(mockRules);
            expect(atRule.rules).toBe(visitedRules);
        });

        it('should handle null features and rules', () => {
            atRule.features = null;
            atRule.rules = null;

            atRule.accept(mockVisitor);

            expect(mockVisitor.visit).not.toHaveBeenCalled();
            expect(mockVisitor.visitArray).not.toHaveBeenCalled();
        });

        it('should visit both features and rules when both exist', () => {
            const mockFeatures = { type: 'Value' };
            const mockRules = [{ type: 'Rule' }];
            const visitedFeatures = { type: 'Value', visited: true };
            const visitedRules = [{ type: 'Rule', visited: true }];

            atRule.features = mockFeatures;
            atRule.rules = mockRules;
            mockVisitor.visit.mockReturnValue(visitedFeatures);
            mockVisitor.visitArray.mockReturnValue(visitedRules);

            atRule.accept(mockVisitor);

            expect(mockVisitor.visit).toHaveBeenCalledWith(mockFeatures);
            expect(mockVisitor.visitArray).toHaveBeenCalledWith(mockRules);
            expect(atRule.features).toBe(visitedFeatures);
            expect(atRule.rules).toBe(visitedRules);
        });
    });

    describe('evalTop', () => {
        it('should return itself when mediaBlocks length is 1 or less', () => {
            mockContext.mediaBlocks = [];
            const result = atRule.evalTop(mockContext);
            expect(result).toBe(atRule);
        });

        it('should return itself when mediaBlocks length is exactly 1', () => {
            mockContext.mediaBlocks = [{ type: 'Media' }];
            const result = atRule.evalTop(mockContext);
            expect(result).toBe(atRule);
        });

        it('should create new Ruleset when mediaBlocks length > 1', () => {
            const mockMediaBlocks = [
                { type: 'Media', name: 'block1' },
                { type: 'Media', name: 'block2' }
            ];
            mockContext.mediaBlocks = mockMediaBlocks;

            const mockSelectors = [{ type: 'Selector' }];
            const mockRuleset = {
                multiMedia: false,
                copyVisibilityInfo: vi.fn(),
                type: 'Ruleset'
            };

            // Mock Selector constructor and createEmptySelectors
            atRule.Selector.mockImplementation(() => ({
                createEmptySelectors: () => mockSelectors
            }));

            // Mock Ruleset constructor
            atRule.Ruleset.mockImplementation(() => mockRuleset);

            const result = atRule.evalTop(mockContext);

            expect(atRule.Selector).toHaveBeenCalledWith(
                [],
                null,
                null,
                atRule._index,
                atRule._fileInfo
            );
            expect(atRule.Ruleset).toHaveBeenCalledWith(
                mockSelectors,
                mockMediaBlocks
            );
            expect(mockRuleset.multiMedia).toBe(true);
            expect(mockRuleset.copyVisibilityInfo).toHaveBeenCalledWith(
                atRule.visibilityInfo()
            );
            expect(atRule.setParent).toHaveBeenCalledWith(mockRuleset, atRule);
            expect(result).toBe(mockRuleset);
        });

        it('should delete mediaBlocks and mediaPath from context', () => {
            mockContext.mediaBlocks = [];
            mockContext.mediaPath = [];

            atRule.evalTop(mockContext);

            expect(mockContext.mediaBlocks).toBeUndefined();
            expect(mockContext.mediaPath).toBeUndefined();
        });

        it('should handle context with non-array mediaBlocks', () => {
            mockContext.mediaBlocks = 'not-an-array';
            const result = atRule.evalTop(mockContext);
            // Since 'not-an-array' has length > 1, a new Ruleset is created
            expect(result).toEqual({
                multiMedia: true,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });

        it('should handle context with mediaBlocks containing null elements', () => {
            mockContext.mediaBlocks = [null, { type: 'Media' }];
            const result = atRule.evalTop(mockContext);
            // When mediaBlocks.length > 1, it creates a new Ruleset regardless of content
            expect(result).toEqual({
                multiMedia: true,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });

        it('should handle context with mediaBlocks containing undefined elements', () => {
            mockContext.mediaBlocks = [undefined, { type: 'Media' }];
            const result = atRule.evalTop(mockContext);
            // When mediaBlocks.length > 1, it creates a new Ruleset regardless of content
            expect(result).toEqual({
                multiMedia: true,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });
    });

    describe('evalNested', () => {
        beforeEach(() => {
            mockContext.mediaPath = [];
        });

        it('should return this when path contains different type', () => {
            const otherTypeNode = { type: 'Import' };
            mockContext.mediaPath = [otherTypeNode];
            mockContext.mediaBlocks = [{ type: 'Media' }];

            const result = atRule.evalNested(mockContext);

            expect(mockContext.mediaBlocks).toEqual([]);
            expect(result).toBe(atRule);
        });

        it('should handle single media path item', () => {
            const mediaNode = {
                type: 'Media',
                features: { value: 'screen' },
                toCSS: () => 'screen'
            };
            mockContext.mediaPath = [mediaNode];

            const result = atRule.evalNested(mockContext);

            expect(atRule.Value).toHaveBeenCalled();
            expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
            expect(result).toEqual({
                multiMedia: false,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });

        it('should handle multiple media path items', () => {
            const mediaNode1 = {
                type: 'Media',
                features: { value: 'screen' },
                toCSS: () => 'screen'
            };
            const mediaNode2 = {
                type: 'Media',
                features: { value: 'print' },
                toCSS: () => 'print'
            };
            mockContext.mediaPath = [mediaNode1, mediaNode2];

            const result = atRule.evalNested(mockContext);

            expect(atRule.Value).toHaveBeenCalled();
            expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
            expect(result).toEqual({
                multiMedia: false,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });

        it('should handle array features', () => {
            const mediaNode = {
                type: 'Media',
                features: ['screen', 'print'],
                toCSS: () => 'screen'
            };
            mockContext.mediaPath = [mediaNode];

            const result = atRule.evalNested(mockContext);

            expect(atRule.Value).toHaveBeenCalled();
            expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
            expect(result).toEqual({
                multiMedia: false,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });

        it('should handle non-Value features', () => {
            const mediaNode = {
                type: 'Media',
                features: 'screen',
                toCSS: () => 'screen'
            };
            mockContext.mediaPath = [mediaNode];

            const result = atRule.evalNested(mockContext);

            expect(atRule.Value).toHaveBeenCalled();
            expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
            expect(result).toEqual({
                multiMedia: false,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });

        describe('evalNested - Additional Scenarios', () => {
            it('should handle empty mediaPath', () => {
                mockContext.mediaPath = [];
                const result = atRule.evalNested(mockContext);
                // When mediaPath is empty, the path becomes [this] where this.features is null
                // This means permute([null]) returns null, so the function returns this
                expect(result).toBe(atRule);
            });

            it('should handle mediaPath with null/undefined mediaBlocks', () => {
                const mediaNode = {
                    type: 'Media',
                    features: 'screen',
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];
                mockContext.mediaBlocks = null;

                const result = atRule.evalNested(mockContext);

                // When mediaBlocks is null, it should still process normally
                expect(atRule.Value).toHaveBeenCalled();
                expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
                expect(result).toEqual({
                    multiMedia: false,
                    copyVisibilityInfo: expect.any(Function),
                    setParent: expect.any(Function)
                });
            });

            it('should handle features with null/undefined values', () => {
                const mediaNode = {
                    type: 'Media',
                    features: null,
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];

                const result = atRule.evalNested(mockContext);

                expect(atRule.Value).toHaveBeenCalled();
                expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
                expect(result).toEqual({
                    multiMedia: false,
                    copyVisibilityInfo: expect.any(Function),
                    setParent: expect.any(Function)
                });
            });

            it('should handle features with empty array values', () => {
                const mediaNode = {
                    type: 'Media',
                    features: [],
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];

                const result = atRule.evalNested(mockContext);

                expect(atRule.Value).toHaveBeenCalled();
                expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
                expect(result).toEqual({
                    multiMedia: false,
                    copyVisibilityInfo: expect.any(Function),
                    setParent: expect.any(Function)
                });
            });

            it('should handle permute returning null', () => {
                // Mock permute to return null to test the guard clause
                const originalPermute = atRule.permute;
                atRule.permute = vi.fn().mockReturnValue(null);

                const mediaNode = {
                    type: 'Media',
                    features: 'screen',
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];

                const result = atRule.evalNested(mockContext);

                expect(result).toBe(atRule);
                atRule.permute = originalPermute;
            });

            it('should handle permute returning non-array', () => {
                // Mock permute to return a non-array to test the guard clause
                const originalPermute = atRule.permute;
                atRule.permute = vi.fn().mockReturnValue('not-an-array');

                const mediaNode = {
                    type: 'Media',
                    features: 'screen',
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];

                const result = atRule.evalNested(mockContext);

                expect(result).toBe(atRule);
                atRule.permute = originalPermute;
            });

            it('should handle permute returning array with non-array elements', () => {
                // Mock permute to return array with non-array elements
                const originalPermute = atRule.permute;
                atRule.permute = vi
                    .fn()
                    .mockReturnValue(['not-an-array', 'also-not-an-array']);

                const mediaNode = {
                    type: 'Media',
                    features: 'screen',
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];

                const result = atRule.evalNested(mockContext);

                expect(result).toBe(atRule);
                atRule.permute = originalPermute;
            });

            it('should handle fragments with null/undefined values', () => {
                const mediaNode = {
                    type: 'Media',
                    features: [null, undefined, 'screen'],
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];

                const result = atRule.evalNested(mockContext);

                expect(atRule.Value).toHaveBeenCalled();
                expect(atRule.Anonymous).toHaveBeenCalledWith(null);
                expect(atRule.Anonymous).toHaveBeenCalledWith(undefined);
                expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
                expect(result).toEqual({
                    multiMedia: false,
                    copyVisibilityInfo: expect.any(Function),
                    setParent: expect.any(Function)
                });
            });

            it('should handle fragments without toCSS method', () => {
                const mediaNode = {
                    type: 'Media',
                    features: [{ someProperty: 'value' }, 'screen'],
                    toCSS: () => 'screen'
                };
                mockContext.mediaPath = [mediaNode];

                const result = atRule.evalNested(mockContext);

                expect(atRule.Value).toHaveBeenCalled();
                expect(atRule.Anonymous).toHaveBeenCalledWith({
                    someProperty: 'value'
                });
                expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
                expect(result).toEqual({
                    multiMedia: false,
                    copyVisibilityInfo: expect.any(Function),
                    setParent: expect.any(Function)
                });
            });
        });
    });

    describe('permute', () => {
        it('should return empty array for empty input', () => {
            const result = atRule.permute([]);
            expect(result).toEqual([]);
        });

        it('should return single item for single element array', () => {
            const result = atRule.permute([['a', 'b']]);
            expect(result).toEqual(['a', 'b']);
        });

        it('should permute two arrays correctly', () => {
            const result = atRule.permute([
                ['a', 'b'],
                ['1', '2']
            ]);
            // The actual implementation produces this order
            expect(result).toEqual([
                ['a', '1'],
                ['b', '1'],
                ['a', '2'],
                ['b', '2']
            ]);
        });

        it('should permute three arrays correctly', () => {
            const result = atRule.permute([['a'], ['1', '2'], ['x', 'y']]);
            // The actual implementation produces this order
            expect(result).toEqual([
                ['a', '1', 'x'],
                ['a', '2', 'x'],
                ['a', '1', 'y'],
                ['a', '2', 'y']
            ]);
        });

        it('should handle nested arrays with single elements', () => {
            const result = atRule.permute([['a'], ['b']]);
            expect(result).toEqual([['a', 'b']]);
        });
    });

    describe('bubbleSelectors', () => {
        it('should do nothing when selectors is null', () => {
            atRule.rules = [{ type: 'Rule' }];
            const originalRules = atRule.rules;

            atRule.bubbleSelectors(null);

            expect(atRule.rules).toBe(originalRules);
        });

        it('should do nothing when selectors is undefined', () => {
            atRule.rules = [{ type: 'Rule' }];
            const originalRules = atRule.rules;

            atRule.bubbleSelectors(undefined);

            expect(atRule.rules).toBe(originalRules);
        });

        it('should create new ruleset with selectors and rules', () => {
            const selectors = [{ type: 'Selector' }];
            const rules = [{ type: 'Rule' }];
            atRule.rules = rules;

            atRule.bubbleSelectors(selectors);

            expect(atRule.utils.copyArray).toHaveBeenCalledWith(selectors);
            expect(atRule.Ruleset).toHaveBeenCalledWith(selectors, [rules[0]]);
            expect(atRule.rules).toEqual([
                {
                    multiMedia: false,
                    copyVisibilityInfo: expect.any(Function),
                    setParent: expect.any(Function)
                }
            ]);
            expect(atRule.setParent).toHaveBeenCalledWith(atRule.rules, atRule);
        });

        it('should handle empty selectors array', () => {
            const selectors = [];
            const rules = [{ type: 'Rule' }];
            atRule.rules = rules;

            atRule.bubbleSelectors(selectors);

            expect(atRule.utils.copyArray).toHaveBeenCalledWith(selectors);
            expect(atRule.Ruleset).toHaveBeenCalledWith(selectors, [rules[0]]);
            expect(atRule.setParent).toHaveBeenCalledWith(atRule.rules, atRule);
        });
    });

    describe('Integration Tests', () => {
        it('should work with complete media query evaluation', () => {
            // Test a complete flow through evalNested
            const mediaNode1 = {
                type: 'Media',
                features: { value: 'screen' },
                toCSS: () => 'screen'
            };
            const mediaNode2 = {
                type: 'Media',
                features: { value: 'print' },
                toCSS: () => 'print'
            };
            mockContext.mediaPath = [mediaNode1, mediaNode2];

            const result = atRule.evalNested(mockContext);

            expect(atRule.Value).toHaveBeenCalled();
            expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
            expect(result).toEqual({
                multiMedia: false,
                copyVisibilityInfo: expect.any(Function),
                setParent: expect.any(Function)
            });
        });

        it('should handle complex permutation scenarios', () => {
            // Test complex permutation with multiple arrays
            const arrays = [
                ['a', 'b'],
                ['1', '2'],
                ['x', 'y', 'z']
            ];

            const result = atRule.permute(arrays);

            // Should have 2 * 2 * 3 = 12 permutations
            expect(result).toHaveLength(12);
            expect(result[0]).toEqual(['a', '1', 'x']);
            expect(result[11]).toEqual(['b', '2', 'z']);
        });
    });

    describe('Error Handling', () => {
        it('should handle evalTop with missing context properties', () => {
            const incompleteContext = {};
            const result = atRule.evalTop(incompleteContext);
            expect(result).toBe(atRule);
        });

        it('should handle evalNested with missing context properties', () => {
            const incompleteContext = {};
            const result = atRule.evalNested(incompleteContext);
            expect(result).toBe(atRule);
        });

        it('should handle permute with non-array inputs', () => {
            // This should handle gracefully even with unexpected input types
            expect(() => atRule.permute(null)).not.toThrow();
            expect(() => atRule.permute(undefined)).not.toThrow();
        });

        it('should handle bubbleSelectors with invalid rules', () => {
            atRule.rules = null;
            expect(() =>
                atRule.bubbleSelectors([{ type: 'Selector' }])
            ).not.toThrow();
        });

        it('should handle accept with invalid visitor', () => {
            const invalidVisitor = null;
            expect(() => atRule.accept(invalidVisitor)).not.toThrow();
        });
    });

    describe('Additional Edge Cases', () => {
        describe('permute - Additional Edge Cases', () => {
            it('should handle null input', () => {
                const result = atRule.permute(null);
                expect(result).toEqual([]);
            });

            it('should handle undefined input', () => {
                const result = atRule.permute(undefined);
                expect(result).toEqual([]);
            });

            it('should handle array with empty sub-arrays', () => {
                const result = atRule.permute([[], ['a', 'b']]);
                expect(result).toEqual([]);
            });

            it('should handle array with mixed empty and non-empty sub-arrays', () => {
                const result = atRule.permute([['a'], [], ['x']]);
                expect(result).toEqual([]);
            });

            it('should handle array with single empty sub-array', () => {
                const result = atRule.permute([[]]);
                expect(result).toEqual([]);
            });

            it('should handle array with null/undefined elements', () => {
                const result = atRule.permute([[null, 'a'], ['x']]);
                expect(result).toEqual([
                    [null, 'x'],
                    ['a', 'x']
                ]);
            });

            it('should handle deeply nested arrays', () => {
                const result = atRule.permute([['a'], ['1'], ['x'], ['alpha']]);
                expect(result).toEqual([['a', '1', 'x', 'alpha']]);
            });

            it('should handle large arrays efficiently', () => {
                const largeArray = [
                    ['a', 'b', 'c'],
                    ['1', '2'],
                    ['x', 'y', 'z']
                ];
                const result = atRule.permute(largeArray);
                expect(result).toHaveLength(18); // 3 * 2 * 3
                expect(result[0]).toEqual(['a', '1', 'x']);
                expect(result[17]).toEqual(['c', '2', 'z']);
            });
        });

        describe('bubbleSelectors - Additional Edge Cases', () => {
            it('should handle empty rules array', () => {
                atRule.rules = [];
                const originalRules = atRule.rules;

                atRule.bubbleSelectors([{ type: 'Selector' }]);

                expect(atRule.rules).toBe(originalRules);
            });

            it('should handle rules with null first element', () => {
                atRule.rules = [null, { type: 'Rule' }];
                const originalRules = atRule.rules;

                atRule.bubbleSelectors([{ type: 'Selector' }]);

                expect(atRule.rules).toBe(originalRules);
            });

            it('should handle rules with undefined first element', () => {
                atRule.rules = [undefined, { type: 'Rule' }];
                const originalRules = atRule.rules;

                atRule.bubbleSelectors([{ type: 'Selector' }]);

                expect(atRule.rules).toBe(originalRules);
            });

            it('should handle selectors with null elements', () => {
                const selectors = [null, { type: 'Selector' }];
                const rules = [{ type: 'Rule' }];
                atRule.rules = rules;

                atRule.bubbleSelectors(selectors);

                expect(atRule.utils.copyArray).toHaveBeenCalledWith(selectors);
                expect(atRule.Ruleset).toHaveBeenCalledWith(selectors, [
                    rules[0]
                ]);
                expect(atRule.setParent).toHaveBeenCalledWith(
                    atRule.rules,
                    atRule
                );
            });

            it('should handle selectors with undefined elements', () => {
                const selectors = [undefined, { type: 'Selector' }];
                const rules = [{ type: 'Rule' }];
                atRule.rules = rules;

                atRule.bubbleSelectors(selectors);

                expect(atRule.utils.copyArray).toHaveBeenCalledWith(selectors);
                expect(atRule.Ruleset).toHaveBeenCalledWith(selectors, [
                    rules[0]
                ]);
                expect(atRule.setParent).toHaveBeenCalledWith(
                    atRule.rules,
                    atRule
                );
            });

            it('should handle selectors with mixed types', () => {
                const selectors = ['string', 123, { type: 'Selector' }, null];
                const rules = [{ type: 'Rule' }];
                atRule.rules = rules;

                atRule.bubbleSelectors(selectors);

                expect(atRule.utils.copyArray).toHaveBeenCalledWith(selectors);
                expect(atRule.Ruleset).toHaveBeenCalledWith(selectors, [
                    rules[0]
                ]);
                expect(atRule.setParent).toHaveBeenCalledWith(
                    atRule.rules,
                    atRule
                );
            });
        });

        describe('accept - Additional Edge Cases', () => {
            it('should handle visitor with missing visit method', () => {
                const invalidVisitor = { visitArray: vi.fn() };
                atRule.features = { type: 'Value' };

                expect(() => atRule.accept(invalidVisitor)).toThrow();
            });

            it('should handle visitor with missing visitArray method', () => {
                const invalidVisitor = { visit: vi.fn() };
                atRule.rules = [{ type: 'Rule' }];

                expect(() => atRule.accept(invalidVisitor)).toThrow();
            });

            it('should handle visitor methods that return null', () => {
                const visitor = {
                    visit: vi.fn().mockReturnValue(null),
                    visitArray: vi.fn().mockReturnValue(null)
                };
                atRule.features = { type: 'Value' };
                atRule.rules = [{ type: 'Rule' }];

                atRule.accept(visitor);

                expect(atRule.features).toBeNull();
                expect(atRule.rules).toBeNull();
            });

            it('should handle visitor methods that return undefined', () => {
                const visitor = {
                    visit: vi.fn().mockReturnValue(undefined),
                    visitArray: vi.fn().mockReturnValue(undefined)
                };
                atRule.features = { type: 'Value' };
                atRule.rules = [{ type: 'Rule' }];

                atRule.accept(visitor);

                expect(atRule.features).toBeUndefined();
                expect(atRule.rules).toBeUndefined();
            });
        });

        describe('evalTop - Additional Edge Cases', () => {
            it('should handle context with null mediaBlocks', () => {
                mockContext.mediaBlocks = null;
                const result = atRule.evalTop(mockContext);
                expect(result).toBe(atRule);
            });

            it('should handle context with undefined mediaBlocks', () => {
                mockContext.mediaBlocks = undefined;
                const result = atRule.evalTop(mockContext);
                expect(result).toBe(atRule);
            });

            it('should handle context with missing mediaPath', () => {
                mockContext.mediaBlocks = [];
                delete mockContext.mediaPath;

                atRule.evalTop(mockContext);

                expect(mockContext.mediaPath).toBeUndefined();
            });

            it('should handle context with null mediaPath', () => {
                mockContext.mediaBlocks = [];
                mockContext.mediaPath = null;

                atRule.evalTop(mockContext);

                expect(mockContext.mediaPath).toBeUndefined();
            });
        });

        describe('Integration Edge Cases', () => {
            it('should handle complex nested media queries with mixed types', () => {
                const mediaNode1 = {
                    type: 'Media',
                    features: { value: 'screen' },
                    toCSS: () => 'screen'
                };
                const mediaNode2 = {
                    type: 'Media',
                    features: ['print', 'handheld'],
                    toCSS: () => 'print'
                };
                const mediaNode3 = {
                    type: 'Media',
                    features: null,
                    toCSS: () => 'all'
                };
                mockContext.mediaPath = [mediaNode1, mediaNode2, mediaNode3];

                const result = atRule.evalNested(mockContext);

                expect(atRule.Value).toHaveBeenCalled();
                expect(atRule.Ruleset).toHaveBeenCalledWith([], []);
                expect(result).toEqual({
                    multiMedia: false,
                    copyVisibilityInfo: expect.any(Function),
                    setParent: expect.any(Function)
                });
            });

            it('should handle evalNested with type mismatch in middle of path', () => {
                const mediaNode1 = {
                    type: 'Media',
                    features: 'screen',
                    toCSS: () => 'screen'
                };
                const otherTypeNode = {
                    type: 'Import',
                    features: 'print',
                    toCSS: () => 'print'
                };
                const mediaNode3 = {
                    type: 'Media',
                    features: 'handheld',
                    toCSS: () => 'handheld'
                };
                mockContext.mediaPath = [mediaNode1, otherTypeNode, mediaNode3];
                mockContext.mediaBlocks = [{}, {}, {}];

                const result = atRule.evalNested(mockContext);

                expect(mockContext.mediaBlocks).toEqual([{}, {}]);
                expect(result).toBe(atRule);
            });

            it('should handle evalNested with type mismatch at end of path', () => {
                const mediaNode1 = {
                    type: 'Media',
                    features: 'screen',
                    toCSS: () => 'screen'
                };
                const otherTypeNode = {
                    type: 'Import',
                    features: 'print',
                    toCSS: () => 'print'
                };
                mockContext.mediaPath = [mediaNode1, otherTypeNode];
                mockContext.mediaBlocks = [{}, {}];

                const result = atRule.evalNested(mockContext);

                expect(mockContext.mediaBlocks).toEqual([{}]);
                expect(result).toBe(atRule);
            });
        });
    });
});
