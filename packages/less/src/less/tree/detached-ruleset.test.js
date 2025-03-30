import { describe, it, expect, vi } from 'vitest';
import DetachedRuleset from './detached-ruleset';
import Node from './node';
import contexts from '../contexts';

describe('DetachedRuleset', () => {
    // Mock dependencies
    const mockRuleset = Object.assign(new Node(), {
        eval: vi.fn()
    });

    const mockContext = {
        frames: ['frame1', 'frame2']
    };

    const mockVisitor = {
        visit: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create a DetachedRuleset instance with the provided ruleset', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(detachedRuleset.ruleset).toBe(mockRuleset);
            expect(detachedRuleset.frames).toBeUndefined();
        });

        it('should create a DetachedRuleset instance with the provided ruleset and frames', () => {
            const frames = ['frame1', 'frame2'];
            const detachedRuleset = new DetachedRuleset(mockRuleset, frames);
            expect(detachedRuleset.ruleset).toBe(mockRuleset);
            expect(detachedRuleset.frames).toBe(frames);
        });

        it('should set the parent of the ruleset to itself', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(mockRuleset.parent).toBe(detachedRuleset);
        });

        it('should handle null ruleset', () => {
            const detachedRuleset = new DetachedRuleset(null);
            expect(detachedRuleset.ruleset).toBeNull();
            expect(detachedRuleset.frames).toBeUndefined();
        });

        it('should handle undefined ruleset', () => {
            const detachedRuleset = new DetachedRuleset(undefined);
            expect(detachedRuleset.ruleset).toBeUndefined();
            expect(detachedRuleset.frames).toBeUndefined();
        });

        it('should handle null frames', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset, null);
            expect(detachedRuleset.frames).toBeNull();
        });

        it('should handle undefined frames', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset, undefined);
            expect(detachedRuleset.frames).toBeUndefined();
        });

        it('should handle setParent failure', () => {
            const originalSetParent = Node.prototype.setParent;
            Node.prototype.setParent = vi.fn().mockImplementation(() => {
                throw new Error('setParent failed');
            });

            expect(() => new DetachedRuleset(mockRuleset)).toThrow(
                'setParent failed'
            );

            Node.prototype.setParent = originalSetParent;
        });
    });

    describe('eval', () => {
        it('should return a new DetachedRuleset with the same ruleset when no frames provided', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const result = detachedRuleset.eval(mockContext);

            expect(result).toBeInstanceOf(DetachedRuleset);
            expect(result.ruleset).toBe(mockRuleset);
            expect(result.frames).toEqual(mockContext.frames);
        });

        it('should return a new DetachedRuleset with the same ruleset and frames when frames provided', () => {
            const frames = ['frame1', 'frame2'];
            const detachedRuleset = new DetachedRuleset(mockRuleset, frames);
            const result = detachedRuleset.eval(mockContext);

            expect(result).toBeInstanceOf(DetachedRuleset);
            expect(result.ruleset).toBe(mockRuleset);
            expect(result.frames).toBe(frames);
        });

        it('should handle undefined context frames', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const contextWithoutFrames = { frames: [] };
            const result = detachedRuleset.eval(contextWithoutFrames);

            expect(result).toBeInstanceOf(DetachedRuleset);
            expect(result.ruleset).toBe(mockRuleset);
            expect(result.frames).toEqual([]);
        });

        it('should handle null context', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(() => detachedRuleset.eval(null)).toThrow(
                "Cannot read properties of null (reading 'frames')"
            );
        });

        it('should handle undefined context', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(() => detachedRuleset.eval(undefined)).toThrow(
                "Cannot read properties of undefined (reading 'frames')"
            );
        });

        it('should handle context with undefined frames', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const contextWithUndefinedFrames = {};
            expect(() =>
                detachedRuleset.eval(contextWithUndefinedFrames)
            ).toThrow("Cannot read properties of undefined (reading 'length')");
        });

        it('should handle empty frames array in context', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const contextWithEmptyFrames = { frames: [] };
            const result = detachedRuleset.eval(contextWithEmptyFrames);

            expect(result).toBeInstanceOf(DetachedRuleset);
            expect(result.ruleset).toBe(mockRuleset);
            expect(result.frames).toEqual([]);
        });
    });

    describe('callEval', () => {
        it('should evaluate the ruleset with concatenated frames when frames exist', () => {
            const frames = ['frame1', 'frame2'];
            const detachedRuleset = new DetachedRuleset(mockRuleset, frames);
            const expectedContext = new contexts.Eval(
                mockContext,
                frames.concat(mockContext.frames)
            );

            detachedRuleset.callEval(mockContext);
            expect(mockRuleset.eval).toHaveBeenCalledWith(expectedContext);
        });

        it('should evaluate the ruleset with original context when no frames exist', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            detachedRuleset.callEval(mockContext);
            expect(mockRuleset.eval).toHaveBeenCalledWith(mockContext);
        });

        it('should handle undefined context', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const result = detachedRuleset.callEval(undefined);
            expect(mockRuleset.eval).toHaveBeenCalledWith(undefined);
            expect(result).toBeUndefined();
        });

        it('should handle null context', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const result = detachedRuleset.callEval(null);
            expect(mockRuleset.eval).toHaveBeenCalledWith(null);
            expect(result).toBeUndefined();
        });

        it('should handle ruleset eval throwing an error', () => {
            const errorRuleset = Object.assign(new Node(), {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Eval failed');
                })
            });
            const detachedRuleset = new DetachedRuleset(errorRuleset);

            expect(() => detachedRuleset.callEval(mockContext)).toThrow(
                'Eval failed'
            );
        });

        it('should handle ruleset eval returning null', () => {
            const nullRuleset = Object.assign(new Node(), {
                eval: vi.fn().mockReturnValue(null)
            });
            const detachedRuleset = new DetachedRuleset(nullRuleset);

            const result = detachedRuleset.callEval(mockContext);
            expect(result).toBeNull();
        });

        it('should handle ruleset eval returning undefined', () => {
            const undefinedRuleset = Object.assign(new Node(), {
                eval: vi.fn().mockReturnValue(undefined)
            });
            const detachedRuleset = new DetachedRuleset(undefinedRuleset);

            const result = detachedRuleset.callEval(mockContext);
            expect(result).toBeUndefined();
        });

        it('should handle context with undefined frames', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const contextWithUndefinedFrames = {};
            detachedRuleset.callEval(contextWithUndefinedFrames);
            expect(mockRuleset.eval).toHaveBeenCalledWith(
                contextWithUndefinedFrames
            );
        });

        it('should handle context with null frames', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const contextWithNullFrames = { frames: null };
            detachedRuleset.callEval(contextWithNullFrames);
            expect(mockRuleset.eval).toHaveBeenCalledWith(
                contextWithNullFrames
            );
        });

        it('should handle contexts.Eval constructor failure', () => {
            const originalEval = contexts.Eval;
            contexts.Eval = vi.fn().mockImplementation(() => {
                throw new Error('Eval constructor failed');
            });

            const frames = ['frame1', 'frame2'];
            const detachedRuleset = new DetachedRuleset(mockRuleset, frames);
            expect(() => detachedRuleset.callEval(mockContext)).toThrow(
                'Eval constructor failed'
            );

            contexts.Eval = originalEval;
        });

        it('should handle frames.concat failure', () => {
            const frames = {
                concat: vi.fn().mockImplementation(() => {
                    throw new Error('concat failed');
                })
            };
            const detachedRuleset = new DetachedRuleset(mockRuleset, frames);
            expect(() => detachedRuleset.callEval(mockContext)).toThrow(
                'concat failed'
            );
        });

        it('should handle ruleset eval returning a non-null value', () => {
            const valueRuleset = Object.assign(new Node(), {
                eval: vi.fn().mockReturnValue('test value')
            });
            const detachedRuleset = new DetachedRuleset(valueRuleset);

            const result = detachedRuleset.callEval(mockContext);
            expect(result).toBe('test value');
        });
    });

    describe('accept', () => {
        it('should visit the ruleset with the provided visitor', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            detachedRuleset.accept(mockVisitor);
            expect(mockVisitor.visit).toHaveBeenCalledWith(mockRuleset);
        });

        it('should handle null visitor', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(() => detachedRuleset.accept(null)).toThrow();
        });

        it('should handle undefined visitor', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(() => detachedRuleset.accept(undefined)).toThrow();
        });

        it('should handle visitor returning a different ruleset', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            const newRuleset = Object.assign(new Node(), {
                eval: vi.fn()
            });
            const visitor = {
                visit: vi.fn().mockReturnValue(newRuleset)
            };
            detachedRuleset.accept(visitor);
            expect(detachedRuleset.ruleset).toBe(newRuleset);
        });
    });

    describe('inheritance', () => {
        it('should inherit from Node', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(detachedRuleset).toBeInstanceOf(Node);
        });

        it('should have the correct type property', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(detachedRuleset.type).toBe('DetachedRuleset');
        });

        it('should have evalFirst set to true', () => {
            const detachedRuleset = new DetachedRuleset(mockRuleset);
            expect(detachedRuleset.evalFirst).toBe(true);
        });
    });
});
