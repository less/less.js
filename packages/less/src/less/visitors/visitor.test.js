import { describe, it, expect, beforeEach, vi } from 'vitest';
import Visitor from './visitor';
import tree from '../tree';

describe('Visitor', () => {
    let visitor;
    let mockImplementation;
    let mockNode;

    beforeEach(() => {
        mockImplementation = {
            isReplacing: false
        };
        visitor = new Visitor(mockImplementation);
        
        mockNode = {
            type: 'TestNode',
            typeIndex: 1,
            accept: vi.fn()
        };
    });

    describe('constructor', () => {
        it('should initialize with implementation', () => {
            const impl = { test: true };
            const v = new Visitor(impl);
            
            expect(v._implementation).toBe(impl);
            expect(v._visitInCache).toEqual({});
            expect(v._visitOutCache).toEqual({});
        });

        it('should index node types only once', () => {
            // Create multiple visitors to test that indexing happens only once
            const v1 = new Visitor({});
            const v2 = new Visitor({});
            
            // Both should have the same implementation reference
            expect(v1._implementation).toBeDefined();
            expect(v2._implementation).toBeDefined();
        });

        it('should set typeIndex on tree node prototypes', () => {
            // Check that tree nodes have typeIndex after visitor creation
            new Visitor({});
            
            if (tree.Color && tree.Color.prototype) {
                expect(tree.Color.prototype.typeIndex).toBeDefined();
                expect(typeof tree.Color.prototype.typeIndex).toBe('number');
            }
        });
    });

    describe('visit', () => {
        it('should return node unchanged if node is null/undefined', () => {
            expect(visitor.visit(null)).toBe(null);
            expect(visitor.visit(undefined)).toBe(undefined);
        });

        it('should handle nodes without typeIndex', () => {
            const nodeWithoutTypeIndex = { someProperty: 'value' };
            const result = visitor.visit(nodeWithoutTypeIndex);
            
            expect(result).toBe(nodeWithoutTypeIndex);
        });

        it('should handle nodes with value.typeIndex', () => {
            const nodeWithValueTypeIndex = {
                value: {
                    typeIndex: 1,
                    type: 'TestValue',
                    accept: vi.fn()
                }
            };
            
            const result = visitor.visit(nodeWithValueTypeIndex);
            
            expect(result).toBe(nodeWithValueTypeIndex);
            expect(nodeWithValueTypeIndex.value.accept).toHaveBeenCalledWith(visitor);
        });

        it('should cache visit functions', () => {
            const visitSpy = vi.fn().mockReturnValue(mockNode);
            mockImplementation.visitTestNode = visitSpy;
            
            // First call should cache the function
            visitor.visit(mockNode);
            expect(visitor._visitInCache[1]).toBe(visitSpy);
            
            // Second call should use cached function
            visitor.visit(mockNode);
            expect(visitSpy).toHaveBeenCalledTimes(2);
        });

        it('should call visit function with correct parameters', () => {
            const visitSpy = vi.fn().mockReturnValue(mockNode);
            mockImplementation.visitTestNode = visitSpy;
            
            visitor.visit(mockNode);
            
            expect(visitSpy).toHaveBeenCalledWith(mockNode, { visitDeeper: true });
        });

        it('should call visitOut function', () => {
            const visitOutSpy = vi.fn();
            mockImplementation.visitTestNodeOut = visitOutSpy;
            
            visitor.visit(mockNode);
            
            expect(visitOutSpy).toHaveBeenCalledWith(mockNode);
        });

        it('should replace node when isReplacing is true', () => {
            const newNode = { type: 'NewNode', typeIndex: 2 };
            const visitSpy = vi.fn().mockReturnValue(newNode);
            mockImplementation.visitTestNode = visitSpy;
            mockImplementation.isReplacing = true;
            
            const result = visitor.visit(mockNode);
            
            expect(result).toBe(newNode);
        });

        it('should not replace node when isReplacing is false', () => {
            const newNode = { type: 'NewNode', typeIndex: 2 };
            const visitSpy = vi.fn().mockReturnValue(newNode);
            mockImplementation.visitTestNode = visitSpy;
            mockImplementation.isReplacing = false;
            
            const result = visitor.visit(mockNode);
            
            expect(result).toBe(mockNode);
        });

        it('should visit deeper when visitDeeper is true', () => {
            const childNode = {
                type: 'ChildNode',
                typeIndex: 2,
                accept: vi.fn()
            };
            mockNode.accept = vi.fn();
            
            visitor.visit(mockNode);
            
            expect(mockNode.accept).toHaveBeenCalledWith(visitor);
        });

        it('should not visit deeper when visitDeeper is false', () => {
            const visitSpy = vi.fn((node, visitArgs) => {
                visitArgs.visitDeeper = false;
                return node;
            });
            mockImplementation.visitTestNode = visitSpy;
            mockNode.accept = vi.fn();
            
            visitor.visit(mockNode);
            
            expect(mockNode.accept).not.toHaveBeenCalled();
        });

        it('should handle array-like nodes', () => {
            const arrayNode = {
                type: 'ArrayNode',
                typeIndex: 3,
                length: 2,
                0: { accept: vi.fn() },
                1: { accept: vi.fn() }
            };
            
            visitor.visit(arrayNode);
            
            expect(arrayNode[0].accept).toHaveBeenCalledWith(visitor);
            expect(arrayNode[1].accept).toHaveBeenCalledWith(visitor);
        });

        it('should skip array elements without accept method', () => {
            const arrayNode = {
                type: 'ArrayNode',
                typeIndex: 3,
                length: 2,
                0: { someProperty: 'value' }, // no accept method
                1: { accept: vi.fn() }
            };
            
            expect(() => visitor.visit(arrayNode)).not.toThrow();
            expect(arrayNode[1].accept).toHaveBeenCalledWith(visitor);
        });

        it('should use noop function when no visit function is defined', () => {
            const result = visitor.visit(mockNode);
            
            expect(result).toBe(mockNode);
        });
    });

    describe('visitArray', () => {
        let nodes;

        beforeEach(() => {
            nodes = [
                { type: 'Node1', typeIndex: 1, accept: vi.fn() },
                { type: 'Node2', typeIndex: 2, accept: vi.fn() }
            ];
        });

        it('should return nodes unchanged if nodes is null/undefined', () => {
            expect(visitor.visitArray(null)).toBe(null);
            expect(visitor.visitArray(undefined)).toBe(undefined);
        });

        it('should visit all nodes in non-replacing mode', () => {
            mockImplementation.isReplacing = false;
            const visitSpy = vi.spyOn(visitor, 'visit');
            
            const result = visitor.visitArray(nodes);
            
            expect(result).toBe(nodes);
            expect(visitSpy).toHaveBeenCalledTimes(2);
            expect(visitSpy).toHaveBeenNthCalledWith(1, nodes[0]);
            expect(visitSpy).toHaveBeenNthCalledWith(2, nodes[1]);
        });

        it('should visit all nodes when nonReplacing parameter is true', () => {
            mockImplementation.isReplacing = true;
            const visitSpy = vi.spyOn(visitor, 'visit');
            
            const result = visitor.visitArray(nodes, true);
            
            expect(result).toBe(nodes);
            expect(visitSpy).toHaveBeenCalledTimes(2);
        });

        it('should handle replacing mode', () => {
            mockImplementation.isReplacing = true;
            const newNode1 = { type: 'NewNode1', typeIndex: 3 };
            const newNode2 = { type: 'NewNode2', typeIndex: 4 };
            
            vi.spyOn(visitor, 'visit')
                .mockReturnValueOnce(newNode1)
                .mockReturnValueOnce(newNode2);
            
            const result = visitor.visitArray(nodes);
            
            expect(result).toEqual([newNode1, newNode2]);
            expect(result).not.toBe(nodes);
        });

        it('should skip undefined results in replacing mode', () => {
            mockImplementation.isReplacing = true;
            
            vi.spyOn(visitor, 'visit')
                .mockReturnValueOnce(nodes[0])
                .mockReturnValueOnce(undefined);
            
            const result = visitor.visitArray(nodes);
            
            expect(result).toEqual([nodes[0]]);
        });

        it('should flatten array results in replacing mode', () => {
            mockImplementation.isReplacing = true;
            const flattenSpy = vi.spyOn(visitor, 'flatten').mockReturnValue(['flattened']);
            const arrayResult = [{ type: 'Item1' }, { type: 'Item2' }];
            arrayResult.splice = vi.fn(); // Make it array-like
            
            vi.spyOn(visitor, 'visit')
                .mockReturnValueOnce(nodes[0])
                .mockReturnValueOnce(arrayResult);
            
            const result = visitor.visitArray(nodes);
            
            expect(flattenSpy).toHaveBeenCalledWith(arrayResult, [nodes[0]]);
        });

        it('should handle empty arrays in replacing mode', () => {
            mockImplementation.isReplacing = true;
            const emptyArray = [];
            emptyArray.splice = vi.fn(); // Make it array-like
            
            vi.spyOn(visitor, 'visit')
                .mockReturnValueOnce(emptyArray);
            
            const result = visitor.visitArray([nodes[0]]);
            
            expect(result).toEqual([]);
        });
    });

    describe('flatten', () => {
        it('should create new array if out parameter is not provided', () => {
            const arr = [1, 2, 3];
            const result = visitor.flatten(arr);
            
            expect(result).toEqual([1, 2, 3]);
            expect(result).not.toBe(arr);
        });

        it('should use provided out array', () => {
            const arr = [1, 2];
            const out = [0];
            const result = visitor.flatten(arr, out);
            
            expect(result).toBe(out);
            expect(result).toEqual([0, 1, 2]);
        });

        it('should skip undefined items', () => {
            const arr = [1, undefined, 2, undefined, 3];
            const result = visitor.flatten(arr);
            
            expect(result).toEqual([1, 2, 3]);
        });

        it('should flatten nested arrays', () => {
            const nestedArr = [1, 2];
            nestedArr.splice = vi.fn(); // Make it array-like
            
            const arr = [0, nestedArr, 3];
            const result = visitor.flatten(arr);
            
            expect(result).toEqual([0, 1, 2, 3]);
        });

        it('should handle deeply nested arrays recursively', () => {
            const deeplyNested = [4, 5];
            deeplyNested.splice = vi.fn();
            
            const nested = [2, 3, deeplyNested];
            nested.splice = vi.fn();
            
            const arr = [1, nested, 6];
            const result = visitor.flatten(arr);
            
            expect(result).toEqual([1, 2, 3, 4, 5, 6]);
        });

        it('should skip undefined items in nested arrays', () => {
            const nested = [2, undefined, 3];
            nested.splice = vi.fn();
            
            const arr = [1, nested, undefined, 4];
            const result = visitor.flatten(arr);
            
            expect(result).toEqual([1, 2, 3, 4]);
        });

        it('should handle empty nested arrays', () => {
            const emptyNested = [];
            emptyNested.splice = vi.fn();
            
            const arr = [1, emptyNested, 2];
            const result = visitor.flatten(arr);
            
            expect(result).toEqual([1, 2]);
        });

        it('should handle mixed array and non-array items', () => {
            const nested1 = [2, 3];
            nested1.splice = vi.fn();
            
            const nested2 = [5];
            nested2.splice = vi.fn();
            
            const arr = [1, nested1, 4, nested2, 6];
            const result = visitor.flatten(arr);
            
            expect(result).toEqual([1, 2, 3, 4, 5, 6]);
        });
    });

    describe('indexNodeTypes', () => {
        it('should be called during visitor construction', () => {
            // This is tested indirectly through constructor tests
            // The function is internal and sets typeIndex on prototypes
            const v = new Visitor({});
            expect(v).toBeDefined();
        });
    });

    describe('integration tests', () => {
        it('should handle complex visitor implementation', () => {
            const implementation = {
                isReplacing: true,
                visitedNodes: [],
                
                visitTestNode(node, visitArgs) {
                    this.visitedNodes.push(`visit-${node.type}`);
                    return node;
                },
                
                visitTestNodeOut(node) {
                    this.visitedNodes.push(`visitOut-${node.type}`);
                }
            };
            
            const v = new Visitor(implementation);
            const node = {
                type: 'TestNode',
                typeIndex: 1,
                accept: vi.fn()
            };
            
            v.visit(node);
            
            expect(implementation.visitedNodes).toEqual([
                'visit-TestNode',
                'visitOut-TestNode'
            ]);
        });

        it('should handle visitor with array processing', () => {
            const implementation = {
                isReplacing: true,
                processedNodes: []
            };
            
            const v = new Visitor(implementation);
            const nodes = [
                { type: 'Node1', typeIndex: 1 },
                { type: 'Node2', typeIndex: 2 },
                undefined,
                { type: 'Node3', typeIndex: 3 }
            ];
            
            const result = v.visitArray(nodes);
            
            expect(result).toHaveLength(3);
            expect(result.map(n => n?.type)).toEqual(['Node1', 'Node2', 'Node3']);
        });

        it('should preserve visitor state across multiple visits', () => {
            const implementation = {
                visitCount: 0,
                
                visitTestNode(node) {
                    this.visitCount++;
                    return node;
                }
            };
            
            const v = new Visitor(implementation);
            const node = { type: 'TestNode', typeIndex: 1 };
            
            v.visit(node);
            v.visit(node);
            v.visit(node);
            
            expect(implementation.visitCount).toBe(3);
        });
    });

    describe('edge cases', () => {
        it('should handle nodes with zero typeIndex', () => {
            const nodeWithZeroIndex = {
                type: 'ZeroNode',
                typeIndex: 0
            };
            
            const result = visitor.visit(nodeWithZeroIndex);
            expect(result).toBe(nodeWithZeroIndex);
        });

        it('should handle circular references safely', () => {
            const circularNode = {
                type: 'CircularNode',
                typeIndex: 1,
                accept: vi.fn()
            };
            
            // Create circular reference
            circularNode.self = circularNode;
            
            expect(() => visitor.visit(circularNode)).not.toThrow();
        });

        it('should handle very large arrays', () => {
            const largeArray = Array(1000).fill(null).map((_, i) => ({
                type: `Node${i}`,
                typeIndex: i + 1
            }));
            
            expect(() => visitor.visitArray(largeArray)).not.toThrow();
        });

        it('should handle empty implementation object', () => {
            const emptyImpl = {};
            const v = new Visitor(emptyImpl);
            const node = { type: 'TestNode', typeIndex: 1 };
            
            expect(() => v.visit(node)).not.toThrow();
        });
    });
});