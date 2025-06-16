import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock problematic circular dependencies
vi.mock('./media', () => ({
    default: vi.fn()
}));
vi.mock('./container', () => ({
    default: vi.fn()
}));

import AtRule from './atrule';
import Node from './node';
import Anonymous from './anonymous';
import Ruleset from './ruleset';

describe('AtRule', () => {
    describe('constructor', () => {
        it('should create an instance with default values', () => {
            const atRule = new AtRule('@media');

            expect(atRule.name).toBe('@media');
            expect(atRule.value).toBeUndefined();
            expect(atRule.rules).toBeUndefined();
            expect(atRule._index).toBeUndefined();
            expect(atRule._fileInfo).toBeUndefined();
            expect(atRule.debugInfo).toBeUndefined();
            expect(atRule.isRooted).toBe(false);
            expect(atRule.allowRoot).toBe(true);
        });

        it('should create an instance with all parameters', () => {
            const fileInfo = { filename: 'test.less' };
            const debugInfo = { lineNumber: 10 };
            const visibilityInfo = { visibilityBlocks: 1, nodeVisible: true };
            const value = new Anonymous('screen');
            const rules = [new Ruleset()];

            const atRule = new AtRule(
                '@media',
                value,
                rules,
                5,
                fileInfo,
                debugInfo,
                true,
                visibilityInfo
            );

            expect(atRule.name).toBe('@media');
            expect(atRule.value).toBe(value);
            expect(atRule.rules).toBe(rules);
            expect(atRule._index).toBe(5);
            expect(atRule._fileInfo).toBe(fileInfo);
            expect(atRule.debugInfo).toBe(debugInfo);
            expect(atRule.isRooted).toBe(true);
            expect(atRule.visibilityBlocks).toBe(1);
            expect(atRule.nodeVisible).toBe(true);
        });

        it('should convert string value to Anonymous node', () => {
            const atRule = new AtRule('@media', 'screen');

            expect(atRule.value).toBeInstanceOf(Anonymous);
            expect(atRule.value.value).toBe('screen');
        });

        it('should handle Node value as-is', () => {
            const value = new Anonymous('screen');
            const atRule = new AtRule('@media', value);

            expect(atRule.value).toBe(value);
        });

        it('should handle null/undefined value', () => {
            const atRule1 = new AtRule('@media', null);
            const atRule2 = new AtRule('@media', undefined);

            expect(atRule1.value).toBeNull();
            expect(atRule2.value).toBeUndefined();
        });

        it('should convert single rule to array and add empty selectors', () => {
            const rule = new Ruleset();
            const atRule = new AtRule('@media', null, rule, 1, {
                filename: 'test.less'
            });

            expect(Array.isArray(atRule.rules)).toBe(true);
            expect(atRule.rules.length).toBe(1);
            expect(atRule.rules[0]).toBe(rule);
            expect(atRule.rules[0].selectors).toBeDefined();
            expect(Array.isArray(atRule.rules[0].selectors)).toBe(true);
        });

        it('should handle array of rules', () => {
            const rules = [new Ruleset(), new Ruleset()];
            const atRule = new AtRule('@media', null, rules);

            expect(atRule.rules).toBe(rules);
            expect(atRule.rules.length).toBe(2);
        });

        it('should set allowImports to true for all rules', () => {
            const rules = [new Ruleset(), new Ruleset()];
            const atRule = new AtRule('@media', null, rules);

            expect(atRule.rules).toBe(rules);
            rules.forEach((rule) => {
                expect(rule.allowImports).toBe(true);
            });
        });

        it('should set parent for rules', () => {
            const rule = new Ruleset();
            const atRule = new AtRule('@media', null, rule);

            expect(rule.parent).toBe(atRule);
        });
    });

    describe('prototype inheritance', () => {
        it('should inherit from Node', () => {
            const atRule = new AtRule('@media');
            expect(atRule).toBeInstanceOf(Node);
        });

        it('should have correct type', () => {
            const atRule = new AtRule('@media');
            expect(atRule.type).toBe('AtRule');
        });
    });

    describe('accept', () => {
        it('should visit rules when present', () => {
            const rule = new Ruleset();
            const visitedRule = new Ruleset();
            const atRule = new AtRule('@media', null, [rule]);

            const visitor = {
                visitArray: vi.fn().mockReturnValue([visitedRule])
            };

            atRule.accept(visitor);

            expect(visitor.visitArray).toHaveBeenCalledWith([rule]);
            expect(atRule.rules).toEqual([visitedRule]);
        });

        it('should visit value when present', () => {
            const value = new Anonymous('screen');
            const visitedValue = new Anonymous('print');
            const atRule = new AtRule('@media', value);

            const visitor = {
                visit: vi.fn().mockReturnValue(visitedValue)
            };

            atRule.accept(visitor);

            expect(visitor.visit).toHaveBeenCalledWith(value);
            expect(atRule.value).toBe(visitedValue);
        });

        it('should handle missing rules and value', () => {
            const atRule = new AtRule('@media');
            const visitor = {
                visit: vi.fn(),
                visitArray: vi.fn()
            };

            atRule.accept(visitor);

            expect(visitor.visit).not.toHaveBeenCalled();
            expect(visitor.visitArray).not.toHaveBeenCalled();
        });
    });

    describe('isRulesetLike', () => {
        it('should return rules array when rules exist', () => {
            const rules = [new Ruleset()];
            const atRule = new AtRule('@media', null, rules);
            expect(atRule.isRulesetLike()).toBe(rules);
        });

        it('should return true when not charset rule', () => {
            const atRule = new AtRule('@media');
            expect(atRule.isRulesetLike()).toBe(true);
        });

        it('should return false when charset rule with no rules', () => {
            const atRule = new AtRule('@charset');
            expect(atRule.isRulesetLike()).toBe(false);
        });

        it('should return rules array when charset rule with rules', () => {
            const rules = [new Ruleset()];
            const atRule = new AtRule('@charset', null, rules);
            expect(atRule.isRulesetLike()).toBe(rules);
        });
    });

    describe('isCharset', () => {
        it('should return true for @charset rule', () => {
            const atRule = new AtRule('@charset');
            expect(atRule.isCharset()).toBe(true);
        });

        it('should return false for other rules', () => {
            const atRule1 = new AtRule('@media');
            const atRule2 = new AtRule('@import');
            const atRule3 = new AtRule('@keyframes');

            expect(atRule1.isCharset()).toBe(false);
            expect(atRule2.isCharset()).toBe(false);
            expect(atRule3.isCharset()).toBe(false);
        });

        it('should be case sensitive', () => {
            const atRule = new AtRule('@CHARSET');
            expect(atRule.isCharset()).toBe(false);
        });
    });

    describe('genCSS', () => {
        let output;

        beforeEach(() => {
            output = {
                add: vi.fn()
            };
        });

        it('should output name only for simple rule', () => {
            const atRule = new AtRule('@charset');
            atRule.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith('@charset', {}, 0);
            expect(output.add).toHaveBeenCalledWith(';');
        });

        it('should output name and value', () => {
            const value = new Anonymous('"UTF-8"');
            value.genCSS = vi.fn();
            const atRule = new AtRule('@charset', value);

            atRule.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith('@charset', {}, 0);
            expect(output.add).toHaveBeenCalledWith(' ');
            expect(value.genCSS).toHaveBeenCalledWith({}, output);
            expect(output.add).toHaveBeenCalledWith(';');
        });

        it('should output rules using outputRuleset', () => {
            const rule = new Ruleset();
            const atRule = new AtRule('@media', null, [rule]);
            atRule.outputRuleset = vi.fn();

            atRule.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith('@media', {}, 0);
            expect(atRule.outputRuleset).toHaveBeenCalledWith({}, output, [
                rule
            ]);
            expect(output.add).not.toHaveBeenCalledWith(';');
        });

        it('should include fileInfo and index when available', () => {
            const fileInfo = { filename: 'test.less' };
            const atRule = new AtRule('@charset', null, null, 5, fileInfo);

            atRule.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith('@charset', fileInfo, 5);
        });
    });

    describe('eval', () => {
        it('should evaluate value when present', () => {
            const value = new Anonymous('screen');
            const evaluatedValue = new Anonymous('print');
            value.eval = vi.fn().mockReturnValue(evaluatedValue);

            const atRule = new AtRule('@media', value);
            const context = {
                mediaPath: ['existing'],
                mediaBlocks: ['existing']
            };

            const result = atRule.eval(context);

            expect(value.eval).toHaveBeenCalledWith(context);
            expect(result.value).toBe(evaluatedValue);
        });

        it('should evaluate rules when present', () => {
            const rule = new Ruleset();
            const evaluatedRule = new Ruleset();
            evaluatedRule.root = undefined;
            rule.eval = vi.fn().mockReturnValue(evaluatedRule);

            const atRule = new AtRule('@media', null, [rule]);
            const context = {
                mediaPath: ['existing'],
                mediaBlocks: ['existing']
            };

            const result = atRule.eval(context);

            expect(rule.eval).toHaveBeenCalledWith(context);
            expect(result.rules).toEqual([evaluatedRule]);
            expect(evaluatedRule.root).toBe(true);
        });

        it('should backup and restore media context', () => {
            const atRule = new AtRule('@media');
            const context = {
                mediaPath: ['existing'],
                mediaBlocks: ['existing']
            };

            atRule.eval(context);

            expect(context.mediaPath).toEqual(['existing']);
            expect(context.mediaBlocks).toEqual(['existing']);
        });

        it('should clear media context during evaluation', () => {
            const value = new Anonymous('screen');
            let capturedContext;
            value.eval = vi.fn().mockImplementation((ctx) => {
                capturedContext = { ...ctx };
                return value;
            });

            const atRule = new AtRule('@media', value);
            const context = {
                mediaPath: ['existing'],
                mediaBlocks: ['existing']
            };

            atRule.eval(context);

            expect(capturedContext.mediaPath).toEqual([]);
            expect(capturedContext.mediaBlocks).toEqual([]);
        });

        it('should return new AtRule instance with same properties', () => {
            const fileInfo = { filename: 'test.less' };
            const debugInfo = { lineNumber: 10 };
            const visibilityInfo = { visibilityBlocks: 1, nodeVisible: true };

            const atRule = new AtRule(
                '@media',
                null,
                null,
                5,
                fileInfo,
                debugInfo,
                true,
                visibilityInfo
            );
            const result = atRule.eval({});

            expect(result).toBeInstanceOf(AtRule);
            expect(result).not.toBe(atRule);
            expect(result.name).toBe('@media');
            expect(result._index).toBe(5);
            expect(result._fileInfo).toBe(fileInfo);
            expect(result.debugInfo).toBe(debugInfo);
            expect(result.isRooted).toBe(true);
            expect(result.visibilityBlocks).toBe(1);
            expect(result.nodeVisible).toBe(true);
        });
    });

    describe('variable', () => {
        it('should delegate to first rule when rules exist', () => {
            const rule = new Ruleset();
            const mockVariable = new Anonymous('@var-value');

            // Mock the Ruleset prototype method
            const originalVariable = Ruleset.prototype.variable;
            Ruleset.prototype.variable = vi.fn().mockReturnValue(mockVariable);

            const atRule = new AtRule('@media', null, [rule]);
            const result = atRule.variable('@var');

            expect(Ruleset.prototype.variable).toHaveBeenCalledWith('@var');
            expect(result).toBe(mockVariable);

            // Restore original method
            Ruleset.prototype.variable = originalVariable;
        });

        it('should return undefined when no rules', () => {
            const atRule = new AtRule('@media');
            const result = atRule.variable('@var');

            expect(result).toBeUndefined();
        });

        it('should work with multiple rules but only call first', () => {
            const rule1 = new Ruleset();
            const rule2 = new Ruleset();

            // Mock the Ruleset prototype method
            const originalVariable = Ruleset.prototype.variable;
            Ruleset.prototype.variable = vi
                .fn()
                .mockReturnValue(new Anonymous('@var-value'));

            const atRule = new AtRule('@media', null, [rule1, rule2]);
            atRule.variable('@var');

            expect(Ruleset.prototype.variable).toHaveBeenCalledWith('@var');

            // Restore original method
            Ruleset.prototype.variable = originalVariable;
        });
    });

    describe('find', () => {
        it('should delegate to first rule when rules exist', () => {
            const rule = new Ruleset();
            const mockResult = [{ rule: new Ruleset(), path: [] }];

            // Mock the Ruleset prototype method
            const originalFind = Ruleset.prototype.find;
            Ruleset.prototype.find = vi.fn().mockReturnValue(mockResult);

            const atRule = new AtRule('@media', null, [rule]);
            const selector = { toCSS: () => '.test' };
            const result = atRule.find(selector, 'self', 'filter');

            expect(Ruleset.prototype.find).toHaveBeenCalledWith(
                selector,
                'self',
                'filter'
            );
            expect(result).toBe(mockResult);

            // Restore original method
            Ruleset.prototype.find = originalFind;
        });

        it('should return undefined when no rules', () => {
            const atRule = new AtRule('@media');
            const result = atRule.find();

            expect(result).toBeUndefined();
        });

        it('should pass all arguments to Ruleset.find', () => {
            const rule = new Ruleset();

            // Mock the Ruleset prototype method
            const originalFind = Ruleset.prototype.find;
            Ruleset.prototype.find = vi.fn();

            const atRule = new AtRule('@media', null, [rule]);
            const mockSelector = { toCSS: () => '.test' };
            const args = [mockSelector, 'arg2', 'arg3'];
            atRule.find(...args);

            expect(Ruleset.prototype.find).toHaveBeenCalledWith(...args);

            // Restore original method
            Ruleset.prototype.find = originalFind;
        });
    });

    describe('rulesets', () => {
        it('should delegate to first rule when rules exist', () => {
            const rule = new Ruleset();
            const mockRulesets = [new Ruleset(), new Ruleset()];

            // Mock the Ruleset prototype method
            const originalRulesets = Ruleset.prototype.rulesets;
            Ruleset.prototype.rulesets = vi.fn().mockReturnValue(mockRulesets);

            const atRule = new AtRule('@media', null, [rule]);
            const result = atRule.rulesets();

            expect(Ruleset.prototype.rulesets).toHaveBeenCalled();
            expect(result).toBe(mockRulesets);

            // Restore original method
            Ruleset.prototype.rulesets = originalRulesets;
        });

        it('should return undefined when no rules', () => {
            const atRule = new AtRule('@media');
            const result = atRule.rulesets();

            expect(result).toBeUndefined();
        });
    });

    describe('outputRuleset', () => {
        let output, context;

        beforeEach(() => {
            output = {
                add: vi.fn()
            };
            context = {
                tabLevel: 0,
                compress: false
            };
        });

        it('should output compressed format when context.compress is true', () => {
            context.compress = true;
            const rules = [{ genCSS: vi.fn() }, { genCSS: vi.fn() }];
            const atRule = new AtRule('@media');

            atRule.outputRuleset(context, output, rules);

            expect(output.add).toHaveBeenCalledWith('{');
            expect(rules[0].genCSS).toHaveBeenCalledWith(context, output);
            expect(rules[1].genCSS).toHaveBeenCalledWith(context, output);
            expect(output.add).toHaveBeenCalledWith('}');
            expect(context.tabLevel).toBe(0);
        });

        it('should output non-compressed format with indentation', () => {
            context.tabLevel = 1;
            const rules = [{ genCSS: vi.fn() }, { genCSS: vi.fn() }];
            const atRule = new AtRule('@media');

            atRule.outputRuleset(context, output, rules);

            expect(output.add).toHaveBeenCalledWith(' {\n    ');
            expect(rules[0].genCSS).toHaveBeenCalledWith(context, output);
            expect(output.add).toHaveBeenCalledWith('\n    ');
            expect(rules[1].genCSS).toHaveBeenCalledWith(context, output);
            expect(output.add).toHaveBeenCalledWith('\n  }');
            expect(context.tabLevel).toBe(1);
        });

        it('should handle empty rules array', () => {
            const atRule = new AtRule('@media');

            atRule.outputRuleset(context, output, []);

            expect(output.add).toHaveBeenCalledWith(' {\n}');
        });

        it('should increment and decrement tabLevel during processing', () => {
            const rules = [{ genCSS: vi.fn() }];
            const atRule = new AtRule('@media');
            let capturedTabLevel;

            rules[0].genCSS = vi.fn().mockImplementation((ctx) => {
                capturedTabLevel = ctx.tabLevel;
            });

            atRule.outputRuleset(context, output, rules);

            expect(capturedTabLevel).toBe(1);
            expect(context.tabLevel).toBe(0);
        });

        it('should handle undefined tabLevel', () => {
            delete context.tabLevel;
            const rules = [{ genCSS: vi.fn() }];
            const atRule = new AtRule('@media');

            atRule.outputRuleset(context, output, rules);

            expect(context.tabLevel).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('should handle empty string name', () => {
            const atRule = new AtRule('');
            expect(atRule.name).toBe('');
        });

        it('should handle numeric values', () => {
            const atRule = new AtRule('@media', 123);
            expect(atRule.value).toBeInstanceOf(Anonymous);
            expect(atRule.value.value).toBe(123);
        });

        it('should handle boolean values', () => {
            const atRule = new AtRule('@media', true);
            expect(atRule.value).toBeInstanceOf(Anonymous);
            expect(atRule.value.value).toBe(true);
        });

        it('should handle complex nested rules structure', () => {
            const nestedRule = new Ruleset();
            const parentRule = new Ruleset();
            parentRule.rules = [nestedRule];
            const atRule = new AtRule('@media', null, [parentRule]);

            expect(atRule.rules[0]).toBe(parentRule);
            expect(parentRule.parent).toBe(atRule);
            expect(parentRule.allowImports).toBe(true);
        });
    });

    describe('integration with Node methods', () => {
        it('should inherit visibility methods from Node', () => {
            const atRule = new AtRule('@media');

            expect(typeof atRule.blocksVisibility).toBe('function');
            expect(typeof atRule.addVisibilityBlock).toBe('function');
            expect(typeof atRule.ensureVisibility).toBe('function');
            expect(typeof atRule.copyVisibilityInfo).toBe('function');
        });

        it('should inherit file info methods from Node', () => {
            const fileInfo = { filename: 'test.less' };
            const atRule = new AtRule('@media', null, null, 5, fileInfo);

            expect(atRule.fileInfo()).toBe(fileInfo);
            expect(atRule.getIndex()).toBe(5);
        });

        it('should handle parent-child relationships', () => {
            const rule = new Ruleset();
            const atRule = new AtRule('@media', null, [rule]);

            expect(rule.parent).toBe(atRule);
        });
    });
});
