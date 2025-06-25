import { describe, it, expect, beforeEach, vi } from 'vitest';
import ToCSSVisitor from './to-css-visitor';
import tree from '../tree';

// Mock the tree module
vi.mock('../tree', () => ({
    default: {
        Declaration: vi.fn().mockImplementation(function(name, value) {
            this.type = 'Declaration';
            this.name = name;
            this.value = value;
            this.variable = false;
            this.blocksVisibility = vi.fn(() => false);
            this.toCSS = vi.fn(() => `${name}: ${value}`);
            this.isVisible = vi.fn(() => true);
            this.getIndex = vi.fn(() => 0);
            this.fileInfo = vi.fn(() => null);
        }),
        Comment: vi.fn().mockImplementation(function(value) {
            this.type = 'Comment';
            this.value = value;
            this.debugInfo = null;
            this.blocksVisibility = vi.fn(() => false);
            this.isSilent = vi.fn(() => false);
            this.toCSS = vi.fn(() => value);
        }),
        Call: vi.fn().mockImplementation(function(name) {
            this.type = 'Call';
            this.name = name;
            this.getIndex = vi.fn(() => 0);
            this.fileInfo = vi.fn(() => ({ filename: 'test.less' }));
        }),
        Combinator: vi.fn().mockImplementation(function(value) {
            this.value = value;
        }),
        Expression: vi.fn().mockImplementation(function(value) {
            this.value = value;
        }),
        Value: vi.fn().mockImplementation(function(value) {
            this.value = value;
        })
    }
}));

// Mock the Visitor class
vi.mock('./visitor', () => ({
    default: vi.fn().mockImplementation(function(implementation) {
        this.implementation = implementation;
        this.visit = vi.fn((node) => {
            if (!node) return node;
            
            // Simulate visitor behavior
            const visitMethodName = 'visit' + node.type;
            const visitMethod = implementation[visitMethodName];
            let result = node;
            
            if (visitMethod) {
                const visitArgs = { visitDeeper: true };
                result = visitMethod.call(implementation, node, visitArgs);
                
                // Simulate visiting children if visitDeeper is true
                if (visitArgs.visitDeeper && node.accept) {
                    node.accept(this);
                }
            }
            
            return result;
        });
    })
}));

describe('ToCSSVisitor', () => {
    let visitor;
    let context;
    let mockVisitor;

    beforeEach(() => {
        context = {
            compress: false,
            sourceMap: false
        };
        visitor = new ToCSSVisitor(context);
        mockVisitor = visitor._visitor;
    });

    describe('constructor', () => {
        it('should initialize with context and visitor', () => {
            expect(visitor._context).toBe(context);
            expect(visitor._visitor).toBeDefined();
            expect(visitor.utils).toBeDefined();
            expect(visitor.isReplacing).toBe(true);
        });

        it('should create CSSVisitorUtils instance', () => {
            expect(visitor.utils).toBeDefined();
            expect(visitor.utils._context).toBe(context);
        });
    });

    describe('run', () => {
        it('should call visitor.visit with root node', () => {
            const mockRoot = { type: 'Root' };
            visitor.run(mockRoot);
            expect(mockVisitor.visit).toHaveBeenCalledWith(mockRoot);
        });
    });

    describe('visitDeclaration', () => {
        it('should return undefined for declarations that block visibility', () => {
            const decl = new tree.Declaration('color', 'red');
            decl.blocksVisibility.mockReturnValue(true);
            
            const result = visitor.visitDeclaration(decl, {});
            expect(result).toBeUndefined();
        });

        it('should return undefined for variable declarations', () => {
            const decl = new tree.Declaration('@var', 'value');
            decl.variable = true;
            
            const result = visitor.visitDeclaration(decl, {});
            expect(result).toBeUndefined();
        });

        it('should return declaration for normal declarations', () => {
            const decl = new tree.Declaration('color', 'red');
            
            const result = visitor.visitDeclaration(decl, {});
            expect(result).toBe(decl);
        });
    });

    describe('visitMixinDefinition', () => {
        it('should clear mixin frames', () => {
            const mixin = {
                type: 'MixinDefinition',
                frames: ['frame1', 'frame2']
            };
            
            visitor.visitMixinDefinition(mixin, {});
            expect(mixin.frames).toEqual([]);
        });
    });

    describe('visitExtend', () => {
        it('should do nothing', () => {
            const extend = { type: 'Extend' };
            const result = visitor.visitExtend(extend, {});
            expect(result).toBeUndefined();
        });
    });

    describe('visitComment', () => {
        it('should return undefined for comments that block visibility', () => {
            const comment = new tree.Comment('/* test */');
            comment.blocksVisibility.mockReturnValue(true);
            
            const result = visitor.visitComment(comment, {});
            expect(result).toBeUndefined();
        });

        it('should return undefined for silent comments', () => {
            const comment = new tree.Comment('// test');
            comment.isSilent.mockReturnValue(true);
            
            const result = visitor.visitComment(comment, {});
            expect(result).toBeUndefined();
        });

        it('should return comment for normal comments', () => {
            const comment = new tree.Comment('/* test */');
            
            const result = visitor.visitComment(comment, {});
            expect(result).toBe(comment);
        });
    });

    describe('visitMedia', () => {
        it('should process media node and set visitDeeper to false', () => {
            const mediaNode = {
                type: 'Media',
                rules: [{ rules: [] }],
                accept: vi.fn(),
                blocksVisibility: vi.fn(() => false)
            };
            const visitArgs = { visitDeeper: true };
            
            visitor.utils.resolveVisibility = vi.fn((node) => node);
            visitor.visitMedia(mediaNode, visitArgs);
            
            expect(mediaNode.accept).toHaveBeenCalledWith(mockVisitor);
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should call resolveVisibility with original rules', () => {
            const originalRules = [{ type: 'Rule' }];
            const mediaNode = {
                type: 'Media',
                rules: [{ rules: originalRules }],
                accept: vi.fn()
            };
            
            visitor.utils.resolveVisibility = vi.fn();
            visitor.visitMedia(mediaNode, {});
            
            expect(visitor.utils.resolveVisibility).toHaveBeenCalledWith(mediaNode, originalRules);
        });
    });

    describe('visitImport', () => {
        it('should return undefined for imports that block visibility', () => {
            const importNode = {
                type: 'Import',
                blocksVisibility: vi.fn(() => true)
            };
            
            const result = visitor.visitImport(importNode, {});
            expect(result).toBeUndefined();
        });

        it('should return import node for normal imports', () => {
            const importNode = {
                type: 'Import',
                blocksVisibility: vi.fn(() => false)
            };
            
            const result = visitor.visitImport(importNode, {});
            expect(result).toBe(importNode);
        });
    });

    describe('visitAtRule', () => {
        it('should call visitAtRuleWithBody for at-rules with rules', () => {
            const atRule = {
                type: 'AtRule',
                rules: [{ type: 'Rule' }]
            };
            
            visitor.visitAtRuleWithBody = vi.fn();
            visitor.visitAtRule(atRule, {});
            
            expect(visitor.visitAtRuleWithBody).toHaveBeenCalledWith(atRule, {});
        });

        it('should call visitAtRuleWithoutBody for at-rules without rules', () => {
            const atRule = {
                type: 'AtRule',
                rules: null
            };
            
            visitor.visitAtRuleWithoutBody = vi.fn();
            visitor.visitAtRule(atRule, {});
            
            expect(visitor.visitAtRuleWithoutBody).toHaveBeenCalledWith(atRule, {});
        });

        it('should call visitAtRuleWithoutBody for at-rules with empty rules', () => {
            const atRule = {
                type: 'AtRule',
                rules: []
            };
            
            visitor.visitAtRuleWithoutBody = vi.fn();
            visitor.visitAtRule(atRule, {});
            
            expect(visitor.visitAtRuleWithoutBody).toHaveBeenCalledWith(atRule, {});
        });
    });

    describe('visitAnonymous', () => {
        it('should return undefined for anonymous nodes that block visibility', () => {
            const anonymous = {
                type: 'Anonymous',
                blocksVisibility: vi.fn(() => true)
            };
            
            const result = visitor.visitAnonymous(anonymous, {});
            expect(result).toBeUndefined();
        });

        it('should accept visitor and return node for normal anonymous nodes', () => {
            const anonymous = {
                type: 'Anonymous',
                blocksVisibility: vi.fn(() => false),
                accept: vi.fn()
            };
            
            const result = visitor.visitAnonymous(anonymous, {});
            
            expect(anonymous.accept).toHaveBeenCalledWith(mockVisitor);
            expect(result).toBe(anonymous);
        });
    });

    describe('visitAtRuleWithoutBody', () => {
        it('should return undefined for at-rules that block visibility', () => {
            const atRule = {
                type: 'AtRule',
                blocksVisibility: vi.fn(() => true)
            };
            
            const result = visitor.visitAtRuleWithoutBody(atRule, {});
            expect(result).toBeUndefined();
        });

        it('should handle @charset rules specially', () => {
            const atRule = {
                type: 'AtRule',
                name: '@charset',
                blocksVisibility: vi.fn(() => false),
                toCSS: vi.fn(() => '@charset "UTF-8";'),
                debugInfo: null
            };
            
            // First @charset should be kept
            const result1 = visitor.visitAtRuleWithoutBody(atRule, {});
            expect(result1).toBe(atRule);
            expect(visitor.charset).toBe(true);
            
            // Second @charset without debugInfo should be ignored
            const result2 = visitor.visitAtRuleWithoutBody(atRule, {});
            expect(result2).toBeUndefined();
        });

        it('should convert duplicate @charset with debugInfo to comment', () => {
            visitor.charset = true;
            
            const atRule = {
                type: 'AtRule',
                name: '@charset',
                blocksVisibility: vi.fn(() => false),
                toCSS: vi.fn(() => '@charset "UTF-8";\n'),
                debugInfo: { line: 1, column: 0 }
            };
            
            visitor.visitAtRuleWithoutBody(atRule, {});
            
            expect(tree.Comment).toHaveBeenCalledWith('/* @charset "UTF-8"; */\n');
            expect(mockVisitor.visit).toHaveBeenCalled();
        });

        it('should return normal at-rules', () => {
            const atRule = {
                type: 'AtRule',
                name: '@import',
                blocksVisibility: vi.fn(() => false)
            };
            
            const result = visitor.visitAtRuleWithoutBody(atRule, {});
            expect(result).toBe(atRule);
        });
    });

    describe('checkValidNodes', () => {
        it('should not throw for undefined rules', () => {
            expect(() => visitor.checkValidNodes(undefined, true)).not.toThrow();
        });

        it('should not throw for empty rules', () => {
            expect(() => visitor.checkValidNodes([], true)).not.toThrow();
        });

        it('should throw for non-variable declarations at root', () => {
            const decl = new tree.Declaration('color', 'red');
            decl.variable = false;
            
            expect(() => visitor.checkValidNodes([decl], true)).toThrow('Properties must be inside selector blocks. They cannot be in the root');
        });

        it('should not throw for variable declarations at root', () => {
            const decl = new tree.Declaration('@var', 'value');
            decl.variable = true;
            decl.type = 'Declaration';
            decl.allowRoot = true;
            
            expect(() => visitor.checkValidNodes([decl], true)).not.toThrow();
        });

        it('should throw for Call nodes', () => {
            const call = new tree.Call('myFunction');
            
            expect(() => visitor.checkValidNodes([call], false)).toThrow("Function 'myFunction' did not return a root node");
        });

        it('should throw for non-root allowed nodes', () => {
            const node = {
                type: 'SomeType',
                allowRoot: false,
                getIndex: vi.fn(() => 5),
                fileInfo: vi.fn(() => ({ filename: 'test.less' }))
            };
            
            expect(() => visitor.checkValidNodes([node], false)).toThrow('SomeType node returned by a function is not valid here');
        });

        it('should not throw for nodes with allowRoot true', () => {
            const node = {
                type: 'SomeType',
                allowRoot: true
            };
            
            expect(() => visitor.checkValidNodes([node], false)).not.toThrow();
        });
    });

    describe('visitRuleset', () => {
        let ruleset;
        let visitArgs;

        beforeEach(() => {
            visitArgs = { visitDeeper: true };
            ruleset = {
                type: 'Ruleset',
                root: false,
                firstRoot: false,
                rules: [],
                paths: [],
                accept: vi.fn(),
                ensureVisibility: vi.fn()
            };
        });

        it('should check valid nodes', () => {
            visitor.checkValidNodes = vi.fn();
            visitor.visitRuleset(ruleset, visitArgs);
            
            expect(visitor.checkValidNodes).toHaveBeenCalledWith([], false);
        });

        it('should compile ruleset paths for non-root rulesets', () => {
            visitor._compileRulesetPaths = vi.fn();
            visitor.visitRuleset(ruleset, visitArgs);
            
            expect(visitor._compileRulesetPaths).toHaveBeenCalledWith(ruleset);
        });

        it('should extract nested rulesets', () => {
            const nestedRuleset = {
                type: 'Ruleset',
                rules: [],
                getIndex: vi.fn(() => 0),
                fileInfo: vi.fn(() => null),
                allowRoot: true
            };
            const declaration = new tree.Declaration('color', 'red');
            declaration.type = 'Declaration';
            declaration.allowRoot = true;
            declaration.getIndex = vi.fn(() => 0);
            declaration.fileInfo = vi.fn(() => null);
            
            const declaration2 = new tree.Declaration('padding', '10px');
            declaration2.type = 'Declaration';
            declaration2.allowRoot = true;
            declaration2.getIndex = vi.fn(() => 0);
            declaration2.fileInfo = vi.fn(() => null);
            
            ruleset.rules = [declaration, nestedRuleset, declaration2];
            
            visitor.visitRuleset(ruleset, visitArgs);
            
            expect(ruleset.rules).toHaveLength(2);
            expect(ruleset.rules).not.toContain(nestedRuleset);
            expect(mockVisitor.visit).toHaveBeenCalledWith(nestedRuleset);
        });

        it('should set rules to null if no rules remain', () => {
            ruleset.rules = [];
            visitor.visitRuleset(ruleset, visitArgs);
            
            expect(ruleset.rules).toBeNull();
        });

        it('should merge and remove duplicate rules', () => {
            visitor._mergeRules = vi.fn();
            visitor._removeDuplicateRules = vi.fn();
            
            const decl = new tree.Declaration('color', 'red');
            decl.type = 'Declaration';
            decl.allowRoot = true;
            
            ruleset.rules = [decl];
            visitor.visitRuleset(ruleset, visitArgs);
            
            expect(visitor._mergeRules).toHaveBeenCalledWith(ruleset.rules);
            expect(visitor._removeDuplicateRules).toHaveBeenCalledWith(ruleset.rules);
        });

        it('should set visitDeeper to false', () => {
            visitor.visitRuleset(ruleset, visitArgs);
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should return visible rulesets', () => {
            visitor.utils.isVisibleRuleset = vi.fn(() => true);
            
            const result = visitor.visitRuleset(ruleset, visitArgs);
            
            expect(ruleset.ensureVisibility).toHaveBeenCalled();
            expect(result).toBe(ruleset); // Returns single ruleset directly when array has only one item
        });

        it('should return array when multiple rulesets exist', () => {
            visitor.utils.isVisibleRuleset = vi.fn(() => true);
            
            const nestedRuleset = {
                type: 'Ruleset',
                rules: [],
                getIndex: vi.fn(() => 0),
                fileInfo: vi.fn(() => null),
                allowRoot: true,
                ensureVisibility: vi.fn()
            };
            
            ruleset.rules = [nestedRuleset];
            
            const result = visitor.visitRuleset(ruleset, visitArgs);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2); // Original ruleset + nested one
        });

        it('should handle root rulesets differently', () => {
            ruleset.root = true;
            visitor._compileRulesetPaths = vi.fn();
            
            visitor.visitRuleset(ruleset, visitArgs);
            
            expect(visitor._compileRulesetPaths).not.toHaveBeenCalled();
            expect(ruleset.accept).toHaveBeenCalledWith(mockVisitor);
        });
    });

    describe('_compileRulesetPaths', () => {
        it('should handle undefined paths', () => {
            const ruleset = {};
            visitor._compileRulesetPaths(ruleset);
            expect(ruleset.paths).toBeUndefined();
        });

        it('should filter out invisible paths', () => {
            // Path where all elements are invisible
            const path1 = [
                {
                    elements: [{
                        combinator: { value: '' }
                    }],
                    isVisible: vi.fn(() => false),
                    getIsOutput: vi.fn(() => true)
                },
                {
                    isVisible: vi.fn(() => false),
                    getIsOutput: vi.fn(() => true)
                }
            ];
            
            // Path with at least one visible element
            const path2 = [
                {
                    elements: [{
                        combinator: { value: '' }
                    }],
                    isVisible: vi.fn(() => true),
                    getIsOutput: vi.fn(() => true)
                }
            ];
            
            const ruleset = {
                paths: [path1, path2]
            };
            
            visitor._compileRulesetPaths(ruleset);
            
            expect(ruleset.paths).toEqual([path2]);
        });

        it('should convert space combinator to empty at start of path', () => {
            const element = {
                combinator: { value: ' ' }
            };
            
            const pathElement = {
                elements: [element],
                isVisible: vi.fn(() => true),
                getIsOutput: vi.fn(() => true)
            };
            
            const path = [pathElement];
            
            const ruleset = { paths: [path] };
            
            visitor._compileRulesetPaths(ruleset);
            
            expect(tree.Combinator).toHaveBeenCalledWith('');
        });

        it('should keep paths with at least one visible output element', () => {
            const path = [
                {
                    elements: [{
                        combinator: { value: '' }
                    }],
                    isVisible: vi.fn(() => false),
                    getIsOutput: vi.fn(() => true)
                },
                {
                    isVisible: vi.fn(() => true),
                    getIsOutput: vi.fn(() => true)
                }
            ];
            
            const ruleset = { paths: [path] };
            
            visitor._compileRulesetPaths(ruleset);
            
            expect(ruleset.paths).toEqual([path]);
        });
    });

    describe('_removeDuplicateRules', () => {
        it('should handle undefined rules', () => {
            expect(() => visitor._removeDuplicateRules(undefined)).not.toThrow();
        });

        it('should remove duplicate declarations', () => {
            const decl1 = new tree.Declaration('color', 'red');
            const decl2 = new tree.Declaration('color', 'red');
            const decl3 = new tree.Declaration('color', 'blue');
            
            const rules = [decl1, decl2, decl3];
            
            visitor._removeDuplicateRules(rules);
            
            expect(rules).toHaveLength(2);
            expect(rules).toContain(decl2); // Keeps the last occurrence of duplicates
            expect(rules).toContain(decl3);
            expect(rules).not.toContain(decl1);
        });

        it('should keep declarations with same name but different values', () => {
            const decl1 = new tree.Declaration('margin', '10px');
            decl1.toCSS.mockReturnValue('margin: 10px');
            
            const decl2 = new tree.Declaration('margin', '20px');
            decl2.toCSS.mockReturnValue('margin: 20px');
            
            const rules = [decl1, decl2];
            
            visitor._removeDuplicateRules(rules);
            
            expect(rules).toHaveLength(2);
        });

        it('should handle multiple duplicates', () => {
            const decl1 = new tree.Declaration('color', 'red');
            const decl2 = new tree.Declaration('color', 'red');
            const decl3 = new tree.Declaration('color', 'red');
            
            const rules = [decl1, decl2, decl3];
            
            visitor._removeDuplicateRules(rules);
            
            expect(rules).toHaveLength(1);
            expect(rules).toContain(decl3); // Keeps the last occurrence
        });

        it('should process rules from end to start', () => {
            const decl1 = new tree.Declaration('color', 'red');
            const decl2 = new tree.Declaration('color', 'red');
            
            const rules = [decl1, decl2];
            
            visitor._removeDuplicateRules(rules);
            
            // Should keep the last occurrence
            expect(rules).toEqual([decl2]);
        });

        it('should ignore non-declaration rules', () => {
            const comment = { type: 'Comment' };
            const decl = new tree.Declaration('color', 'red');
            
            const rules = [comment, decl];
            
            visitor._removeDuplicateRules(rules);
            
            expect(rules).toHaveLength(2);
        });
    });

    describe('_mergeRules', () => {
        it('should handle undefined rules', () => {
            expect(() => visitor._mergeRules(undefined)).not.toThrow();
        });

        it('should not merge rules without merge property', () => {
            const rule1 = new tree.Declaration('margin', '10px');
            const rule2 = new tree.Declaration('padding', '20px');
            
            const rules = [rule1, rule2];
            visitor._mergeRules(rules);
            
            expect(rules).toHaveLength(2);
        });

        it('should merge rules with same name and merge property', () => {
            const rule1 = {
                name: 'background',
                value: 'red',
                merge: '+',
                important: false
            };
            const rule2 = {
                name: 'background',
                value: 'blue',
                merge: '+',
                important: false
            };
            
            const rules = [rule1, rule2];
            visitor._mergeRules(rules);
            
            expect(rules).toHaveLength(1);
            expect(rules[0]).toBe(rule1);
            expect(tree.Value).toHaveBeenCalled();
            expect(tree.Expression).toHaveBeenCalled();
        });

        it('should handle + merge with comma separation', () => {
            const rule1 = {
                name: 'background',
                value: 'red',
                merge: '+',
                important: false
            };
            const rule2 = {
                name: 'background',
                value: 'blue',
                merge: '+',
                important: true
            };
            
            const rules = [rule1, rule2];
            visitor._mergeRules(rules);
            
            expect(rule1.important).toBe(true);
            // Each + merge creates new expressions for comma separation
            expect(tree.Expression).toHaveBeenCalled();
        });

        it('should merge multiple rules with same name', () => {
            const rule1 = {
                name: 'transform',
                value: 'rotate(45deg)',
                merge: true,
                important: false
            };
            const rule2 = {
                name: 'transform',
                value: 'scale(2)',
                merge: true,
                important: false
            };
            const rule3 = {
                name: 'transform',
                value: 'translateX(10px)',
                merge: true,
                important: true
            };
            
            const rules = [rule1, rule2, rule3];
            visitor._mergeRules(rules);
            
            expect(rules).toHaveLength(1);
            expect(rules[0]).toBe(rule1);
            expect(rule1.important).toBe(true);
        });

        it('should not merge rules with different names', () => {
            const rule1 = {
                name: 'margin',
                value: '10px',
                merge: true
            };
            const rule2 = {
                name: 'padding',
                value: '20px',
                merge: true
            };
            
            const rules = [rule1, rule2];
            visitor._mergeRules(rules);
            
            expect(rules).toHaveLength(2);
        });
    });

    describe('visitAtRuleWithBody', () => {
        let atRule;
        let visitArgs;

        beforeEach(() => {
            visitArgs = { visitDeeper: true };
            atRule = {
                type: 'AtRule',
                rules: [{ rules: [] }],
                accept: vi.fn()
            };
        });

        it('should process at-rule and set visitDeeper to false', () => {
            atRule.blocksVisibility = vi.fn(() => false);
            visitor.utils.resolveVisibility = vi.fn((node) => node);
            
            visitor.visitAtRuleWithBody(atRule, visitArgs);
            
            expect(atRule.accept).toHaveBeenCalledWith(mockVisitor);
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should merge rules if at-rule is not empty', () => {
            visitor._mergeRules = vi.fn();
            visitor.utils.isEmpty = vi.fn(() => false);
            atRule.blocksVisibility = vi.fn(() => false);
            visitor.utils.resolveVisibility = vi.fn((node) => node);
            
            visitor.visitAtRuleWithBody(atRule, visitArgs);
            
            expect(visitor._mergeRules).toHaveBeenCalledWith(atRule.rules[0].rules);
        });

        it('should handle fake ruleset with no paths', () => {
            const fakeRuleset = {
                paths: null,
                rules: [{ type: 'Declaration' }]
            };
            atRule.rules = [fakeRuleset];
            
            visitor.utils.resolveVisibility = vi.fn();
            visitor.visitAtRuleWithBody(atRule, visitArgs);
            
            expect(visitor.utils.resolveVisibility).toHaveBeenCalledWith(atRule, fakeRuleset.rules);
        });

        it('should handle fake ruleset with empty paths', () => {
            const fakeRuleset = {
                paths: [],
                rules: [{ type: 'Declaration' }]
            };
            atRule.rules = [fakeRuleset];
            
            visitor.utils.resolveVisibility = vi.fn();
            visitor.visitAtRuleWithBody(atRule, visitArgs);
            
            expect(visitor.utils.resolveVisibility).toHaveBeenCalledWith(atRule, fakeRuleset.rules);
        });

        it('should handle normal rulesets', () => {
            const normalRuleset = {
                paths: [{ type: 'Path' }],
                rules: []
            };
            atRule.rules = [normalRuleset];
            
            visitor.utils.resolveVisibility = vi.fn();
            visitor.visitAtRuleWithBody(atRule, visitArgs);
            
            expect(visitor.utils.resolveVisibility).toHaveBeenCalledWith(atRule, [normalRuleset]);
        });
    });

    describe('CSSVisitorUtils', () => {
        describe('containsSilentNonBlockedChild', () => {
            it('should return false for undefined rules', () => {
                expect(visitor.utils.containsSilentNonBlockedChild(undefined)).toBe(false);
            });

            it('should return false for empty rules', () => {
                expect(visitor.utils.containsSilentNonBlockedChild([])).toBe(false);
            });

            it('should return true for silent non-blocked rule', () => {
                const rule = {
                    isSilent: vi.fn(() => true),
                    blocksVisibility: vi.fn(() => false)
                };
                
                expect(visitor.utils.containsSilentNonBlockedChild([rule])).toBe(true);
            });

            it('should return false for non-silent rule', () => {
                const rule = {
                    isSilent: vi.fn(() => false),
                    blocksVisibility: vi.fn(() => false)
                };
                
                expect(visitor.utils.containsSilentNonBlockedChild([rule])).toBe(false);
            });

            it('should return false for blocked rule', () => {
                const rule = {
                    isSilent: vi.fn(() => true),
                    blocksVisibility: vi.fn(() => true)
                };
                
                expect(visitor.utils.containsSilentNonBlockedChild([rule])).toBe(false);
            });

            it('should check all rules and return true if any match', () => {
                const rules = [
                    { isSilent: vi.fn(() => false), blocksVisibility: vi.fn(() => false) },
                    { isSilent: vi.fn(() => true), blocksVisibility: vi.fn(() => true) },
                    { isSilent: vi.fn(() => true), blocksVisibility: vi.fn(() => false) }
                ];
                
                expect(visitor.utils.containsSilentNonBlockedChild(rules)).toBe(true);
            });
        });

        describe('keepOnlyVisibleChilds', () => {
            it('should handle undefined owner', () => {
                expect(() => visitor.utils.keepOnlyVisibleChilds(undefined)).not.toThrow();
            });

            it('should handle owner without rules', () => {
                expect(() => visitor.utils.keepOnlyVisibleChilds({})).not.toThrow();
            });

            it('should filter out invisible rules', () => {
                const visibleRule = { isVisible: vi.fn(() => true) };
                const invisibleRule = { isVisible: vi.fn(() => false) };
                
                const owner = {
                    rules: [visibleRule, invisibleRule, visibleRule]
                };
                
                visitor.utils.keepOnlyVisibleChilds(owner);
                
                expect(owner.rules).toEqual([visibleRule, visibleRule]);
            });
        });

        describe('isEmpty', () => {
            it('should return true for undefined owner', () => {
                expect(visitor.utils.isEmpty(undefined)).toBe(true);
            });

            it('should return true for owner without rules', () => {
                expect(visitor.utils.isEmpty({})).toBe(true);
            });

            it('should return true for owner with empty rules', () => {
                expect(visitor.utils.isEmpty({ rules: [] })).toBe(true);
            });

            it('should return false for owner with rules', () => {
                expect(visitor.utils.isEmpty({ rules: [{}] })).toBe(false);
            });
        });

        describe('hasVisibleSelector', () => {
            it('should return false for undefined ruleset', () => {
                expect(visitor.utils.hasVisibleSelector(undefined)).toBe(false);
            });

            it('should return false for ruleset without paths', () => {
                expect(visitor.utils.hasVisibleSelector({})).toBe(false);
            });

            it('should return false for ruleset with empty paths', () => {
                expect(visitor.utils.hasVisibleSelector({ paths: [] })).toBe(false);
            });

            it('should return true for ruleset with paths', () => {
                expect(visitor.utils.hasVisibleSelector({ paths: [{}] })).toBe(true);
            });
        });

        describe('resolveVisibility', () => {
            it('should return node if it does not block visibility and is not empty', () => {
                const node = {
                    blocksVisibility: vi.fn(() => false),
                    rules: [{}]
                };
                
                const result = visitor.utils.resolveVisibility(node);
                expect(result).toBe(node);
            });

            it('should return undefined if node does not block visibility but is empty', () => {
                const node = {
                    blocksVisibility: vi.fn(() => false),
                    rules: []
                };
                
                const result = visitor.utils.resolveVisibility(node);
                expect(result).toBeUndefined();
            });

            it('should process blocked nodes', () => {
                const compiledRulesBody = {
                    rules: [{ isVisible: vi.fn(() => true) }]
                };
                const node = {
                    blocksVisibility: vi.fn(() => true),
                    rules: [compiledRulesBody],
                    ensureVisibility: vi.fn(),
                    removeVisibilityBlock: vi.fn()
                };
                
                vi.spyOn(visitor.utils, 'keepOnlyVisibleChilds');
                const result = visitor.utils.resolveVisibility(node);
                
                expect(visitor.utils.keepOnlyVisibleChilds).toHaveBeenCalledWith(compiledRulesBody);
                expect(node.ensureVisibility).toHaveBeenCalled();
                expect(node.removeVisibilityBlock).toHaveBeenCalled();
                expect(result).toBe(node);
            });

            it('should return undefined for empty blocked nodes', () => {
                const compiledRulesBody = { rules: [] };
                const node = {
                    blocksVisibility: vi.fn(() => true),
                    rules: [compiledRulesBody]
                };
                
                const result = visitor.utils.resolveVisibility(node);
                expect(result).toBeUndefined();
            });
        });

        describe('isVisibleRuleset', () => {
            it('should return true for firstRoot rulesets', () => {
                const ruleset = { firstRoot: true };
                expect(visitor.utils.isVisibleRuleset(ruleset)).toBe(true);
            });

            it('should return false for empty rulesets', () => {
                const ruleset = {
                    firstRoot: false,
                    rules: []
                };
                expect(visitor.utils.isVisibleRuleset(ruleset)).toBe(false);
            });

            it('should return false for non-root rulesets without visible selectors', () => {
                const ruleset = {
                    firstRoot: false,
                    root: false,
                    rules: [{}],
                    paths: []
                };
                expect(visitor.utils.isVisibleRuleset(ruleset)).toBe(false);
            });

            it('should return true for root rulesets with rules', () => {
                const ruleset = {
                    firstRoot: false,
                    root: true,
                    rules: [{}]
                };
                expect(visitor.utils.isVisibleRuleset(ruleset)).toBe(true);
            });

            it('should return true for non-root rulesets with visible selectors', () => {
                const ruleset = {
                    firstRoot: false,
                    root: false,
                    rules: [{}],
                    paths: [{}]
                };
                expect(visitor.utils.isVisibleRuleset(ruleset)).toBe(true);
            });
        });
    });
});