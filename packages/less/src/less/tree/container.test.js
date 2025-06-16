import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('./ruleset', () => ({
    default: vi.fn().mockImplementation(function (selectors, rules) {
        this.selectors = selectors;
        this.rules = rules;
        this.allowImports = false;
        this.functionRegistry = null;
        this.parent = null;
        this.eval = vi.fn().mockReturnValue(this);
        this.debugInfo = null;
        return this;
    })
}));

vi.mock('./value', () => ({
    default: vi.fn().mockImplementation(function (value) {
        this.value = value;
        this.genCSS = vi.fn();
        this.eval = vi.fn().mockReturnValue(this);
        this.parent = null;
        return this;
    })
}));

vi.mock('./selector', () => ({
    default: vi
        .fn()
        .mockImplementation(function (
            elements,
            extendList,
            condition,
            index,
            fileInfo,
            visibilityInfo
        ) {
            this.elements = elements || [];
            this.extendList = extendList;
            this.condition = condition;
            this._index = index;
            this._fileInfo = fileInfo;
            this.visibilityInfo = visibilityInfo;
            this.createEmptySelectors = vi.fn().mockReturnValue([]);
            this.parent = null;
            return this;
        })
}));

vi.mock('./atrule', () => ({
    default: vi.fn().mockImplementation(function () {
        this.outputRuleset = vi.fn();
        this.copyVisibilityInfo = vi.fn();
        this.setParent = vi.fn();
        this.evalTop = vi.fn().mockReturnValue('evalTop result');
        this.evalNested = vi.fn().mockReturnValue('evalNested result');
        this.visibilityInfo = vi.fn().mockReturnValue({});
        return this;
    })
}));

vi.mock('./nested-at-rule', () => ({ default: { someNestedMethod: vi.fn() } }));

import Container from './container';
import Ruleset from './ruleset';
import Value from './value';
import Selector from './selector';

describe('Container', () => {
    let mockFileInfo;
    let mockVisibilityInfo;
    let mockFeatures;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFileInfo = { filename: 'test.less', rootpath: '/test' };
        mockVisibilityInfo = { visibilityBlocks: 1, nodeVisible: true };
        mockFeatures = ['min-width: 300px'];
    });

    describe('constructor', () => {
        it('should create a Container with basic parameters', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(container._index).toBe(5);
            expect(container._fileInfo).toBe(mockFileInfo);
            expect(container.allowRoot).toBe(true);
        });

        it('should create empty selectors via Selector', () => {
            const mockEmptySelectors = [];
            Selector.mockImplementation(function () {
                this.createEmptySelectors = vi
                    .fn()
                    .mockReturnValue(mockEmptySelectors);
                return this;
            });

            new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(Selector).toHaveBeenCalledWith(
                [],
                null,
                null,
                5,
                mockFileInfo
            );
        });

        it('should create features as Value instance', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(Value).toHaveBeenCalledWith(mockFeatures);
            expect(container.features).toBeInstanceOf(Value);
        });

        it('should create rules with Ruleset', () => {
            const testValue = [{ type: 'test' }];
            const container = new Container(
                testValue,
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(Ruleset).toHaveBeenCalled();
            expect(container.rules).toHaveLength(1);
            expect(container.rules[0]).toBeInstanceOf(Ruleset);
        });

        it('should set allowImports to true on first rule', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(container.rules[0].allowImports).toBe(true);
        });

        it('should handle null/undefined parameters', () => {
            const container = new Container(null, null, undefined, null, null);

            expect(container._index).toBeUndefined();
            expect(container._fileInfo).toBeNull();
            expect(container.allowRoot).toBe(true);
        });
    });

    describe('prototype properties', () => {
        it('should have correct type', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(container.type).toBe('Container');
        });

        it('should have genCSS method', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(typeof container.genCSS).toBe('function');
        });

        it('should have eval method', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(typeof container.eval).toBe('function');
        });
    });

    describe('genCSS', () => {
        let container;
        let mockOutput;
        let mockContext;

        beforeEach(() => {
            container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );
            mockOutput = { add: vi.fn() };
            mockContext = { someContext: true };
        });

        it('should add @container directive to output', () => {
            container.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith(
                '@container ',
                mockFileInfo,
                5
            );
        });

        it('should call genCSS on features', () => {
            container.genCSS(mockContext, mockOutput);

            expect(container.features.genCSS).toHaveBeenCalledWith(
                mockContext,
                mockOutput
            );
        });

        it('should call outputRuleset with rules', () => {
            container.genCSS(mockContext, mockOutput);

            expect(container.outputRuleset).toHaveBeenCalledWith(
                mockContext,
                mockOutput,
                container.rules
            );
        });
    });

    describe('eval', () => {
        let container;
        let mockContext;

        beforeEach(() => {
            container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );
            mockContext = {
                frames: [
                    {
                        functionRegistry: {
                            inherit: vi.fn().mockReturnValue({})
                        }
                    }
                ]
            };
        });

        it('should initialize mediaBlocks and mediaPath if not present', () => {
            container.eval(mockContext);

            expect(mockContext.mediaBlocks).toBeDefined();
            expect(mockContext.mediaPath).toBeDefined();
            expect(Array.isArray(mockContext.mediaBlocks)).toBe(true);
            expect(Array.isArray(mockContext.mediaPath)).toBe(true);
        });

        it('should not reinitialize existing mediaBlocks and mediaPath', () => {
            mockContext.mediaBlocks = ['existing'];
            mockContext.mediaPath = ['existing'];

            container.eval(mockContext);

            // After eval, mediaBlocks and mediaPath should have added items but still contain the original
            expect(mockContext.mediaBlocks.length).toBeGreaterThanOrEqual(1);
            expect(mockContext.mediaPath.length).toBeGreaterThanOrEqual(1);
            expect(mockContext.mediaBlocks).toContain('existing');
        });

        it('should copy debugInfo if present', () => {
            container.debugInfo = { lineNumber: 10 };
            container.rules[0].debugInfo = null;

            container.eval(mockContext);

            expect(container.rules[0].debugInfo).toEqual({ lineNumber: 10 });
        });

        it('should evaluate features', () => {
            const evaluatedFeatures = { type: 'evaluated' };
            container.features.eval.mockReturnValue(evaluatedFeatures);

            container.eval(mockContext);

            expect(container.features.eval).toHaveBeenCalledWith(mockContext);
        });

        it('should inherit functionRegistry from first frame', () => {
            const inheritedRegistry = { type: 'inherited' };
            mockContext.frames[0].functionRegistry.inherit.mockReturnValue(
                inheritedRegistry
            );

            container.eval(mockContext);

            expect(container.rules[0].functionRegistry).toBe(inheritedRegistry);
        });

        it('should evaluate rules', () => {
            const evaluatedRule = { type: 'evaluated' };
            container.rules[0].eval.mockReturnValue(evaluatedRule);

            container.eval(mockContext);

            expect(container.rules[0].eval).toHaveBeenCalledWith(mockContext);
        });

        it('should call evalTop when mediaPath is empty after popping', () => {
            const mockEvalTop = vi.fn().mockReturnValue('evalTop result');
            const spy = vi
                .spyOn(Container.prototype, 'evalTop')
                .mockImplementation(mockEvalTop);

            const result = container.eval(mockContext);

            expect(result).toBeDefined();
            spy.mockRestore();
        });

        it('should call evalNested when mediaPath is not empty after popping', () => {
            mockContext.mediaPath = ['existing'];

            const mockEvalNested = vi.fn().mockReturnValue('evalNested result');
            const spy = vi
                .spyOn(Container.prototype, 'evalNested')
                .mockImplementation(mockEvalNested);

            const result = container.eval(mockContext);

            expect(result).toBeDefined();
            spy.mockRestore();
        });

        it('should handle context without frames', () => {
            delete mockContext.frames;

            expect(() => {
                container.eval(mockContext);
            }).toThrow();
        });

        it('should handle empty frames array', () => {
            mockContext.frames = [];

            expect(() => {
                container.eval(mockContext);
            }).toThrow();
        });

        it('should manage context frames properly', () => {
            const originalFramesLength = mockContext.frames.length;

            container.eval(mockContext);

            // Verify frames were managed correctly (unshift and then shift)
            expect(mockContext.frames.length).toBe(originalFramesLength);
        });

        it('should create new Container instance in eval', () => {
            const originalValueCalls = Value.mock.calls.length;

            container.eval(mockContext);

            // Should have created a new Container instance (which creates a new Value)
            expect(Value.mock.calls.length).toBeGreaterThan(originalValueCalls);
        });
    });

    describe('edge cases', () => {
        it('should handle very large index values', () => {
            const largeIndex = Number.MAX_SAFE_INTEGER;
            const container = new Container(
                [],
                mockFeatures,
                largeIndex,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(container._index).toBe(largeIndex);
        });

        it('should handle negative index values', () => {
            const negativeIndex = -1;
            const container = new Container(
                [],
                mockFeatures,
                negativeIndex,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(container._index).toBe(negativeIndex);
        });

        it('should handle complex nested features', () => {
            const complexFeatures = [
                'min-width: 300px',
                'max-width: 600px',
                'orientation: portrait'
            ];
            new Container(
                [],
                complexFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(Value).toHaveBeenCalledWith(complexFeatures);
        });

        it('should handle empty rules array', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(container.rules).toHaveLength(1);
            expect(container.rules[0]).toBeInstanceOf(Ruleset);
        });

        it('should maintain proper prototype chain', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            // Check that it's an instance of Container
            expect(container).toBeInstanceOf(Container);
            expect(typeof container.genCSS).toBe('function');
            expect(typeof container.eval).toBe('function');
        });

        it('should handle null value parameter', () => {
            const container = new Container(
                null,
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(Ruleset).toHaveBeenCalled();
            expect(container.rules).toHaveLength(1);
        });

        it('should handle undefined features parameter', () => {
            new Container([], undefined, 5, mockFileInfo, mockVisibilityInfo);

            expect(Value).toHaveBeenCalledWith(undefined);
        });

        it('should handle missing visibilityInfo', () => {
            const container = new Container([], mockFeatures, 5, mockFileInfo);

            expect(container._index).toBe(5);
            expect(container._fileInfo).toBe(mockFileInfo);
        });

        it('should properly set up parent relationships', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(container.setParent).toHaveBeenCalledTimes(3);
        });

        it('should copy visibility info when provided', () => {
            const container = new Container(
                [],
                mockFeatures,
                5,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(container.copyVisibilityInfo).toHaveBeenCalledWith(
                mockVisibilityInfo
            );
        });
    });

    describe('integration with mocked dependencies', () => {
        it('should work with all mocked dependencies', () => {
            const testValue = [
                { type: 'test', property: 'color', value: 'red' }
            ];
            const testFeatures = ['min-width: 300px', 'max-width: 600px'];

            const container = new Container(
                testValue,
                testFeatures,
                10,
                mockFileInfo,
                mockVisibilityInfo
            );

            // Test genCSS
            const mockOutput = { add: vi.fn() };
            const mockContext = { someContext: true };
            container.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith(
                '@container ',
                mockFileInfo,
                10
            );
            expect(container.features.genCSS).toHaveBeenCalledWith(
                mockContext,
                mockOutput
            );

            // Test eval
            const evalContext = {
                frames: [
                    {
                        functionRegistry: {
                            inherit: vi.fn().mockReturnValue({})
                        }
                    }
                ]
            };
            const result = container.eval(evalContext);

            expect(result).toBeDefined();
            expect(evalContext.mediaBlocks).toBeDefined();
            expect(evalContext.mediaPath).toBeDefined();
        });
    });
});
