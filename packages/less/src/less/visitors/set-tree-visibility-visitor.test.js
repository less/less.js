import { describe, it, expect, beforeEach, vi } from 'vitest';
import SetTreeVisibilityVisitor from './set-tree-visibility-visitor.js';

describe('SetTreeVisibilityVisitor', () => {
    let visitor;

    describe('constructor', () => {
        it('should initialize with visible true', () => {
            visitor = new SetTreeVisibilityVisitor(true);
            expect(visitor.visible).toBe(true);
        });

        it('should initialize with visible false', () => {
            visitor = new SetTreeVisibilityVisitor(false);
            expect(visitor.visible).toBe(false);
        });

        it('should initialize with falsy values', () => {
            visitor = new SetTreeVisibilityVisitor(null);
            expect(visitor.visible).toBe(null);

            visitor = new SetTreeVisibilityVisitor(undefined);
            expect(visitor.visible).toBe(undefined);

            visitor = new SetTreeVisibilityVisitor(0);
            expect(visitor.visible).toBe(0);
        });
    });

    describe('run', () => {
        beforeEach(() => {
            visitor = new SetTreeVisibilityVisitor(true);
        });

        it('should call visit with the root node', () => {
            const mockRoot = { type: 'root' };
            const visitSpy = vi.spyOn(visitor, 'visit');
            
            visitor.run(mockRoot);
            
            expect(visitSpy).toHaveBeenCalledWith(mockRoot);
            expect(visitSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle null root', () => {
            const visitSpy = vi.spyOn(visitor, 'visit');
            
            visitor.run(null);
            
            expect(visitSpy).toHaveBeenCalledWith(null);
        });

        it('should handle undefined root', () => {
            const visitSpy = vi.spyOn(visitor, 'visit');
            
            visitor.run(undefined);
            
            expect(visitSpy).toHaveBeenCalledWith(undefined);
        });
    });

    describe('visitArray', () => {
        beforeEach(() => {
            visitor = new SetTreeVisibilityVisitor(true);
        });

        it('should return null when given null', () => {
            const result = visitor.visitArray(null);
            expect(result).toBe(null);
        });

        it('should return undefined when given undefined', () => {
            const result = visitor.visitArray(undefined);
            expect(result).toBe(undefined);
        });

        it('should return empty array unchanged', () => {
            const emptyArray = [];
            const result = visitor.visitArray(emptyArray);
            expect(result).toBe(emptyArray);
            expect(result).toEqual([]);
        });

        it('should visit each node in array', () => {
            const mockNode1 = { type: 'node1' };
            const mockNode2 = { type: 'node2' };
            const mockNode3 = { type: 'node3' };
            const nodes = [mockNode1, mockNode2, mockNode3];
            
            const visitSpy = vi.spyOn(visitor, 'visit');
            
            const result = visitor.visitArray(nodes);
            
            expect(visitSpy).toHaveBeenCalledTimes(3);
            expect(visitSpy).toHaveBeenNthCalledWith(1, mockNode1);
            expect(visitSpy).toHaveBeenNthCalledWith(2, mockNode2);
            expect(visitSpy).toHaveBeenNthCalledWith(3, mockNode3);
            expect(result).toBe(nodes);
        });

        it('should handle array with null/undefined elements', () => {
            const nodes = [null, undefined, { type: 'node' }];
            const visitSpy = vi.spyOn(visitor, 'visit');
            
            const result = visitor.visitArray(nodes);
            
            expect(visitSpy).toHaveBeenCalledTimes(3);
            expect(visitSpy).toHaveBeenNthCalledWith(1, null);
            expect(visitSpy).toHaveBeenNthCalledWith(2, undefined);
            expect(visitSpy).toHaveBeenNthCalledWith(3, { type: 'node' });
            expect(result).toBe(nodes);
        });

        it('should preserve array length and order', () => {
            const originalArray = [
                { type: 'first' },
                { type: 'second' },
                { type: 'third' },
                { type: 'fourth' }
            ];
            
            const result = visitor.visitArray(originalArray);
            
            expect(result).toBe(originalArray);
            expect(result.length).toBe(4);
            expect(result[0].type).toBe('first');
            expect(result[3].type).toBe('fourth');
        });
    });

    describe('visit', () => {
        describe('null and undefined handling', () => {
            beforeEach(() => {
                visitor = new SetTreeVisibilityVisitor(true);
            });

            it('should return null when given null', () => {
                const result = visitor.visit(null);
                expect(result).toBe(null);
            });

            it('should return undefined when given undefined', () => {
                const result = visitor.visit(undefined);
                expect(result).toBe(undefined);
            });
        });

        describe('array handling', () => {
            beforeEach(() => {
                visitor = new SetTreeVisibilityVisitor(true);
            });

            it('should call visitArray for array nodes', () => {
                const arrayNode = [{ type: 'child1' }, { type: 'child2' }];
                const visitArraySpy = vi.spyOn(visitor, 'visitArray');
                
                const result = visitor.visit(arrayNode);
                
                expect(visitArraySpy).toHaveBeenCalledWith(arrayNode);
                expect(result).toBe(arrayNode);
            });

            it('should handle empty arrays', () => {
                const emptyArray = [];
                const visitArraySpy = vi.spyOn(visitor, 'visitArray');
                
                const result = visitor.visit(emptyArray);
                
                expect(visitArraySpy).toHaveBeenCalledWith(emptyArray);
                expect(result).toBe(emptyArray);
            });
        });

        describe('nodes that block visibility', () => {
            beforeEach(() => {
                visitor = new SetTreeVisibilityVisitor(true);
            });

            it('should return unchanged when node has no blocksVisibility method', () => {
                const mockNode = { type: 'simple' };
                
                const result = visitor.visit(mockNode);
                
                expect(result).toBe(mockNode);
            });

            it('should return unchanged when blocksVisibility returns true', () => {
                const mockNode = {
                    type: 'blocking',
                    blocksVisibility: vi.fn(() => true)
                };
                
                const result = visitor.visit(mockNode);
                
                expect(mockNode.blocksVisibility).toHaveBeenCalled();
                expect(result).toBe(mockNode);
            });

            it('should not call visibility methods on blocking nodes', () => {
                const mockNode = {
                    type: 'blocking',
                    blocksVisibility: vi.fn(() => true),
                    ensureVisibility: vi.fn(),
                    ensureInvisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureVisibility).not.toHaveBeenCalled();
                expect(mockNode.ensureInvisibility).not.toHaveBeenCalled();
                expect(mockNode.accept).not.toHaveBeenCalled();
            });
        });

        describe('visibility handling for visible mode', () => {
            beforeEach(() => {
                visitor = new SetTreeVisibilityVisitor(true);
            });

            it('should call ensureVisibility when visible is true', () => {
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureVisibility: vi.fn(),
                    ensureInvisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureVisibility).toHaveBeenCalled();
                expect(mockNode.ensureInvisibility).not.toHaveBeenCalled();
            });

            it('should call accept after setting visibility', () => {
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureVisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureVisibility).toHaveBeenCalled();
                expect(mockNode.accept).toHaveBeenCalledWith(visitor);
            });

            it('should handle nodes without ensureVisibility method gracefully', () => {
                const mockNode = {
                    type: 'incomplete',
                    blocksVisibility: vi.fn(() => false),
                    accept: vi.fn()
                };
                
                expect(() => visitor.visit(mockNode)).toThrow();
            });
        });

        describe('visibility handling for invisible mode', () => {
            beforeEach(() => {
                visitor = new SetTreeVisibilityVisitor(false);
            });

            it('should call ensureInvisibility when visible is false', () => {
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureVisibility: vi.fn(),
                    ensureInvisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureInvisibility).toHaveBeenCalled();
                expect(mockNode.ensureVisibility).not.toHaveBeenCalled();
            });

            it('should call accept after setting invisibility', () => {
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureInvisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureInvisibility).toHaveBeenCalled();
                expect(mockNode.accept).toHaveBeenCalledWith(visitor);
            });

            it('should handle nodes without ensureInvisibility method gracefully', () => {
                const mockNode = {
                    type: 'incomplete',
                    blocksVisibility: vi.fn(() => false),
                    accept: vi.fn()
                };
                
                expect(() => visitor.visit(mockNode)).toThrow();
            });
        });

        describe('falsy visible values', () => {
            it('should call ensureInvisibility for null visible', () => {
                visitor = new SetTreeVisibilityVisitor(null);
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureVisibility: vi.fn(),
                    ensureInvisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureInvisibility).toHaveBeenCalled();
                expect(mockNode.ensureVisibility).not.toHaveBeenCalled();
            });

            it('should call ensureInvisibility for 0 visible', () => {
                visitor = new SetTreeVisibilityVisitor(0);
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureInvisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureInvisibility).toHaveBeenCalled();
            });

            it('should call ensureVisibility for truthy visible values', () => {
                visitor = new SetTreeVisibilityVisitor('truthy');
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureVisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                visitor.visit(mockNode);
                
                expect(mockNode.ensureVisibility).toHaveBeenCalled();
            });
        });

        describe('method call order', () => {
            beforeEach(() => {
                visitor = new SetTreeVisibilityVisitor(true);
            });

            it('should call methods in correct order', () => {
                const callOrder = [];
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => {
                        callOrder.push('blocksVisibility');
                        return false;
                    }),
                    ensureVisibility: vi.fn(() => {
                        callOrder.push('ensureVisibility');
                    }),
                    accept: vi.fn(() => {
                        callOrder.push('accept');
                    })
                };
                
                visitor.visit(mockNode);
                
                expect(callOrder).toEqual(['blocksVisibility', 'ensureVisibility', 'accept']);
            });
        });

        describe('return values', () => {
            beforeEach(() => {
                visitor = new SetTreeVisibilityVisitor(true);
            });

            it('should return the same node after processing', () => {
                const mockNode = {
                    type: 'testNode',
                    blocksVisibility: vi.fn(() => false),
                    ensureVisibility: vi.fn(),
                    accept: vi.fn()
                };
                
                const result = visitor.visit(mockNode);
                
                expect(result).toBe(mockNode);
            });

            it('should return the same blocking node unchanged', () => {
                const blockingNode = {
                    type: 'blocking',
                    blocksVisibility: vi.fn(() => true)
                };
                
                const result = visitor.visit(blockingNode);
                
                expect(result).toBe(blockingNode);
            });
        });
    });

    describe('integration tests', () => {
        it('should process complex tree structure with visible true', () => {
            visitor = new SetTreeVisibilityVisitor(true);
            
            const leafNode = {
                type: 'leaf',
                blocksVisibility: vi.fn(() => false),
                ensureVisibility: vi.fn(),
                accept: vi.fn()
            };
            
            const parentNode = {
                type: 'parent',
                blocksVisibility: vi.fn(() => false),
                ensureVisibility: vi.fn(),
                accept: vi.fn((v) => {
                    // Simulate parent visiting its children
                    v.visit(leafNode);
                })
            };
            
            visitor.run(parentNode);
            
            expect(parentNode.ensureVisibility).toHaveBeenCalled();
            expect(leafNode.ensureVisibility).toHaveBeenCalled();
            expect(parentNode.accept).toHaveBeenCalledWith(visitor);
            expect(leafNode.accept).toHaveBeenCalledWith(visitor);
        });

        it('should process array of mixed nodes', () => {
            visitor = new SetTreeVisibilityVisitor(false);
            
            const visibleNode = {
                type: 'visible',
                blocksVisibility: vi.fn(() => false),
                ensureInvisibility: vi.fn(),
                accept: vi.fn()
            };
            
            const blockingNode = {
                type: 'blocking',
                blocksVisibility: vi.fn(() => true)
            };
            
            const nodes = [visibleNode, blockingNode, null];
            
            visitor.run(nodes);
            
            expect(visibleNode.ensureInvisibility).toHaveBeenCalled();
            expect(visibleNode.accept).toHaveBeenCalled();
            expect(blockingNode.blocksVisibility).toHaveBeenCalled();
        });

        it('should handle deeply nested arrays', () => {
            visitor = new SetTreeVisibilityVisitor(true);
            
            const deepNode = {
                type: 'deep',
                blocksVisibility: vi.fn(() => false),
                ensureVisibility: vi.fn(),
                accept: vi.fn()
            };
            
            const nestedStructure = [[[deepNode]]];
            
            visitor.run(nestedStructure);
            
            expect(deepNode.ensureVisibility).toHaveBeenCalled();
        });
    });
});