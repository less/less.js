import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('./mixin-definition', () => ({ default: class {} }));
vi.mock('./mixin-call', () => ({ default: class {} }));
import NamespaceValue from './namespace-value';

describe('NamespaceValue', () => {
    let mockContext;
    let mockFileInfo;
    let mockRuleCall;

    beforeEach(() => {
        mockFileInfo = {
            filename: 'test.less'
        };
        mockContext = {
            frames: []
        };
        mockRuleCall = {
            eval: vi.fn()
        };
    });

    describe('Constructor', () => {
        it('should create a NamespaceValue instance with correct properties', () => {
            const lookups = ['@color', '$width'];
            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                lookups,
                1,
                mockFileInfo
            );

            expect(namespaceValue.value).toBe(mockRuleCall);
            expect(namespaceValue.lookups).toBe(lookups);
            expect(namespaceValue._index).toBe(1);
            expect(namespaceValue._fileInfo).toBe(mockFileInfo);
            expect(namespaceValue.type).toBe('NamespaceValue');
        });

        it('should handle undefined parameters', () => {
            const namespaceValue = new NamespaceValue(mockRuleCall, []);

            expect(namespaceValue.value).toBe(mockRuleCall);
            expect(namespaceValue.lookups).toEqual([]);
            expect(namespaceValue._index).toBeUndefined();
            expect(namespaceValue._fileInfo).toBeUndefined();
            expect(namespaceValue.type).toBe('NamespaceValue');
        });

        it('should inherit Node methods', () => {
            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                [],
                42,
                mockFileInfo
            );

            // Test inherited methods
            expect(typeof namespaceValue.getIndex).toBe('function');
            expect(typeof namespaceValue.fileInfo).toBe('function');
            expect(namespaceValue.getIndex()).toBe(42);
            expect(namespaceValue.fileInfo()).toBe(mockFileInfo);
        });
    });

    describe('eval() method - basic cases', () => {
        it('should evaluate with no lookups', () => {
            const expectedResult = { type: 'Color', value: 'red' };
            mockRuleCall.eval.mockReturnValue(expectedResult);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                [],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleCall.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(expectedResult);
        });

        it('should handle empty string lookup (lastDeclaration)', () => {
            const innerValue = 'lastValue';
            const stubDecl = {
                value: innerValue,
                eval: vi.fn().mockReturnValue({ value: innerValue })
            };
            const mockRuleset = {
                lastDeclaration: vi.fn().mockReturnValue(stubDecl)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                [''],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleset.lastDeclaration).toHaveBeenCalled();
            expect(stubDecl.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(innerValue);
        });

        it('should handle variable lookups', () => {
            const innerValue = 'variableValue';
            const mockVariable = {
                value: innerValue,
                eval: vi.fn().mockReturnValue({ value: innerValue })
            };
            const mockRuleset = {
                variables: true,
                variable: vi.fn().mockReturnValue(mockVariable)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@color'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleset.variable).toHaveBeenCalledWith('@color');
            expect(mockVariable.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(innerValue);
        });

        it('should handle property lookups', () => {
            const innerValue = 'propertyValue';
            const stubDecl = {
                value: innerValue,
                eval: vi.fn().mockReturnValue({ value: innerValue })
            };
            const mockRuleset = {
                properties: true,
                property: vi.fn().mockReturnValue([stubDecl])
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['width'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleset.property).toHaveBeenCalledWith('$width');
            expect(stubDecl.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(innerValue);
        });

        it('should handle property lookups with $ prefix', () => {
            const innerValue = 'propertyValue';
            const stubDecl = {
                value: innerValue,
                eval: vi.fn().mockReturnValue({ value: innerValue })
            };
            const mockRuleset = {
                properties: true,
                property: vi.fn().mockReturnValue([stubDecl])
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['$width'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleset.property).toHaveBeenCalledWith('$width');
            expect(stubDecl.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(innerValue);
        });

        it('should return last property when multiple exist', () => {
            const innerValues = ['firstValue', 'secondValue', 'thirdValue'];
            const stubDecls = innerValues.map((v) => ({
                value: v,
                eval: vi.fn().mockReturnValue({ value: v })
            }));
            const mockRuleset = {
                properties: true,
                property: vi.fn().mockReturnValue(stubDecls)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['width'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(stubDecls[2].eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(innerValues[2]);
        });
    });

    describe('Error handling', () => {
        it('should throw error when variable not found', () => {
            const mockRuleset = {
                variables: true,
                variable: vi.fn().mockReturnValue(null)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@notfound'],
                1,
                mockFileInfo
            );

            expect(() => namespaceValue.eval(mockContext)).toThrow(
                expect.objectContaining({
                    type: 'Name',
                    message: 'variable @notfound not found',
                    filename: mockFileInfo.filename,
                    index: 1
                })
            );
        });

        it('should throw error when property not found', () => {
            const mockRuleset = {
                properties: true,
                property: vi.fn().mockReturnValue(null)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['width'],
                1,
                mockFileInfo
            );

            expect(() => namespaceValue.eval(mockContext)).toThrow(
                expect.objectContaining({
                    type: 'Name',
                    message: 'property "width" not found',
                    filename: mockFileInfo.filename,
                    index: 1
                })
            );
        });
    });

    describe('Type checking', () => {
        it('should have correct type property', () => {
            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                [],
                1,
                mockFileInfo
            );
            expect(namespaceValue.type).toBe('NamespaceValue');
        });
    });

    describe('eval() method - advanced cases', () => {
        it('should convert array rules to Ruleset', () => {
            const arrayRules = [
                { type: 'Declaration', name: 'color', value: 'red' },
                { type: 'Declaration', name: 'width', value: '100px' }
            ];
            mockRuleCall.eval.mockReturnValue(arrayRules);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                [],
                1,
                mockFileInfo
            );

            // The actual implementation will convert array to Ruleset internally
            // For testing purposes, just verify it doesn't crash and returns something
            const result = namespaceValue.eval(mockContext);
            expect(result).toBeDefined();
        });

        it('should evaluate rules.value when it exists after lookup', () => {
            const finalValue = 'finalEvaluatedValue';
            const mockVariable = {
                value: 'hasValue', // This has a value property
                eval: vi.fn().mockReturnValue({ value: finalValue })
            };
            const mockRuleset = {
                variables: true,
                variable: vi.fn().mockReturnValue(mockVariable)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@color'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleset.variable).toHaveBeenCalledWith('@color');
            expect(mockVariable.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(finalValue);
        });

        it('should evaluate rules.ruleset when it exists after lookup', () => {
            const finalValue = 'rulesetEvaluatedValue';
            const mockInnerRuleset = {
                eval: vi.fn().mockReturnValue(finalValue)
            };
            const mockVariable = {
                ruleset: mockInnerRuleset
            };
            const mockRuleset = {
                variables: true,
                variable: vi.fn().mockReturnValue(mockVariable)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@color'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleset.variable).toHaveBeenCalledWith('@color');
            expect(mockInnerRuleset.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe(finalValue);
        });

        it('should handle multiple lookups in sequence', () => {
            const firstRuleset = {
                variables: true,
                variable: vi.fn().mockReturnValue({
                    value: 'intermediateRuleset',
                    eval: vi.fn().mockReturnValue({
                        value: {
                            properties: true,
                            property: vi.fn().mockReturnValue([
                                {
                                    value: 'finalValue',
                                    eval: vi.fn().mockReturnValue({
                                        value: 'finalValue'
                                    })
                                }
                            ])
                        }
                    })
                })
            };
            mockRuleCall.eval.mockReturnValue(firstRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@namespace', 'width'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(firstRuleset.variable).toHaveBeenCalledWith('@namespace');
            expect(result).toBe('finalValue');
        });

        it('should handle chained lookups with empty string and variable', () => {
            const lastDeclaration = {
                value: {
                    variables: true,
                    variable: vi.fn().mockReturnValue({
                        value: 'chainedValue',
                        eval: vi.fn().mockReturnValue({ value: 'chainedValue' })
                    })
                },
                eval: vi.fn().mockReturnValue({
                    value: {
                        variables: true,
                        variable: vi.fn().mockReturnValue({
                            value: 'chainedValue',
                            eval: vi
                                .fn()
                                .mockReturnValue({ value: 'chainedValue' })
                        })
                    }
                })
            };

            const mockRuleset = {
                lastDeclaration: vi.fn().mockReturnValue(lastDeclaration)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['', '@var'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(mockRuleset.lastDeclaration).toHaveBeenCalled();
            expect(result).toBe('chainedValue');
        });
    });

    describe('Edge cases and error conditions', () => {
        it('should handle case when rules.variables is false (returns original ruleset)', () => {
            const mockRuleset = {
                variables: false
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@color'],
                1,
                mockFileInfo
            );

            // When variables is false, rules.variable() is not called, so rules stays as mockRuleset
            // Since mockRuleset has no value or ruleset property, it returns mockRuleset unchanged
            const result = namespaceValue.eval(mockContext);
            expect(result).toBe(mockRuleset);
        });

        it('should handle case when rules.variables is undefined (returns original ruleset)', () => {
            const mockRuleset = {};
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@color'],
                1,
                mockFileInfo
            );

            // When variables is undefined, rules.variable() is not called, so rules stays as mockRuleset
            // Since mockRuleset has no value or ruleset property, it returns mockRuleset unchanged
            const result = namespaceValue.eval(mockContext);
            expect(result).toBe(mockRuleset);
        });

        it('should handle case when rules.properties is undefined (causes TypeError)', () => {
            const mockRuleset = {};
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['width'],
                1,
                mockFileInfo
            );

            // When properties is undefined, rules.property() is never called, so rules stays as mockRuleset
            // Then the code tries to access rules.value which is undefined, causing TypeError
            expect(() => namespaceValue.eval(mockContext)).toThrow(TypeError);
        });

        it('should handle empty properties array (undefined result)', () => {
            const mockRuleset = {
                properties: true,
                property: vi.fn().mockReturnValue([])
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['width'],
                1,
                mockFileInfo
            );

            // Empty array doesn't trigger null check, but accessing [length-1] returns undefined
            // Then trying to access undefined.value causes TypeError
            expect(() => namespaceValue.eval(mockContext)).toThrow(TypeError);
        });

        it('should handle context evaluation of final rules', () => {
            const finalRule = {
                value: 'finalValue',
                eval: vi.fn().mockReturnValue({ value: 'evaluatedFinalValue' })
            };
            const mockRuleset = {
                properties: true,
                property: vi.fn().mockReturnValue([finalRule])
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['width'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            expect(finalRule.eval).toHaveBeenCalledWith(mockContext);
            expect(result).toBe('evaluatedFinalValue');
        });

        it('should handle rules with both value and ruleset properties', () => {
            const mockInnerRuleset = {
                eval: vi.fn().mockReturnValue('rulesetResult')
            };
            const mockVariable = {
                value: 'hasValue',
                ruleset: mockInnerRuleset,
                eval: vi.fn().mockReturnValue({ value: 'valueResult' })
            };
            const mockRuleset = {
                variables: true,
                variable: vi.fn().mockReturnValue(mockVariable)
            };
            mockRuleCall.eval.mockReturnValue(mockRuleset);

            const namespaceValue = new NamespaceValue(
                mockRuleCall,
                ['@color'],
                1,
                mockFileInfo
            );
            const result = namespaceValue.eval(mockContext);

            // Should evaluate value first, then ruleset is not processed
            expect(mockRuleset.variable).toHaveBeenCalledWith('@color');
            expect(mockVariable.eval).toHaveBeenCalledWith(mockContext);
            expect(mockInnerRuleset.eval).not.toHaveBeenCalled();
            expect(result).toBe('valueResult');
        });
    });
});
