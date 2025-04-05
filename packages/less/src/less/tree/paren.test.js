import { describe, it, expect, vi } from 'vitest';
import Paren from './paren';
import Node from './node';

describe('Paren', () => {
    // Test constructor
    it('should create a Paren instance with the provided node as value', () => {
        const mockNode = { type: 'MockNode' };
        const paren = new Paren(mockNode);

        expect(paren.value).toBe(mockNode);
    });

    it('should inherit from Node', () => {
        const paren = new Paren({});
        expect(paren instanceof Node).toBe(true); // It does directly inherit from Node

        // It has Node's methods and properties
        expect(typeof paren.eval).toBe('function');
        expect(typeof paren.genCSS).toBe('function');
        expect(paren.type).toBe('Paren');
    });

    // Test genCSS method
    it('should generate CSS with parentheses around value', () => {
        const mockValue = {
            genCSS: vi.fn((context, output) => {
                output.add('test-content');
            })
        };

        const paren = new Paren(mockValue);
        const mockOutput = {
            add: vi.fn()
        };
        const mockContext = {};

        paren.genCSS(mockContext, mockOutput);

        // Should add opening parenthesis
        expect(mockOutput.add).toHaveBeenNthCalledWith(1, '(');

        // Should call genCSS on the value
        expect(mockValue.genCSS).toHaveBeenCalledWith(mockContext, mockOutput);

        // The actual sequence of calls to mockOutput.add
        expect(mockOutput.add.mock.calls).toEqual([
            ['('], // First call with opening parenthesis
            ['test-content'], // Second call from inside mockValue.genCSS
            [')'] // Third call with closing parenthesis
        ]);

        // Should have been called exactly 3 times
        expect(mockOutput.add).toHaveBeenCalledTimes(3);
    });

    // Test genCSS with complex value
    it('should properly handle nested content when generating CSS', () => {
        // Create a mock that simulates adding complex content
        const mockValue = {
            genCSS: vi.fn((context, output) => {
                output.add('complex-content');
            })
        };

        const paren = new Paren(mockValue);
        let result = '';
        const mockOutput = {
            add: vi.fn((str) => {
                result += str;
            })
        };

        paren.genCSS({}, mockOutput);

        expect(result).toBe('(complex-content)');
    });

    // Test eval method
    it('should return a new Paren with the evaluated value', () => {
        const evaluatedNode = { type: 'EvaluatedNode' };
        const mockValue = {
            eval: vi.fn(() => evaluatedNode)
        };

        const paren = new Paren(mockValue);
        const mockContext = { someContextData: true };

        const result = paren.eval(mockContext);

        // Should call eval on the value with the provided context
        expect(mockValue.eval).toHaveBeenCalledWith(mockContext);

        // Should return a new Paren instance
        expect(result).toBeInstanceOf(Paren);

        // The new Paren should contain the evaluated value
        expect(result.value).toBe(evaluatedNode);

        // It should be a new instance, not the same
        expect(result).not.toBe(paren);
    });

    // Test with real-world scenarios
    it('should handle typical LESS expressions properly', () => {
        // Create a mock that simulates a LESS expression
        const mockExpression = {
            genCSS: vi.fn((context, output) => {
                output.add('1 + 2');
            }),
            eval: vi.fn(() => {
                return {
                    genCSS: vi.fn((context, output) => {
                        output.add('3');
                    })
                };
            })
        };

        const paren = new Paren(mockExpression);

        // Test genCSS output
        let cssResult = '';
        const mockCSSOutput = {
            add: vi.fn((str) => {
                cssResult += str;
            })
        };

        paren.genCSS({}, mockCSSOutput);
        expect(cssResult).toBe('(1 + 2)');

        // Test eval result
        const evalResult = paren.eval({});
        let evaluatedCSSResult = '';
        const mockEvaluatedOutput = {
            add: vi.fn((str) => {
                evaluatedCSSResult += str;
            })
        };

        evalResult.genCSS({}, mockEvaluatedOutput);
        expect(evaluatedCSSResult).toBe('(3)');
    });

    // Test eval method preserves Node operations
    it('should preserve Node operations through eval method', () => {
        // Create a Node-like object to test inheritance
        const mockNodeLike = {
            type: 'Mock',
            eval: vi.fn((context) => {
                return {
                    type: 'EvaluatedMock',
                    someProperty: context.someValue
                };
            })
        };

        const paren = new Paren(mockNodeLike);
        const mockContext = { someValue: 'test-context-value' };

        const result = paren.eval(mockContext);

        // The value in the new Paren should have been processed by the original value's eval
        expect(result.value).toEqual({
            type: 'EvaluatedMock',
            someProperty: 'test-context-value'
        });
    });

    // Test toCSS method (inherited from Node)
    it('should output correct CSS string via toCSS method', () => {
        const mockValue = {
            genCSS: vi.fn((context, output) => {
                output.add('mock-content');
            })
        };

        const paren = new Paren(mockValue);

        // Since toCSS is inherited from Node, we're testing that inherited functionality works
        const cssString = paren.toCSS({});

        expect(cssString).toBe('(mock-content)');
    });

    // Test with nested Paren structures
    it('should handle nested Paren structures correctly', () => {
        // Create a structure like ((inner-content))
        const innerContent = {
            genCSS: vi.fn((context, output) => {
                output.add('inner-content');
            }),
            eval: vi.fn(() => {
                return {
                    genCSS: vi.fn((context, output) => {
                        output.add('evaluated-inner');
                    })
                };
            })
        };

        // Create inner paren
        const innerParen = new Paren(innerContent);

        // Create outer paren that wraps the inner paren
        const outerParen = new Paren(innerParen);

        // Test nested genCSS output
        let cssResult = '';
        const mockOutput = {
            add: vi.fn((str) => {
                cssResult += str;
            })
        };

        outerParen.genCSS({}, mockOutput);

        // Should produce ((inner-content))
        expect(cssResult).toBe('((inner-content))');

        // Test nested eval
        const evalResult = outerParen.eval({});

        // Check that evalResult is a new Paren
        expect(evalResult).toBeInstanceOf(Paren);
        expect(evalResult).not.toBe(outerParen);

        // Check that evalResult.value is also a new Paren
        expect(evalResult.value).toBeInstanceOf(Paren);
        expect(evalResult.value).not.toBe(innerParen);

        // Test the genCSS of the evaluated nested structure
        let evaluatedCSSResult = '';
        const mockEvaluatedOutput = {
            add: vi.fn((str) => {
                evaluatedCSSResult += str;
            })
        };

        evalResult.genCSS({}, mockEvaluatedOutput);

        // Should produce ((evaluated-inner))
        expect(evaluatedCSSResult).toBe('((evaluated-inner))');
    });
});
