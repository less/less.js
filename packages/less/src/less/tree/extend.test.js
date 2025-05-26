import { describe, it, expect, beforeEach } from 'vitest';
import Extend from './extend';
import Selector from './selector';

describe('Extend', () => {
    let mockSelector;
    let mockFileInfo;
    let mockVisibilityInfo;

    beforeEach(() => {
        // Reset the static counter before each test
        Extend.next_id = 0;

        // Create mock objects
        mockSelector = new Selector([]);
        mockFileInfo = { filename: 'test.less', index: 0 };
        mockVisibilityInfo = { visibilityBlocks: [] };
    });

    describe('constructor', () => {
        it('should initialize with basic properties', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(extend.selector).toBe(mockSelector);
            expect(extend.option).toBe('all');
            expect(extend.object_id).toBe(0);
            expect(extend.parent_ids).toEqual([0]);
            expect(extend._index).toBe(0);
            expect(extend._fileInfo).toBe(mockFileInfo);
            expect(extend.allowRoot).toBe(true);
            expect(extend.allowBefore).toBe(true);
            expect(extend.allowAfter).toBe(true);
        });

        it('should handle !all option', () => {
            const extend = new Extend(
                mockSelector,
                '!all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(extend.allowBefore).toBe(true);
            expect(extend.allowAfter).toBe(true);
        });

        it('should handle default option', () => {
            const extend = new Extend(
                mockSelector,
                'default',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(extend.allowBefore).toBe(false);
            expect(extend.allowAfter).toBe(false);
        });

        it('should increment next_id for each new instance', () => {
            const extend1 = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const extend2 = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(extend1.object_id).toBe(0);
            expect(extend2.object_id).toBe(1);
        });

        it('should handle invalid option values', () => {
            const extend = new Extend(
                mockSelector,
                'invalid_option',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(extend.allowBefore).toBe(false);
            expect(extend.allowAfter).toBe(false);
        });

        it('should set parent relationship with selector', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(mockSelector.parent).toBe(extend);
        });

        it('should handle different visibility info structures', () => {
            const visibilityInfo = {
                visibilityBlocks: [1, 2, 3],
                nodeVisible: true
            };
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                visibilityInfo
            );
            expect(extend.visibilityInfo()).toEqual(visibilityInfo);
        });
    });

    describe('accept', () => {
        it('should visit the selector', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const mockVisitor = {
                visit: (node) => {
                    expect(node).toBe(mockSelector);
                    return new Selector([]);
                }
            };

            extend.accept(mockVisitor);
            expect(extend.selector).toBeInstanceOf(Selector);
        });

        it('should handle undefined visitor', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(() => extend.accept(undefined)).toThrow();
        });

        it('should handle visitor returning undefined', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const mockVisitor = {
                visit: () => undefined
            };
            extend.accept(mockVisitor);
            expect(extend.selector).toBeUndefined();
        });

        it('should handle visitor returning non-Selector object', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const mockVisitor = {
                visit: () => ({ not: 'a selector' })
            };
            extend.accept(mockVisitor);
            expect(extend.selector).toEqual({ not: 'a selector' });
        });
    });

    describe('eval', () => {
        it('should create a new Extend with evaluated selector', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const mockContext = {};

            const result = extend.eval(mockContext);

            expect(result).toBeInstanceOf(Extend);
            expect(result).not.toBe(extend);
            expect(result.option).toBe(extend.option);
            expect(result._index).toBe(extend._index);
            expect(result._fileInfo).toBe(extend._fileInfo);
        });

        it('should handle selector.eval throwing error', () => {
            const mockSelectorWithError = {
                eval: () => {
                    throw new Error('Eval error');
                }
            };
            const extend = new Extend(
                mockSelectorWithError,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(() => extend.eval({})).toThrow('Eval error');
        });

        it('should handle selector.eval returning null', () => {
            const mockSelectorReturningNull = {
                eval: () => null
            };
            const extend = new Extend(
                mockSelectorReturningNull,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const result = extend.eval({});
            expect(result.selector).toBeNull();
        });
    });

    describe('clone', () => {
        it('should create a new Extend with same properties', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const result = extend.clone();

            expect(result).toBeInstanceOf(Extend);
            expect(result).not.toBe(extend);
            expect(result.selector).toBe(extend.selector);
            expect(result.option).toBe(extend.option);
            expect(result._index).toBe(extend._index);
            expect(result._fileInfo).toBe(extend._fileInfo);
        });

        it('should handle context parameter', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const context = { some: 'context' };
            const result = extend.clone(context);
            expect(result).toBeInstanceOf(Extend);
            expect(result.selector).toBe(mockSelector);
        });

        it('should clone with different visibility states', () => {
            const visibilityInfo = {
                visibilityBlocks: [1],
                nodeVisible: false
            };
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                visibilityInfo
            );
            const result = extend.clone();
            expect(result.visibilityInfo()).toEqual(visibilityInfo);
        });
    });

    describe('findSelfSelectors', () => {
        it('should handle empty selectors array', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            extend.findSelfSelectors([]);

            expect(extend.selfSelectors).toHaveLength(1);
            expect(extend.selfSelectors[0]).toBeInstanceOf(Selector);
            expect(extend.selfSelectors[0].elements).toHaveLength(0);
        });

        it('should handle single selector', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const selectors = [new Selector([{ combinator: { value: '' } }])];

            extend.findSelfSelectors(selectors);

            expect(extend.selfSelectors).toHaveLength(1);
            expect(extend.selfSelectors[0]).toBeInstanceOf(Selector);
            expect(extend.selfSelectors[0].elements).toHaveLength(1);
            expect(extend.selfSelectors[0].elements[0].combinator.value).toBe(
                ''
            );
        });

        it('should throw when selectors array contains null', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const selectors = [null, new Selector([])];
            expect(() => extend.findSelfSelectors(selectors)).toThrow(
                "Cannot read properties of null (reading 'elements')"
            );
        });

        it('should preserve undefined combinator values', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const selectors = [
                new Selector([
                    {
                        combinator: {
                            value: undefined
                        }
                    }
                ])
            ];
            extend.findSelfSelectors(selectors);
            expect(
                extend.selfSelectors[0].elements[0].combinator.value
            ).toBeUndefined();
        });

        it('should handle empty selector elements array', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const selectors = [new Selector([])];
            extend.findSelfSelectors(selectors);
            expect(extend.selfSelectors[0].elements).toHaveLength(0);
        });

        it('should concatenate selectors with space combinator', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const selectors = [
                new Selector([{ combinator: { value: '' } }]),
                new Selector([{ combinator: { value: '' } }])
            ];
            extend.findSelfSelectors(selectors);
            expect(extend.selfSelectors[0].elements).toHaveLength(2);
            expect(extend.selfSelectors[0].elements[1].combinator.value).toBe(
                ' '
            );
        });

        it('should copy visibility info to selfSelectors', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const selectors = [new Selector([])];
            extend.findSelfSelectors(selectors);
            expect(extend.selfSelectors[0].visibilityInfo()).toEqual(
                mockVisibilityInfo
            );
        });
    });

    describe('type and inheritance', () => {
        it('should have correct type property', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(extend.type).toBe('Extend');
        });

        it('should have Node-like properties', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            // Check for Node-like properties
            expect(extend.parent).toBeDefined();
            expect(extend.visibilityBlocks).toBeDefined();
            expect(extend.type).toBeDefined();
            // nodeVisible is not required to be defined
        });

        it('should maintain allowRoot property', () => {
            const extend = new Extend(
                mockSelector,
                'all',
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            expect(extend.allowRoot).toBe(true);
            const cloned = extend.clone();
            expect(cloned.allowRoot).toBe(true);
        });
    });
});
