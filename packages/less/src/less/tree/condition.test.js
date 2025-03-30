import { describe, it, expect, vi } from 'vitest';
import Condition from './condition';
import Node from './node'; // Import Node for Node.compare

// Mock Node for operands - simplified version for testing Condition logic
class MockNode extends Node {
    constructor(value, type = 'Mock') {
        super();
        this._value = value;
        this.type = type;
    }

    eval() {
        // Return the mock node itself for comparison logic
        return this;
    }

    // Simple compare for testing purposes, mimicking Node.compare logic for basic values
    compare(other) {
        if (other.type !== this.type) {
            return undefined;
        }
        if (this._value < other._value) {
            return -1;
        } else if (this._value > other._value) {
            return 1;
        } else {
            return 0;
        }
    }

    get value() {
        // Needed for Node.compare fallback if types match but compare isn't called directly
        return this._value;
    }
}

// Mock nodes evaluating to boolean true/false for logical operators
const TRUE_NODE = { eval: () => true };
const FALSE_NODE = { eval: () => false };

// Mock nodes evaluating to comparable numeric values
const ONE = new MockNode(1, 'Dimension');
const TWO = new MockNode(2, 'Dimension');
const ANOTHER_TWO = new MockNode(2, 'Dimension'); // Same value, different instance

// Mock nodes evaluating to comparable string values
const A_STR = new MockNode('a', 'Quoted');
const B_STR = new MockNode('b', 'Quoted');
const ANOTHER_A_STR = new MockNode('a', 'Quoted');

// Mock nodes of different types
const ONE_KEYWORD = new MockNode(1, 'Keyword');

describe('Condition', () => {
    describe('eval', () => {
        // --- Logical Operators ---
        describe('and', () => {
            it('should evaluate true and true to true', () => {
                const condition = new Condition('and', TRUE_NODE, TRUE_NODE);
                expect(condition.eval({})).toBe(true);
            });
            it('should evaluate true and false to false', () => {
                const condition = new Condition('and', TRUE_NODE, FALSE_NODE);
                expect(condition.eval({})).toBe(false);
            });
            it('should evaluate false and true to false', () => {
                const condition = new Condition('and', FALSE_NODE, TRUE_NODE);
                expect(condition.eval({})).toBe(false);
            });
            it('should evaluate false and false to false', () => {
                const condition = new Condition('and', FALSE_NODE, FALSE_NODE);
                expect(condition.eval({})).toBe(false);
            });
            it('should handle negation', () => {
                const condition = new Condition(
                    'and',
                    TRUE_NODE,
                    TRUE_NODE,
                    0,
                    true
                ); // negate = true
                expect(condition.eval({})).toBe(false); // !(true && true) -> false
            });
        });

        describe('or', () => {
            it('should evaluate true or true to true', () => {
                const condition = new Condition('or', TRUE_NODE, TRUE_NODE);
                expect(condition.eval({})).toBe(true);
            });
            it('should evaluate true or false to true', () => {
                const condition = new Condition('or', TRUE_NODE, FALSE_NODE);
                expect(condition.eval({})).toBe(true);
            });
            it('should evaluate false or true to true', () => {
                const condition = new Condition('or', FALSE_NODE, TRUE_NODE);
                expect(condition.eval({})).toBe(true);
            });
            it('should evaluate false or false to false', () => {
                const condition = new Condition('or', FALSE_NODE, FALSE_NODE);
                expect(condition.eval({})).toBe(false);
            });
            it('should handle negation', () => {
                const condition = new Condition(
                    'or',
                    FALSE_NODE,
                    FALSE_NODE,
                    0,
                    true
                ); // negate = true
                expect(condition.eval({})).toBe(true); // !(false || false) -> true
            });
        });

        // --- Comparison Operators ---
        // Using numeric MockNodes (ONE, TWO, ANOTHER_TWO)
        describe('Comparison Operators (Numbers)', () => {
            it('< : 1 < 2 should be true', () => {
                const condition = new Condition('<', ONE, TWO);
                expect(condition.eval({})).toBe(true);
            });
            it('< : 2 < 1 should be false', () => {
                const condition = new Condition('<', TWO, ONE);
                expect(condition.eval({})).toBe(false);
            });
            it('< : 2 < 2 should be false', () => {
                const condition = new Condition('<', TWO, ANOTHER_TWO);
                expect(condition.eval({})).toBe(false);
            });
            it('<= : 1 <= 2 should be true', () => {
                const condition = new Condition('<=', ONE, TWO);
                expect(condition.eval({})).toBe(true);
            });
            it('<= : 2 <= 1 should be false', () => {
                const condition = new Condition('<=', TWO, ONE);
                expect(condition.eval({})).toBe(false);
            });
            it('<= : 2 <= 2 should be true', () => {
                const condition = new Condition('<=', TWO, ANOTHER_TWO);
                expect(condition.eval({})).toBe(true);
            });
            it('=< : 1 =< 2 should be true', () => {
                const condition = new Condition('=<', ONE, TWO);
                expect(condition.eval({})).toBe(true);
            });
            it('=< : 2 =< 1 should be false', () => {
                const condition = new Condition('=<', TWO, ONE);
                expect(condition.eval({})).toBe(false);
            });
            it('=< : 2 =< 2 should be true', () => {
                const condition = new Condition('=<', TWO, ANOTHER_TWO);
                expect(condition.eval({})).toBe(true);
            });
            it('= : 1 = 2 should be false', () => {
                const condition = new Condition('=', ONE, TWO);
                expect(condition.eval({})).toBe(false);
            });
            it('= : 2 = 2 should be true', () => {
                const condition = new Condition('=', TWO, ANOTHER_TWO);
                expect(condition.eval({})).toBe(true);
            });
            it('>= : 1 >= 2 should be false', () => {
                const condition = new Condition('>=', ONE, TWO);
                expect(condition.eval({})).toBe(false);
            });
            it('>= : 2 >= 1 should be true', () => {
                const condition = new Condition('>=', TWO, ONE);
                expect(condition.eval({})).toBe(true);
            });
            it('>= : 2 >= 2 should be true', () => {
                const condition = new Condition('>=', TWO, ANOTHER_TWO);
                expect(condition.eval({})).toBe(true);
            });
            it('> : 1 > 2 should be false', () => {
                const condition = new Condition('>', ONE, TWO);
                expect(condition.eval({})).toBe(false);
            });
            it('> : 2 > 1 should be true', () => {
                const condition = new Condition('>', TWO, ONE);
                expect(condition.eval({})).toBe(true);
            });
            it('> : 2 > 2 should be false', () => {
                const condition = new Condition('>', TWO, ANOTHER_TWO);
                expect(condition.eval({})).toBe(false);
            });
            it('should handle negation for comparison', () => {
                const condition = new Condition('<', ONE, TWO, 0, true); // negate = true
                expect(condition.eval({})).toBe(false); // !(1 < 2) -> false
            });
            it('should return false for comparison of incompatible types', () => {
                // Node.compare returns undefined for different types, resulting in false
                const condition = new Condition('=', ONE, ONE_KEYWORD);
                expect(condition.eval({})).toBe(false);
            });
        });

        // Using string MockNodes (A_STR, B_STR, ANOTHER_A_STR)
        // Note: Node.compare for Quoted falls back to value comparison
        describe('Comparison Operators (Strings)', () => {
            it('< : "a" < "b" should be true', () => {
                const condition = new Condition('<', A_STR, B_STR);
                expect(condition.eval({})).toBe(true);
            });
            it('= : "a" = "a" should be true', () => {
                const condition = new Condition('=', A_STR, ANOTHER_A_STR);
                expect(condition.eval({})).toBe(true);
            });
            it('> : "b" > "a" should be true', () => {
                const condition = new Condition('>', B_STR, A_STR);
                expect(condition.eval({})).toBe(true);
            });
            it('>= : "a" >= "a" should be true', () => {
                const condition = new Condition('>=', A_STR, ANOTHER_A_STR);
                expect(condition.eval({})).toBe(true);
            });
            it('<= : "a" <= "a" should be true', () => {
                const condition = new Condition('<=', A_STR, ANOTHER_A_STR);
                expect(condition.eval({})).toBe(true);
            });
            it('should handle empty strings correctly', () => {
                const empty1 = new MockNode('', 'Quoted');
                const empty2 = new MockNode('', 'Quoted');
                const nonEmpty = new MockNode('a', 'Quoted');

                const condition1 = new Condition('=', empty1, empty2);
                const condition2 = new Condition('=', empty1, nonEmpty);

                expect(condition1.eval({})).toBe(true);
                expect(condition2.eval({})).toBe(false);
            });
            it('should handle special characters in strings', () => {
                const special1 = new MockNode('a@#$%', 'Quoted');
                const special2 = new MockNode('a@#$%', 'Quoted');
                const different = new MockNode('b@#$%', 'Quoted');

                const condition1 = new Condition('=', special1, special2);
                const condition2 = new Condition('=', special1, different);

                expect(condition1.eval({})).toBe(true);
                expect(condition2.eval({})).toBe(false);
            });
        });

        describe('Edge Cases and Special Values', () => {
            const nullNode = new MockNode(null, 'Null');
            const undefinedNode = new MockNode(undefined, 'Undefined');
            const largeNumber = new MockNode(
                Number.MAX_SAFE_INTEGER,
                'Dimension'
            );
            const negativeNumber = new MockNode(-1, 'Dimension');
            const zero = new MockNode(0, 'Dimension');

            it('should handle null values', () => {
                const condition = new Condition('=', nullNode, nullNode);
                expect(condition.eval({})).toBe(true); // Same type null values are equal
            });

            it('should handle undefined values', () => {
                const condition = new Condition(
                    '=',
                    undefinedNode,
                    undefinedNode
                );
                expect(condition.eval({})).toBe(true); // Same type undefined values are equal
            });

            it('should handle large numbers', () => {
                const condition = new Condition('>', largeNumber, zero);
                expect(condition.eval({})).toBe(true);
            });

            it('should handle negative numbers', () => {
                const condition = new Condition('<', negativeNumber, zero);
                expect(condition.eval({})).toBe(true);
            });
        });

        describe('Type Coercion and Compatibility', () => {
            const numberNode = new MockNode(1, 'Dimension');
            const stringNumber = new MockNode('1', 'Quoted');
            const keywordNode = new MockNode('test', 'Keyword');
            const colorNode = new MockNode('#000000', 'Color');

            it('should handle string-number comparisons', () => {
                const condition = new Condition('=', numberNode, stringNumber);
                expect(condition.eval({})).toBe(false); // Different types should return false
            });

            it('should handle keyword comparisons', () => {
                const condition = new Condition('=', keywordNode, keywordNode);
                expect(condition.eval({})).toBe(true); // Same type keywords are equal
            });

            it('should handle color comparisons', () => {
                const condition = new Condition('=', colorNode, colorNode);
                expect(condition.eval({})).toBe(true); // Same type colors are equal
            });
        });

        describe('Error Cases', () => {
            it('should handle invalid operators gracefully', () => {
                const condition = new Condition('invalid', ONE, TWO);
                expect(condition.eval({})).toBe(false); // Invalid operators should return false
            });

            it('should handle malformed input gracefully', () => {
                const condition = new Condition('=', null, TWO);
                expect(() => condition.eval({})).toThrow();
            });
        });
    });

    describe('accept', () => {
        it('should call visitor.visit on lvalue and rvalue', () => {
            const lvalue = new MockNode(1);
            const rvalue = new MockNode(2);
            const condition = new Condition('>', lvalue, rvalue);

            const mockVisitor = {
                visit: vi.fn((node) => {
                    // Return a slightly modified node for verification
                    return new MockNode(node.value + 10, node.type);
                })
            };

            condition.accept(mockVisitor);

            // Check if visit was called twice
            expect(mockVisitor.visit).toHaveBeenCalledTimes(2);

            // Check if visit was called with the original nodes
            expect(mockVisitor.visit).toHaveBeenCalledWith(lvalue);
            expect(mockVisitor.visit).toHaveBeenCalledWith(rvalue);

            // Check if lvalue and rvalue were updated with the results from visit
            expect(condition.lvalue.value).toBe(11); // 1 + 10
            expect(condition.rvalue.value).toBe(12); // 2 + 10
        });
    });

    describe('properties', () => {
        it('should store constructor properties correctly', () => {
            const lvalue = new MockNode(1);
            const rvalue = new MockNode(2);
            const condition = new Condition(' > ', lvalue, rvalue, 5, true);

            expect(condition.op).toBe('>'); // Check trimming
            expect(condition.lvalue).toBe(lvalue);
            expect(condition.rvalue).toBe(rvalue);
            expect(condition._index).toBe(5);
            expect(condition.negate).toBe(true);
            expect(condition.type).toBe('Condition');
        });
    });
});
