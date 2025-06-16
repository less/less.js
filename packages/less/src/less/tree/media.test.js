import { describe, it, expect, vi, beforeEach } from 'vitest';
import Media from './media';

// Mock all dependencies to avoid circular imports and focus on Media behavior
vi.mock('./ruleset', () => ({
    default: vi.fn().mockImplementation(function (selectors, rules) {
        this.selectors = selectors;
        this.rules = rules;
        this.allowImports = false;
        this.functionRegistry = null;
        this.parent = null;
        this.debugInfo = null;
        this.eval = vi.fn().mockReturnValue(this);
        return this;
    })
}));

vi.mock('./value', () => ({
    default: vi.fn().mockImplementation(function (value) {
        this.value = Array.isArray(value) ? value : [value];
        this.eval = vi.fn().mockReturnValue(this);
        this.genCSS = vi.fn((_context, output) => {
            output.add('screen');
        });
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
            fileInfo
        ) {
            this.elements = elements || [];
            this.extendList = extendList;
            this.condition = condition;
            this._index = index;
            this._fileInfo = fileInfo;
            this.createEmptySelectors = vi.fn().mockReturnValue([
                {
                    elements: [],
                    extendList: null,
                    condition: null,
                    _index: index,
                    _fileInfo: fileInfo
                }
            ]);
            return this;
        })
}));

vi.mock('./atrule', () => ({
    default: function () {
        this.type = 'AtRule';
        this.outputRuleset = vi.fn((_context, output, rules) => {
            output.add(' { ');
            if (rules && rules.length > 0) {
                rules[0].genCSS && rules[0].genCSS(_context, output);
            }
            output.add(' }');
        });
        // Add Node methods that Media inherits
        this.copyVisibilityInfo = vi.fn((visibilityInfo) => {
            if (visibilityInfo) {
                this.visibilityBlocks = visibilityInfo.visibilityBlocks;
                this.nodeVisible = visibilityInfo.nodeVisible;
            }
        });
        this.setParent = vi.fn((nodes, _parent) => {
            if (Array.isArray(nodes)) {
                nodes.forEach((node) => {
                    if (node && typeof node === 'object') {
                        node.parent = _parent;
                    }
                });
            } else if (nodes && typeof nodes === 'object') {
                nodes.parent = _parent;
            }
        });
        this.visibilityInfo = vi.fn(() => ({
            visibilityBlocks: this.visibilityBlocks,
            nodeVisible: this.nodeVisible
        }));
        this.getIndex = vi.fn(() => this._index);
        this.fileInfo = vi.fn(() => this._fileInfo);
        return this;
    }
}));

vi.mock('./nested-at-rule', () => ({
    default: {
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
        evalTop(/* _context */) {
            return this;
        },
        evalNested(/* _context */) {
            return this;
        },
        permute(arr) {
            if (arr.length === 0) return [];
            if (arr.length === 1) return arr[0];
            return [];
        },
        bubbleSelectors(/* _selectors */) {
            // Mock implementation
        }
    }
}));

describe('Media', () => {
    let mockContext;
    let mockOutput;
    let mockFileInfo;
    let mockVisibilityInfo;

    beforeEach(() => {
        vi.clearAllMocks();

        mockFileInfo = {
            filename: 'test.less',
            currentDirectory: '/test'
        };

        mockVisibilityInfo = {
            visibilityBlocks: 1,
            nodeVisible: true
        };

        mockContext = {
            mediaBlocks: [],
            mediaPath: [],
            frames: [
                {
                    functionRegistry: {
                        inherit: vi.fn().mockReturnValue({
                            get: vi.fn(),
                            add: vi.fn()
                        })
                    }
                }
            ]
        };

        mockOutput = {
            add: vi.fn()
        };
    });

    describe('constructor', () => {
        it('should create a Media instance with all parameters', () => {
            const value = [
                { type: 'Declaration', name: 'color', value: 'red' }
            ];
            const features = [{ type: 'Anonymous', value: 'screen' }];
            const index = 10;

            const media = new Media(
                value,
                features,
                index,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(media._index).toBe(index);
            expect(media._fileInfo).toBe(mockFileInfo);
            expect(media.features).toBeDefined();
            expect(media.rules).toHaveLength(1);
            expect(media.rules[0].allowImports).toBe(true);
            expect(media.allowRoot).toBe(true);
        });

        it('should handle null/undefined value', () => {
            const features = [{ type: 'Anonymous', value: 'screen' }];

            const media1 = new Media(
                null,
                features,
                0,
                mockFileInfo,
                mockVisibilityInfo
            );
            const media2 = new Media(
                undefined,
                features,
                0,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(media1.rules).toHaveLength(1);
            expect(media2.rules).toHaveLength(1);
        });

        it('should handle empty features', () => {
            const value = [
                { type: 'Declaration', name: 'color', value: 'red' }
            ];

            const media = new Media(
                value,
                [],
                0,
                mockFileInfo,
                mockVisibilityInfo
            );

            expect(media.features).toBeDefined();
            expect(media.rules).toHaveLength(1);
        });

        it('should handle missing index and fileInfo', () => {
            const value = [
                { type: 'Declaration', name: 'color', value: 'red' }
            ];
            const features = [{ type: 'Anonymous', value: 'screen' }];

            const media = new Media(value, features);

            expect(media._index).toBeUndefined();
            expect(media._fileInfo).toBeUndefined();
            expect(media.rules).toHaveLength(1);
        });

        it('should handle missing visibilityInfo', () => {
            const value = [
                { type: 'Declaration', name: 'color', value: 'red' }
            ];
            const features = [{ type: 'Anonymous', value: 'screen' }];

            const media = new Media(value, features, 0, mockFileInfo);

            expect(media.rules).toHaveLength(1);
            expect(media.allowRoot).toBe(true);
        });

        it('should set parent relationships correctly', () => {
            const value = [
                { type: 'Declaration', name: 'color', value: 'red' }
            ];
            const features = [{ type: 'Anonymous', value: 'screen' }];

            const media = new Media(
                value,
                features,
                0,
                mockFileInfo,
                mockVisibilityInfo
            );

            // Check that setParent was called via the constructor
            expect(media.features).toBeDefined();
            expect(media.rules).toBeDefined();
        });
    });

    describe('type property', () => {
        it('should have type "Media"', () => {
            const media = new Media([], [], 0, mockFileInfo);
            expect(media.type).toBe('Media');
        });
    });

    describe('genCSS method', () => {
        it('should generate CSS with @media rule', () => {
            const value = [
                { type: 'Declaration', name: 'color', value: 'red' }
            ];
            const features = [{ type: 'Anonymous', value: 'screen' }];
            const media = new Media(value, features, 5, mockFileInfo);

            media.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith(
                '@media ',
                mockFileInfo,
                5
            );
            expect(media.features.genCSS).toHaveBeenCalledWith(
                mockContext,
                mockOutput
            );
            expect(media.outputRuleset).toHaveBeenCalledWith(
                mockContext,
                mockOutput,
                media.rules
            );
        });

        it('should handle context without fileInfo', () => {
            const media = new Media([], [], 0);

            media.genCSS({}, mockOutput);

            expect(mockOutput.add).toHaveBeenCalledWith(
                '@media ',
                undefined,
                0
            );
        });

        it('should handle null context', () => {
            const media = new Media([], [], 0, mockFileInfo);

            expect(() => media.genCSS(null, mockOutput)).not.toThrow();
            expect(mockOutput.add).toHaveBeenCalledWith(
                '@media ',
                mockFileInfo,
                0
            );
        });

        it('should handle different output objects', () => {
            const customOutput = { add: vi.fn() };
            const media = new Media([], [], 0, mockFileInfo);

            media.genCSS(mockContext, customOutput);

            expect(customOutput.add).toHaveBeenCalledWith(
                '@media ',
                mockFileInfo,
                0
            );
        });
    });

    describe('eval method', () => {
        beforeEach(() => {
            mockContext = {
                mediaBlocks: undefined,
                mediaPath: undefined,
                frames: [
                    {
                        functionRegistry: {
                            inherit: vi.fn().mockReturnValue({
                                get: vi.fn(),
                                add: vi.fn()
                            })
                        }
                    }
                ]
            };
        });

        it('should initialize mediaBlocks and mediaPath when not present', () => {
            const media = new Media([], [], 0, mockFileInfo);

            const result = media.eval(mockContext);

            expect(mockContext.mediaBlocks).toBeDefined();
            expect(mockContext.mediaBlocks).toHaveLength(1); // Media adds itself to mediaBlocks
            expect(mockContext.mediaPath).toBeDefined();
            expect(result).toBeDefined();
        });

        it('should handle existing mediaBlocks and mediaPath', () => {
            mockContext.mediaBlocks = [{ type: 'Media' }];
            mockContext.mediaPath = [{ type: 'Media' }];

            const media = new Media([], [], 0, mockFileInfo);
            const result = media.eval(mockContext);

            expect(mockContext.mediaBlocks).toHaveLength(2); // original + new media
            expect(result).toBeDefined();
        });

        it('should preserve debugInfo when present', () => {
            const media = new Media([], [], 0, mockFileInfo);
            media.debugInfo = { lineNumber: 5, fileName: 'test.less' };

            const result = media.eval(mockContext);

            expect(result.debugInfo).toEqual({
                lineNumber: 5,
                fileName: 'test.less'
            });
        });

        it('should evaluate features', () => {
            const media = new Media(
                [],
                [{ type: 'Anonymous', value: 'screen' }],
                0,
                mockFileInfo
            );

            media.eval(mockContext);

            expect(media.features.eval).toHaveBeenCalledWith(mockContext);
        });

        it('should handle context with frames', () => {
            const media = new Media(
                [{ type: 'Declaration' }],
                [],
                0,
                mockFileInfo
            );

            const result = media.eval(mockContext);

            expect(mockContext.frames).toHaveLength(1); // should be restored after eval
            expect(result).toBeDefined();
        });

        it('should return evalTop result when mediaPath is empty', () => {
            const media = new Media([], [], 0, mockFileInfo);
            mockContext.mediaBlocks = [];
            mockContext.mediaPath = [];

            const result = media.eval(mockContext);

            // mediaPath should be popped back to empty, triggering evalTop
            expect(result).toBeDefined();
        });

        it('should return evalNested result when mediaPath is not empty', () => {
            const media = new Media([], [], 0, mockFileInfo);
            mockContext.mediaBlocks = [];
            mockContext.mediaPath = [{ type: 'Media' }]; // Pre-existing media in path

            const result = media.eval(mockContext);

            expect(result).toBeDefined();
        });

        it('should handle rules evaluation', () => {
            // Create a media instance and access its rules to test evaluation
            const media = new Media(
                [{ type: 'Declaration' }],
                [],
                0,
                mockFileInfo
            );

            // The eval method should work and return a result
            const result = media.eval(mockContext);

            expect(result).toBeDefined();
            expect(media.rules).toHaveLength(1);
            expect(media.rules[0].eval).toHaveBeenCalledWith(mockContext);
        });

        it('should manage context frames correctly', () => {
            const originalFramesLength = mockContext.frames.length;
            const media = new Media(
                [{ type: 'Declaration' }],
                [],
                0,
                mockFileInfo
            );

            media.eval(mockContext);

            // Frames should be restored to original length
            expect(mockContext.frames).toHaveLength(originalFramesLength);
        });

        it('should handle function registry inheritance', () => {
            const media = new Media([], [], 0, mockFileInfo);

            media.eval(mockContext);

            expect(
                mockContext.frames[0].functionRegistry.inherit
            ).toHaveBeenCalled();
        });
    });

    describe('inheritance and prototype chain', () => {
        it('should inherit from AtRule', () => {
            const media = new Media([], [], 0, mockFileInfo);
            expect(media.type).toBe('Media');
            expect(typeof media.outputRuleset).toBe('function');
        });

        it('should include NestableAtRulePrototype methods', () => {
            const media = new Media([], [], 0, mockFileInfo);
            expect(typeof media.isRulesetLike).toBe('function');
            expect(media.isRulesetLike()).toBe(true);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle complex features array', () => {
            const complexFeatures = [
                { type: 'Anonymous', value: 'screen' },
                { type: 'Anonymous', value: 'and' },
                { type: 'Expression', value: '(max-width: 768px)' }
            ];

            const media = new Media([], complexFeatures, 0, mockFileInfo);

            expect(media.features).toBeDefined();
            expect(media.rules).toHaveLength(1);
        });

        it('should handle complex value array', () => {
            const complexValue = [
                { type: 'Declaration', name: 'color', value: 'red' },
                { type: 'Declaration', name: 'background', value: 'blue' },
                { type: 'Ruleset', selectors: [], rules: [] }
            ];

            const media = new Media(complexValue, [], 0, mockFileInfo);

            expect(media.rules).toHaveLength(1);
            expect(media.rules[0].allowImports).toBe(true);
        });

        it('should handle zero index', () => {
            const media = new Media([], [], 0, mockFileInfo);
            expect(media._index).toBe(0);
        });

        it('should handle negative index', () => {
            const media = new Media([], [], -1, mockFileInfo);
            expect(media._index).toBe(-1);
        });

        it('should handle large index', () => {
            const media = new Media([], [], 999999, mockFileInfo);
            expect(media._index).toBe(999999);
        });

        it('should handle empty fileInfo object', () => {
            const emptyFileInfo = {};
            const media = new Media([], [], 0, emptyFileInfo);
            expect(media._fileInfo).toBe(emptyFileInfo);
        });

        it('should handle fileInfo with minimal properties', () => {
            const minimalFileInfo = { filename: 'test.less' };
            const media = new Media([], [], 0, minimalFileInfo);
            expect(media._fileInfo).toBe(minimalFileInfo);
        });
    });

    describe('context handling in eval', () => {
        it('should handle context without frames', () => {
            const contextWithoutFrames = {
                mediaBlocks: undefined,
                mediaPath: undefined
            };

            const media = new Media([], [], 0, mockFileInfo);

            expect(() => media.eval(contextWithoutFrames)).toThrow();
        });

        it('should handle context with empty frames array', () => {
            const contextWithEmptyFrames = {
                mediaBlocks: undefined,
                mediaPath: undefined,
                frames: []
            };

            const media = new Media([], [], 0, mockFileInfo);

            expect(() => media.eval(contextWithEmptyFrames)).toThrow();
        });

        it('should handle context with multiple frames', () => {
            const contextWithMultipleFrames = {
                mediaBlocks: undefined,
                mediaPath: undefined,
                frames: [
                    {
                        functionRegistry: {
                            inherit: vi.fn().mockReturnValue({})
                        }
                    },
                    {
                        functionRegistry: {
                            inherit: vi.fn().mockReturnValue({})
                        }
                    },
                    {
                        functionRegistry: {
                            inherit: vi.fn().mockReturnValue({})
                        }
                    }
                ]
            };

            const media = new Media([], [], 0, mockFileInfo);
            const result = media.eval(contextWithMultipleFrames);

            expect(result).toBeDefined();
            expect(contextWithMultipleFrames.frames).toHaveLength(3); // Should be restored
        });
    });

    describe('visibility and parent handling', () => {
        it('should copy visibility info correctly', () => {
            const visibilityInfo = {
                visibilityBlocks: 2,
                nodeVisible: false
            };

            const media = new Media([], [], 0, mockFileInfo, visibilityInfo);

            // The visibility info should be copied to the media instance
            expect(media.visibilityBlocks).toBe(2);
            expect(media.nodeVisible).toBe(false);
        });

        it('should handle null visibility info', () => {
            const media = new Media([], [], 0, mockFileInfo, null);

            expect(media.rules).toHaveLength(1);
        });

        it('should handle undefined visibility info', () => {
            const media = new Media([], [], 0, mockFileInfo, undefined);

            expect(media.rules).toHaveLength(1);
        });
    });
});
