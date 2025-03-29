import { describe, it, expect, vi } from 'vitest';
import Anonymous from './anonymous';
import Node from './node';

describe('Anonymous', () => {
    describe('constructor', () => {
        it('should create an instance with default values', () => {
            const anonymous = new Anonymous('test');
            expect(anonymous.value).toBe('test');
            expect(anonymous._index).toBeUndefined();
            expect(anonymous._fileInfo).toBeUndefined();
            expect(anonymous.mapLines).toBeUndefined();
            expect(anonymous.rulesetLike).toBe(false);
            expect(anonymous.allowRoot).toBe(true);
        });

        it('should create an instance with all parameters', () => {
            const fileInfo = { filename: 'test.less' };
            const anonymous = new Anonymous('test', 1, fileInfo, true, true, {
                visibilityBlocks: 1,
                nodeVisible: true
            });

            expect(anonymous.value).toBe('test');
            expect(anonymous._index).toBe(1);
            expect(anonymous._fileInfo).toBe(fileInfo);
            expect(anonymous.mapLines).toBe(true);
            expect(anonymous.rulesetLike).toBe(true);
            expect(anonymous.allowRoot).toBe(true);
            expect(anonymous.visibilityBlocks).toBe(1);
            expect(anonymous.nodeVisible).toBe(true);
        });
    });

    describe('eval', () => {
        it('should return a new Anonymous instance with same properties', () => {
            const original = new Anonymous('test', 1, {
                filename: 'test.less'
            });
            const evaluated = original.eval();

            expect(evaluated).toBeInstanceOf(Anonymous);
            expect(evaluated.value).toBe(original.value);
            expect(evaluated._index).toBe(original._index);
            expect(evaluated._fileInfo).toBe(original._fileInfo);
            expect(evaluated.mapLines).toBe(original.mapLines);
            expect(evaluated.rulesetLike).toBe(original.rulesetLike);
        });
    });

    describe('compare', () => {
        it('should return 0 when comparing with identical Anonymous node', () => {
            const a = new Anonymous('test');
            const b = new Anonymous('test');
            expect(a.compare(b)).toBe(0);
        });

        it('should return undefined when comparing with different Anonymous node', () => {
            const a = new Anonymous('test1');
            const b = new Anonymous('test2');
            expect(a.compare(b)).toBeUndefined();
        });

        it('should return undefined when comparing with non-Anonymous node', () => {
            const a = new Anonymous('test');
            const b = new Node();
            expect(a.compare(b)).toBeUndefined();
        });
    });

    describe('isRulesetLike', () => {
        it('should return true when rulesetLike is true', () => {
            const anonymous = new Anonymous('test', null, null, null, true);
            expect(anonymous.isRulesetLike()).toBe(true);
        });

        it('should return false when rulesetLike is false', () => {
            const anonymous = new Anonymous('test', null, null, null, false);
            expect(anonymous.isRulesetLike()).toBe(false);
        });
    });

    describe('genCSS', () => {
        it('should add value to output when node is visible', () => {
            const anonymous = new Anonymous('test', null, null, null, false, {
                visibilityBlocks: 0,
                nodeVisible: true
            });
            const output = {
                add: vi.fn()
            };
            anonymous.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('test', null, null, null);
        });

        it('should not add value to output when node is not visible', () => {
            const anonymous = new Anonymous('', null, null, null, false, {
                visibilityBlocks: 0,
                nodeVisible: false
            });
            const output = {
                add: vi.fn()
            };
            anonymous.genCSS({}, output);
            expect(output.add).not.toHaveBeenCalled();
        });
    });

    describe('visibility handling', () => {
        it('should copy visibility info correctly', () => {
            const anonymous = new Anonymous('test');
            const visibilityInfo = {
                visibilityBlocks: 2,
                nodeVisible: true
            };
            anonymous.copyVisibilityInfo(visibilityInfo);
            expect(anonymous.visibilityBlocks).toBe(2);
            expect(anonymous.nodeVisible).toBe(true);
        });

        it('should handle undefined visibility info', () => {
            const anonymous = new Anonymous('test');
            anonymous.copyVisibilityInfo(undefined);
            expect(anonymous.visibilityBlocks).toBeUndefined();
            expect(anonymous.nodeVisible).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('should handle null value', () => {
            const anonymous = new Anonymous(null);
            expect(anonymous.value).toBeNull();
            expect(anonymous.nodeVisible).toBe(undefined);
        });

        it('should handle undefined value', () => {
            const anonymous = new Anonymous(undefined);
            expect(anonymous.value).toBeUndefined();
            expect(anonymous.nodeVisible).toBe(undefined);
        });

        it('should handle empty string value', () => {
            const anonymous = new Anonymous('');
            expect(anonymous.value).toBe('');
            expect(anonymous.nodeVisible).toBe(undefined);
        });
    });

    describe('visibility methods', () => {
        it('should handle blocksVisibility correctly', () => {
            const anonymous = new Anonymous('test');
            expect(anonymous.blocksVisibility()).toBe(false);
            anonymous.visibilityBlocks = 1;
            expect(anonymous.blocksVisibility()).toBe(true);
        });

        it('should handle addVisibilityBlock correctly', () => {
            const anonymous = new Anonymous('test');
            anonymous.addVisibilityBlock();
            expect(anonymous.visibilityBlocks).toBe(1);
            anonymous.addVisibilityBlock();
            expect(anonymous.visibilityBlocks).toBe(2);
        });

        it('should copy visibility info in eval', () => {
            const original = new Anonymous('test', null, null, null, false, {
                visibilityBlocks: 2,
                nodeVisible: true
            });
            const evaluated = original.eval();
            expect(evaluated.visibilityBlocks).toBe(2);
            expect(evaluated.nodeVisible).toBe(true);
        });
    });

    describe('context handling', () => {
        it('should handle different mapLines values', () => {
            const anonymous = new Anonymous('test', null, null, true);
            const output = { add: vi.fn() };
            anonymous.genCSS({}, output);
            expect(output.add).toHaveBeenCalledWith('test', null, null, true);
        });

        it('should handle compressed context', () => {
            const anonymous = new Anonymous('test');
            const output = { add: vi.fn() };
            anonymous.genCSS({ compress: true }, output);
            expect(output.add).toHaveBeenCalledWith(
                'test',
                undefined,
                undefined,
                undefined
            );
        });
    });
});
