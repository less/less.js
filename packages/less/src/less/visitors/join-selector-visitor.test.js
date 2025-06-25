import { describe, it, expect, beforeEach, vi } from 'vitest';
import JoinSelectorVisitor from './join-selector-visitor.js';
import Visitor from './visitor.js';

describe('JoinSelectorVisitor', () => {
    let visitor;

    beforeEach(() => {
        visitor = new JoinSelectorVisitor();
    });

    describe('constructor', () => {
        it('should initialize with empty contexts array containing one empty array', () => {
            expect(visitor.contexts).toEqual([[]]);
        });

        it('should create a Visitor instance', () => {
            expect(visitor._visitor).toBeInstanceOf(Visitor);
        });

        it('should pass itself as implementation to Visitor', () => {
            expect(visitor._visitor._implementation).toBe(visitor);
        });
    });

    describe('run', () => {
        it('should call visitor.visit with the root node', () => {
            const mockRoot = { type: 'root' };
            const visitSpy = vi.spyOn(visitor._visitor, 'visit');
            
            visitor.run(mockRoot);
            
            expect(visitSpy).toHaveBeenCalledWith(mockRoot);
            expect(visitSpy).toHaveBeenCalledTimes(1);
        });

        it('should return the result from visitor.visit', () => {
            const mockRoot = { type: 'root' };
            const expectedResult = { processed: true };
            vi.spyOn(visitor._visitor, 'visit').mockReturnValue(expectedResult);
            
            const result = visitor.run(mockRoot);
            
            expect(result).toBe(expectedResult);
        });

        it('should handle null root', () => {
            const visitSpy = vi.spyOn(visitor._visitor, 'visit');
            
            visitor.run(null);
            
            expect(visitSpy).toHaveBeenCalledWith(null);
        });

        it('should handle undefined root', () => {
            const visitSpy = vi.spyOn(visitor._visitor, 'visit');
            
            visitor.run(undefined);
            
            expect(visitSpy).toHaveBeenCalledWith(undefined);
        });
    });

    describe('visitDeclaration', () => {
        it('should set visitDeeper to false', () => {
            const mockDeclNode = { type: 'Declaration' };
            const visitArgs = { visitDeeper: true };
            
            visitor.visitDeclaration(mockDeclNode, visitArgs);
            
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should not modify declaration node', () => {
            const mockDeclNode = { type: 'Declaration', name: 'color', value: 'red' };
            const originalNode = { ...mockDeclNode };
            const visitArgs = { visitDeeper: true };
            
            visitor.visitDeclaration(mockDeclNode, visitArgs);
            
            expect(mockDeclNode).toEqual(originalNode);
        });
    });

    describe('visitMixinDefinition', () => {
        it('should set visitDeeper to false', () => {
            const mockMixinNode = { type: 'MixinDefinition' };
            const visitArgs = { visitDeeper: true };
            
            visitor.visitMixinDefinition(mockMixinNode, visitArgs);
            
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should not modify mixin definition node', () => {
            const mockMixinNode = { type: 'MixinDefinition', name: 'mixin-name' };
            const originalNode = { ...mockMixinNode };
            const visitArgs = { visitDeeper: true };
            
            visitor.visitMixinDefinition(mockMixinNode, visitArgs);
            
            expect(mockMixinNode).toEqual(originalNode);
        });
    });

    describe('visitRuleset', () => {
        beforeEach(() => {
            visitor = new JoinSelectorVisitor();
        });

        it('should push new empty paths array to contexts', () => {
            const mockRuleset = { root: false };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(visitor.contexts).toHaveLength(2);
            expect(visitor.contexts[1]).toEqual([]);
        });

        it('should handle root ruleset without processing selectors', () => {
            const mockRuleset = { root: true };
            const visitArgs = {};
            const initialContextsLength = visitor.contexts.length;
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(visitor.contexts).toHaveLength(initialContextsLength + 1);
            expect(mockRuleset.selectors).toBeUndefined();
            expect(mockRuleset.paths).toBeUndefined();
        });

        it('should filter selectors by getIsOutput', () => {
            const mockSelector1 = { getIsOutput: vi.fn().mockReturnValue(true) };
            const mockSelector2 = { getIsOutput: vi.fn().mockReturnValue(false) };
            const mockSelector3 = { getIsOutput: vi.fn().mockReturnValue(true) };
            
            const mockRuleset = {
                root: false,
                selectors: [mockSelector1, mockSelector2, mockSelector3],
                joinSelectors: vi.fn()
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockSelector1.getIsOutput).toHaveBeenCalled();
            expect(mockSelector2.getIsOutput).toHaveBeenCalled();
            expect(mockSelector3.getIsOutput).toHaveBeenCalled();
            expect(mockRuleset.selectors).toEqual([mockSelector1, mockSelector3]);
        });

        it('should set selectors to null when all selectors are filtered out', () => {
            const mockSelector1 = { getIsOutput: vi.fn().mockReturnValue(false) };
            const mockSelector2 = { getIsOutput: vi.fn().mockReturnValue(false) };
            
            const mockRuleset = {
                root: false,
                selectors: [mockSelector1, mockSelector2],
                joinSelectors: vi.fn()
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockRuleset.selectors).toBeNull();
            expect(mockRuleset.rules).toBeNull();
        });

        it('should call joinSelectors when selectors exist', () => {
            const mockSelector = { getIsOutput: vi.fn().mockReturnValue(true) };
            const mockRuleset = {
                root: false,
                selectors: [mockSelector],
                joinSelectors: vi.fn()
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockRuleset.joinSelectors).toHaveBeenCalledWith(
                visitor.contexts[1], // paths
                visitor.contexts[0], // context
                [mockSelector]       // selectors
            );
        });

        it('should set paths property on ruleset', () => {
            const mockSelector = { getIsOutput: vi.fn().mockReturnValue(true) };
            const mockRuleset = {
                root: false,
                selectors: [mockSelector],
                joinSelectors: vi.fn()
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockRuleset.paths).toBe(visitor.contexts[1]);
        });

        it('should handle ruleset without selectors', () => {
            const mockRuleset = {
                root: false,
                selectors: null
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockRuleset.rules).toBeNull();
            expect(mockRuleset.paths).toBe(visitor.contexts[1]);
        });

        it('should handle ruleset with undefined selectors', () => {
            const mockRuleset = {
                root: false
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockRuleset.rules).toBeNull();
            expect(mockRuleset.paths).toBe(visitor.contexts[1]);
        });

        it('should handle empty selectors array', () => {
            const mockRuleset = {
                root: false,
                selectors: []
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockRuleset.selectors).toBeNull();
            expect(mockRuleset.rules).toBeNull();
            expect(mockRuleset.paths).toBe(visitor.contexts[1]);
        });

        it('should preserve existing rules when selectors exist', () => {
            const mockSelector = { getIsOutput: vi.fn().mockReturnValue(true) };
            const mockRules = [{ type: 'Declaration' }];
            const mockRuleset = {
                root: false,
                selectors: [mockSelector],
                rules: mockRules,
                joinSelectors: vi.fn()
            };
            const visitArgs = {};
            
            visitor.visitRuleset(mockRuleset, visitArgs);
            
            expect(mockRuleset.rules).toBe(mockRules);
        });
    });

    describe('visitRulesetOut', () => {
        it('should reduce contexts length by 1', () => {
            visitor.contexts = [[], [], []]; // 3 contexts
            const mockRuleset = {};
            
            visitor.visitRulesetOut(mockRuleset);
            
            expect(visitor.contexts).toHaveLength(2);
        });

        it('should handle single context', () => {
            visitor.contexts = [[]]; // 1 context
            const mockRuleset = {};
            
            visitor.visitRulesetOut(mockRuleset);
            
            expect(visitor.contexts).toHaveLength(0);
        });

        it('should not modify the ruleset node', () => {
            const mockRuleset = { type: 'Ruleset', selectors: [] };
            const originalRuleset = { ...mockRuleset };
            
            visitor.visitRulesetOut(mockRuleset);
            
            expect(mockRuleset).toEqual(originalRuleset);
        });
    });

    describe('visitMedia', () => {
        it('should set root to true when context is empty', () => {
            visitor.contexts = [[]]; // empty context
            const mockMediaNode = {
                rules: [{ root: false }]
            };
            const visitArgs = {};
            
            visitor.visitMedia(mockMediaNode, visitArgs);
            
            expect(mockMediaNode.rules[0].root).toBe(true);
        });

        it('should set root to true when first context item has multiMedia', () => {
            visitor.contexts = [[{ multiMedia: true }]];
            const mockMediaNode = {
                rules: [{ root: false }]
            };
            const visitArgs = {};
            
            visitor.visitMedia(mockMediaNode, visitArgs);
            
            expect(mockMediaNode.rules[0].root).toBe(true);
        });

        it('should set root to false when context has items without multiMedia', () => {
            visitor.contexts = [[{ multiMedia: false }]];
            const mockMediaNode = {
                rules: [{ root: false }]
            };
            const visitArgs = {};
            
            visitor.visitMedia(mockMediaNode, visitArgs);
            
            expect(mockMediaNode.rules[0].root).toBe(false);
        });

        it('should set root to undefined when context has items with undefined multiMedia', () => {
            visitor.contexts = [[{ someProperty: 'value' }]];
            const mockMediaNode = {
                rules: [{ root: false }]
            };
            const visitArgs = {};
            
            visitor.visitMedia(mockMediaNode, visitArgs);
            
            expect(mockMediaNode.rules[0].root).toBeUndefined();
        });
    });

    describe('visitAtRule', () => {
        it('should set root to true when context is empty', () => {
            visitor.contexts = [[]]; // empty context
            const mockAtRuleNode = {
                rules: [{ root: false }]
            };
            const visitArgs = {};
            
            visitor.visitAtRule(mockAtRuleNode, visitArgs);
            
            expect(mockAtRuleNode.rules[0].root).toBe(true);
        });

        it('should set root to true when isRooted is true', () => {
            visitor.contexts = [[{ someContext: true }]];
            const mockAtRuleNode = {
                isRooted: true,
                rules: [{ root: false }]
            };
            const visitArgs = {};
            
            visitor.visitAtRule(mockAtRuleNode, visitArgs);
            
            expect(mockAtRuleNode.rules[0].root).toBe(true);
        });

        it('should set root to false when context has items and isRooted is false', () => {
            visitor.contexts = [[{ someContext: true }]];
            const mockAtRuleNode = {
                isRooted: false,
                rules: [{ root: false }]
            };
            const visitArgs = {};
            
            visitor.visitAtRule(mockAtRuleNode, visitArgs);
            
            expect(mockAtRuleNode.rules[0].root).toBe(null);
        });

        it('should handle at-rule without rules property', () => {
            const mockAtRuleNode = {
                isRooted: false
            };
            const visitArgs = {};
            
            expect(() => {
                visitor.visitAtRule(mockAtRuleNode, visitArgs);
            }).not.toThrow();
        });

        it('should handle at-rule with empty rules array', () => {
            const mockAtRuleNode = {
                isRooted: false,
                rules: []
            };
            const visitArgs = {};
            
            expect(() => {
                visitor.visitAtRule(mockAtRuleNode, visitArgs);
            }).not.toThrow();
        });

        it('should handle at-rule with null rules', () => {
            const mockAtRuleNode = {
                isRooted: false,
                rules: null
            };
            const visitArgs = {};
            
            expect(() => {
                visitor.visitAtRule(mockAtRuleNode, visitArgs);
            }).not.toThrow();
        });

        it('should only modify first rule when multiple rules exist', () => {
            visitor.contexts = [[]]; // empty context
            const mockAtRuleNode = {
                rules: [
                    { root: false },
                    { root: false },
                    { root: false }
                ]
            };
            const visitArgs = {};
            
            visitor.visitAtRule(mockAtRuleNode, visitArgs);
            
            expect(mockAtRuleNode.rules[0].root).toBe(true);
            expect(mockAtRuleNode.rules[1].root).toBe(false);
            expect(mockAtRuleNode.rules[2].root).toBe(false);
        });
    });

    describe('complex scenarios', () => {
        it('should handle nested rulesets correctly', () => {
            // Test entering and exiting nested rulesets
            const mockSelector = { getIsOutput: vi.fn().mockReturnValue(true) };
            const mockRuleset1 = {
                root: false,
                selectors: [mockSelector],
                joinSelectors: vi.fn()
            };
            const mockRuleset2 = {
                root: false,
                selectors: [mockSelector],
                joinSelectors: vi.fn()
            };
            
            expect(visitor.contexts).toHaveLength(1);
            
            visitor.visitRuleset(mockRuleset1, {});
            expect(visitor.contexts).toHaveLength(2);
            
            visitor.visitRuleset(mockRuleset2, {});
            expect(visitor.contexts).toHaveLength(3);
            
            visitor.visitRulesetOut(mockRuleset2);
            expect(visitor.contexts).toHaveLength(2);
            
            visitor.visitRulesetOut(mockRuleset1);
            expect(visitor.contexts).toHaveLength(1);
        });

        it('should maintain context stack integrity across multiple operations', () => {
            const initialContexts = visitor.contexts.length;
            
            // Add contexts
            visitor.visitRuleset({ root: false }, {});
            visitor.visitRuleset({ root: false }, {});
            
            expect(visitor.contexts.length).toBe(initialContexts + 2);
            
            // Remove contexts
            visitor.visitRulesetOut({});
            visitor.visitRulesetOut({});
            
            expect(visitor.contexts.length).toBe(initialContexts);
        });

        it('should handle mixed selector filtering scenarios', () => {
            const outputSelector = { getIsOutput: vi.fn().mockReturnValue(true) };
            const hiddenSelector = { getIsOutput: vi.fn().mockReturnValue(false) };
            
            const mockRuleset = {
                root: false,
                selectors: [outputSelector, hiddenSelector, outputSelector, hiddenSelector],
                joinSelectors: vi.fn()
            };
            
            visitor.visitRuleset(mockRuleset, {});
            
            expect(mockRuleset.selectors).toEqual([outputSelector, outputSelector]);
            expect(mockRuleset.joinSelectors).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle null node in visitDeclaration', () => {
            const visitArgs = { visitDeeper: true };
            
            expect(() => {
                visitor.visitDeclaration(null, visitArgs);
            }).not.toThrow();
            
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should handle null node in visitMixinDefinition', () => {
            const visitArgs = { visitDeeper: true };
            
            expect(() => {
                visitor.visitMixinDefinition(null, visitArgs);
            }).not.toThrow();
            
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should handle context stack underflow', () => {
            visitor.contexts = [];
            
            expect(() => {
                visitor.visitRulesetOut({});
            }).toThrow('Invalid array length');
        });

        it('should handle getIsOutput throwing errors', () => {
            const errorSelector = { 
                getIsOutput: vi.fn().mockImplementation(() => {
                    throw new Error('getIsOutput error');
                })
            };
            
            const mockRuleset = {
                root: false,
                selectors: [errorSelector]
            };
            
            expect(() => {
                visitor.visitRuleset(mockRuleset, {});
            }).toThrow('getIsOutput error');
        });
    });
});