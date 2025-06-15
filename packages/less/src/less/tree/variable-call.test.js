import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the dependencies at the module level to avoid circular import issues
vi.mock('./variable', () => ({
    default: vi.fn().mockImplementation((variable, index, fileInfo) => ({
        variable,
        _index: index,
        _fileInfo: fileInfo,
        eval: vi.fn()
    }))
}));

vi.mock('./ruleset', () => ({
    default: vi.fn().mockImplementation((selectors, rules) => ({
        selectors,
        rules,
        type: 'Ruleset'
    }))
}));

vi.mock('./detached-ruleset', () => ({
    default: vi.fn().mockImplementation((ruleset) => ({
        ruleset,
        callEval: vi.fn()
    }))
}));

vi.mock('../less-error', () => ({
    default: vi.fn().mockImplementation((options) => {
        const error = new Error(options.message);
        error.type = 'LessError';
        return error;
    })
}));

vi.mock('./node', () => ({
    default: class Node {
        constructor() {
            this.parent = null;
        }
        getIndex() {
            return this._index || 0;
        }
        fileInfo() {
            return this._fileInfo || {};
        }
    }
}));

// Import the actual VariableCall after mocking dependencies
import VariableCall from './variable-call';

// Import Node for instanceof checks
const { default: Node } = await import('./node');

describe('VariableCall', () => {
    let mockContext;
    let mockFileInfo;
    let mockVariable;
    let mockRuleset;
    let mockDetachedRuleset;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockFileInfo = {
            filename: 'test.less'
        };
        mockContext = {
            frames: [
                {
                    functionRegistry: {
                        get: () => null
                    }
                }
            ],
            importantScope: [{ important: false }],
            inCalc: false,
            mathOn: true
        };

        // Get the mocked constructors
        const { default: Variable } = await import('./variable');
        const { default: Ruleset } = await import('./ruleset');
        const { default: DetachedRuleset } = await import('./detached-ruleset');

        mockVariable = Variable;
        mockRuleset = Ruleset;
        mockDetachedRuleset = DetachedRuleset;
    });

    describe('VariableCall creation', () => {
        it('should create a VariableCall instance with correct properties', () => {
            const variableCall = new VariableCall('@mixin', 10, mockFileInfo);
            expect(variableCall.variable).toBe('@mixin');
            expect(variableCall._index).toBe(10);
            expect(variableCall._fileInfo).toBe(mockFileInfo);
            expect(variableCall.type).toBe('VariableCall');
            expect(variableCall.allowRoot).toBe(true);
        });

        it('should handle undefined parameters', () => {
            const variableCall = new VariableCall('@mixin');
            expect(variableCall.variable).toBe('@mixin');
            expect(variableCall._index).toBeUndefined();
            expect(variableCall._fileInfo).toBeUndefined();
            expect(variableCall.type).toBe('VariableCall');
            expect(variableCall.allowRoot).toBe(true);
        });

        it('should inherit from Node', () => {
            const variableCall = new VariableCall('@mixin', 10, mockFileInfo);
            expect(variableCall).toBeInstanceOf(Node);
        });
    });

    describe('eval method - successful cases', () => {
        it('should evaluate variable call with detached ruleset', () => {
            const variableCall = new VariableCall('@mixin', 10, mockFileInfo);

            const mockCallEval = vi.fn().mockReturnValue({ result: 'success' });
            const detachedRulesetResult = {
                ruleset: { some: 'ruleset' },
                callEval: mockCallEval
            };

            // Mock Variable instance and its eval method
            const variableInstance = {
                eval: vi.fn().mockReturnValue(detachedRulesetResult)
            };
            mockVariable.mockReturnValue(variableInstance);

            const result = variableCall.eval(mockContext);

            expect(mockVariable).toHaveBeenCalledWith(
                '@mixin',
                10,
                mockFileInfo
            );
            expect(variableInstance.eval).toHaveBeenCalledWith(mockContext);
            expect(mockCallEval).toHaveBeenCalledWith(mockContext);
            expect(result).toEqual({ result: 'success' });
        });

        it('should create DetachedRuleset from rules property', () => {
            const variableCall = new VariableCall('@mixin', 10, mockFileInfo);

            const mockRules = { rules: [{ rule: 1 }, { rule: 2 }] };
            const variableInstance = {
                eval: vi.fn().mockReturnValue(mockRules)
            };
            mockVariable.mockReturnValue(variableInstance);

            const mockCallEval = vi
                .fn()
                .mockReturnValue({ result: 'from-rules' });
            const detachedRulesetInstance = {
                ruleset: mockRules,
                callEval: mockCallEval
            };
            mockDetachedRuleset.mockReturnValue(detachedRulesetInstance);

            const result = variableCall.eval(mockContext);

            expect(mockDetachedRuleset).toHaveBeenCalledWith(mockRules);
            expect(mockCallEval).toHaveBeenCalledWith(mockContext);
            expect(result).toEqual({ result: 'from-rules' });
        });

        it('should create DetachedRuleset from array result', () => {
            const variableCall = new VariableCall('@mixin', 10, mockFileInfo);

            const mockArray = [{ rule: 1 }, { rule: 2 }];
            const variableInstance = {
                eval: vi.fn().mockReturnValue(mockArray)
            };
            mockVariable.mockReturnValue(variableInstance);

            const rulesetInstance = { type: 'Ruleset' };
            mockRuleset.mockReturnValue(rulesetInstance);

            const mockCallEval = vi
                .fn()
                .mockReturnValue({ result: 'from-array' });
            const detachedRulesetInstance = {
                ruleset: rulesetInstance,
                callEval: mockCallEval
            };
            mockDetachedRuleset.mockReturnValue(detachedRulesetInstance);

            const result = variableCall.eval(mockContext);

            expect(mockRuleset).toHaveBeenCalledWith('', mockArray);
            expect(mockDetachedRuleset).toHaveBeenCalledWith(rulesetInstance);
            expect(mockCallEval).toHaveBeenCalledWith(mockContext);
            expect(result).toEqual({ result: 'from-array' });
        });

        it('should create DetachedRuleset from value array', () => {
            const variableCall = new VariableCall('@mixin', 10, mockFileInfo);

            const mockValueArray = { value: [{ rule: 1 }, { rule: 2 }] };
            const variableInstance = {
                eval: vi.fn().mockReturnValue(mockValueArray)
            };
            mockVariable.mockReturnValue(variableInstance);

            const rulesetInstance = { type: 'Ruleset' };
            mockRuleset.mockReturnValue(rulesetInstance);

            const mockCallEval = vi
                .fn()
                .mockReturnValue({ result: 'from-value-array' });
            const detachedRulesetInstance = {
                ruleset: rulesetInstance,
                callEval: mockCallEval
            };
            mockDetachedRuleset.mockReturnValue(detachedRulesetInstance);

            const result = variableCall.eval(mockContext);

            expect(mockRuleset).toHaveBeenCalledWith('', mockValueArray.value);
            expect(mockDetachedRuleset).toHaveBeenCalledWith(rulesetInstance);
            expect(mockCallEval).toHaveBeenCalledWith(mockContext);
            expect(result).toEqual({ result: 'from-value-array' });
        });
    });

    describe('eval method - error cases', () => {
        it('should throw error when variable evaluation fails', () => {
            const variableCall = new VariableCall(
                '@nonexistent',
                10,
                mockFileInfo
            );

            const mockResult = { someOther: 'property' };
            const variableInstance = {
                eval: vi.fn().mockReturnValue(mockResult)
            };
            mockVariable.mockReturnValue(variableInstance);

            expect(() => variableCall.eval(mockContext)).toThrowError(
                'Could not evaluate variable call @nonexistent'
            );
        });

        it('should throw error when detached ruleset creation fails', () => {
            const variableCall = new VariableCall('@invalid', 10, mockFileInfo);

            const variableInstance = {
                eval: vi.fn().mockReturnValue({ someOther: 'value' })
            };
            mockVariable.mockReturnValue(variableInstance);

            expect(() => variableCall.eval(mockContext)).toThrowError(
                'Could not evaluate variable call @invalid'
            );
        });

        it('should handle Variable evaluation throwing an error', () => {
            const variableCall = new VariableCall('@error', 10, mockFileInfo);

            const variableInstance = {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Variable evaluation failed');
                })
            };
            mockVariable.mockReturnValue(variableInstance);

            expect(() => variableCall.eval(mockContext)).toThrowError(
                'Variable evaluation failed'
            );
        });
    });

    describe('eval method - DetachedRuleset creation scenarios', () => {
        it('should handle empty rules array', () => {
            const variableCall = new VariableCall('@empty', 10, mockFileInfo);

            const mockEmptyRules = { rules: [] };
            const variableInstance = {
                eval: vi.fn().mockReturnValue(mockEmptyRules)
            };
            mockVariable.mockReturnValue(variableInstance);

            const mockCallEval = vi.fn().mockReturnValue({ empty: 'ruleset' });
            const detachedRulesetInstance = {
                ruleset: mockEmptyRules,
                callEval: mockCallEval
            };
            mockDetachedRuleset.mockReturnValue(detachedRulesetInstance);

            const result = variableCall.eval(mockContext);

            expect(mockDetachedRuleset).toHaveBeenCalledWith(mockEmptyRules);
            expect(result).toEqual({ empty: 'ruleset' });
        });

        it('should handle empty array result', () => {
            const variableCall = new VariableCall(
                '@empty-array',
                10,
                mockFileInfo
            );

            const variableInstance = {
                eval: vi.fn().mockReturnValue([])
            };
            mockVariable.mockReturnValue(variableInstance);

            const rulesetInstance = { type: 'Ruleset' };
            mockRuleset.mockReturnValue(rulesetInstance);

            const mockCallEval = vi
                .fn()
                .mockReturnValue({ empty: 'array-result' });
            const detachedRulesetInstance = {
                ruleset: rulesetInstance,
                callEval: mockCallEval
            };
            mockDetachedRuleset.mockReturnValue(detachedRulesetInstance);

            const result = variableCall.eval(mockContext);

            expect(mockRuleset).toHaveBeenCalledWith('', []);
            expect(result).toEqual({ empty: 'array-result' });
        });

        it('should handle empty value array', () => {
            const variableCall = new VariableCall(
                '@empty-value',
                10,
                mockFileInfo
            );

            const variableInstance = {
                eval: vi.fn().mockReturnValue({ value: [] })
            };
            mockVariable.mockReturnValue(variableInstance);

            const rulesetInstance = { type: 'Ruleset' };
            mockRuleset.mockReturnValue(rulesetInstance);

            const mockCallEval = vi
                .fn()
                .mockReturnValue({ empty: 'value-result' });
            const detachedRulesetInstance = {
                ruleset: rulesetInstance,
                callEval: mockCallEval
            };
            mockDetachedRuleset.mockReturnValue(detachedRulesetInstance);

            const result = variableCall.eval(mockContext);

            expect(mockRuleset).toHaveBeenCalledWith('', []);
            expect(result).toEqual({ empty: 'value-result' });
        });
    });

    describe('inherited Node methods', () => {
        it('should have correct getIndex behavior', () => {
            const variableCall = new VariableCall('@test', 42, mockFileInfo);
            expect(variableCall.getIndex()).toBe(42);
        });

        it('should have correct fileInfo behavior', () => {
            const variableCall = new VariableCall('@test', 42, mockFileInfo);
            expect(variableCall.fileInfo()).toBe(mockFileInfo);
        });

        it('should handle missing index and fileInfo', () => {
            const variableCall = new VariableCall('@test');
            expect(variableCall.getIndex()).toBe(0);
            expect(variableCall.fileInfo()).toEqual({});
        });
    });

    describe('Variable name variations', () => {
        it('should handle variable names with special characters', () => {
            const variableCall = new VariableCall(
                '@special-name_123',
                10,
                mockFileInfo
            );

            const mockCallEval = vi.fn().mockReturnValue({ special: 'result' });
            const detachedRulesetResult = {
                ruleset: { some: 'rules' },
                callEval: mockCallEval
            };

            const variableInstance = {
                eval: vi.fn().mockReturnValue(detachedRulesetResult)
            };
            mockVariable.mockReturnValue(variableInstance);

            const result = variableCall.eval(mockContext);

            expect(result).toEqual({ special: 'result' });
        });

        it('should handle very long variable names', () => {
            const longName = '@' + 'a'.repeat(1000);
            const variableCall = new VariableCall(longName, 10, mockFileInfo);

            const mockCallEval = vi.fn().mockReturnValue({ long: 'result' });
            const detachedRulesetResult = {
                ruleset: { some: 'rules' },
                callEval: mockCallEval
            };

            const variableInstance = {
                eval: vi.fn().mockReturnValue(detachedRulesetResult)
            };
            mockVariable.mockReturnValue(variableInstance);

            const result = variableCall.eval(mockContext);

            expect(result).toEqual({ long: 'result' });
        });

        it('should handle empty variable name', () => {
            const variableCall = new VariableCall('', 10, mockFileInfo);

            const variableInstance = {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Invalid variable name');
                })
            };
            mockVariable.mockReturnValue(variableInstance);

            expect(() => variableCall.eval(mockContext)).toThrowError(
                'Invalid variable name'
            );
        });
    });

    describe('Complex evaluation scenarios', () => {
        it('should handle complex rules object with multiple properties', () => {
            const variableCall = new VariableCall('@complex', 10, mockFileInfo);

            const complexRules = {
                rules: [
                    { type: 'Declaration', name: 'color', value: 'red' },
                    { type: 'Declaration', name: 'margin', value: '10px' },
                    { type: 'Ruleset', selectors: ['.nested'] }
                ]
            };

            const variableInstance = {
                eval: vi.fn().mockReturnValue(complexRules)
            };
            mockVariable.mockReturnValue(variableInstance);

            const mockCallEval = vi
                .fn()
                .mockReturnValue({ complex: 'rules-result' });
            const detachedRulesetInstance = {
                ruleset: complexRules,
                callEval: mockCallEval
            };
            mockDetachedRuleset.mockReturnValue(detachedRulesetInstance);

            const result = variableCall.eval(mockContext);

            expect(mockDetachedRuleset).toHaveBeenCalledWith(complexRules);
            expect(result).toEqual({ complex: 'rules-result' });
        });

        it('should handle null context', () => {
            const variableCall = new VariableCall('@test', 10, mockFileInfo);

            const variableInstance = {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Context is null');
                })
            };
            mockVariable.mockReturnValue(variableInstance);

            expect(() => variableCall.eval(null)).toThrowError(
                'Context is null'
            );
        });

        it('should handle undefined context', () => {
            const variableCall = new VariableCall('@test', 10, mockFileInfo);

            const variableInstance = {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Context is undefined');
                })
            };
            mockVariable.mockReturnValue(variableInstance);

            expect(() => variableCall.eval(undefined)).toThrowError(
                'Context is undefined'
            );
        });
    });
});
