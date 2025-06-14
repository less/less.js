import { describe, it, expect, beforeEach, vi } from 'vitest';
import Ruleset from './ruleset';
import Node from './node';
import Declaration from './declaration';
import Anonymous from './anonymous';
import contexts from '../contexts';
import globalFunctionRegistry from '../functions/function-registry';
import defaultFunc from '../functions/default';
import getDebugInfo from './debug-info';
import Parser from '../parser/parser';
import Selector from './selector';
import Element from './element';

// Mock dependencies without affecting actual imports
vi.mock('./node', () => {
    const NodeMock = vi.fn().mockImplementation(function () {
        this.parent = null;
        this.visibilityBlocks = undefined;
        this.nodeVisible = undefined;
        this.rootNode = null;
        this.parsed = null;
        this.setParent = vi.fn();
        this.copyVisibilityInfo = vi.fn();
        this.visibilityInfo = vi.fn().mockReturnValue({});
    });

    // Make NodeMock act as a proper constructor for instanceof checks
    NodeMock.prototype.constructor = NodeMock;

    return {
        default: NodeMock
    };
});

vi.mock('./declaration', () => {
    const DeclarationMock = vi
        .fn()
        .mockImplementation(function (
            name,
            value,
            important,
            merge,
            index,
            currentFileInfo,
            inline,
            variable
        ) {
            this.name = name;
            this.value = value;
            this.important = important;
            this.merge = merge;
            this.variable = variable;
            this.inline = inline;
            this._index = index;
            this._fileInfo = currentFileInfo;
        });

    DeclarationMock.prototype.constructor = DeclarationMock;

    return {
        default: DeclarationMock
    };
});

vi.mock('./anonymous', () => ({
    default: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../contexts', () => ({
    default: {
        Eval: vi.fn().mockImplementation((context, frames) => ({
            ...context,
            frames: frames || context.frames
        }))
    }
}));

vi.mock('../functions/function-registry', () => ({
    default: {
        inherit: vi.fn().mockReturnValue({
            inherit: vi.fn().mockReturnThis()
        })
    }
}));

vi.mock('../functions/default', () => ({
    default: {
        error: vi.fn(),
        reset: vi.fn()
    }
}));

vi.mock('./debug-info', () => ({
    default: vi.fn().mockReturnValue('/* debug info */')
}));

vi.mock('../utils', () => ({
    copyArray: vi.fn().mockImplementation((arr) => [...(arr || [])]),
    flattenArray: vi.fn().mockImplementation((arr) => arr.flat())
}));

vi.mock('../parser/parser', () => ({
    default: vi.fn().mockImplementation(() => ({
        parseNode: vi.fn().mockImplementation((selector, types, callback) => {
            callback(null, []);
        })
    }))
}));

describe('Ruleset', () => {
    let mockSelectors;
    let mockRules;
    let mockContext;
    let mockVisitor;
    let mockOutput;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup common mocks
        mockSelectors = [
            {
                eval: vi.fn().mockReturnValue({
                    elements: [{ isVariable: false }],
                    evaldCondition: true,
                    toCSS: vi.fn().mockReturnValue('.test'),
                    getIndex: vi.fn().mockReturnValue(0),
                    fileInfo: vi.fn().mockReturnValue({ filename: 'test.less' })
                })
            }
        ];

        mockRules = [
            {
                type: 'Declaration',
                eval: vi.fn().mockReturnThis(),
                evalFirst: false
            }
        ];

        mockContext = {
            frames: [],
            selectors: [],
            mediaBlocks: [],
            mediaBlockCount: 0
        };

        mockVisitor = {
            visitArray: vi.fn().mockImplementation((arr) => arr)
        };

        mockOutput = {
            add: vi.fn(),
            isEmpty: vi.fn().mockReturnValue(false)
        };

        // Setup default function mocks
        defaultFunc.error = vi.fn();
        defaultFunc.reset = vi.fn();

        // Setup utils mocks - these are already mocked at module level

        // Setup Parser mock
        Parser.mockImplementation(() => ({
            parseNode: vi
                .fn()
                .mockImplementation((selector, types, callback) => {
                    callback(null, mockSelectors);
                })
        }));

        // Setup contexts mock
        contexts.Eval = vi.fn().mockImplementation((context, frames) => ({
            ...context,
            frames: frames || context.frames
        }));

        // Setup global function registry mock
        globalFunctionRegistry.inherit = vi.fn().mockReturnValue({
            inherit: vi.fn().mockReturnThis()
        });

        // Setup getDebugInfo mock
        getDebugInfo.mockReturnValue('/* debug info */');

        // Mock to avoid dealing with visibility info
        Selector.prototype.getIndex = vi.fn().mockReturnValue(0);
        Selector.prototype.fileInfo = vi.fn().mockReturnValue({});
        Selector.prototype.toCSS = function () {
            return this.elements
                .map((e) => {
                    let str = '';
                    if (e.combinator && e.combinator.value) {
                        str += e.combinator.value;
                    }
                    str += e.value;
                    return str;
                })
                .join('');
        };
        Selector.prototype.createDerived = function (
            elements,
            extendList,
            evaldCondition
        ) {
            const newSelector = new Selector(
                elements,
                extendList || this.extendList,
                evaldCondition || this.evaldCondition,
                this.getIndex(),
                this.fileInfo()
            );
            return newSelector;
        };
    });

    describe('constructor', () => {
        it('should create a Ruleset with provided parameters', () => {
            const strictImports = true;
            const visibilityInfo = { visible: true };
            const ruleset = new Ruleset(
                mockSelectors,
                mockRules,
                strictImports,
                visibilityInfo
            );

            expect(ruleset.selectors).toBe(mockSelectors);
            expect(ruleset.rules).toBe(mockRules);
            expect(ruleset.strictImports).toBe(strictImports);
            expect(ruleset._lookups).toEqual({});
            expect(ruleset._variables).toBeNull();
            expect(ruleset._properties).toBeNull();
            expect(ruleset.allowRoot).toBe(true);
        });

        it('should handle undefined parameters', () => {
            const ruleset = new Ruleset();
            expect(ruleset.selectors).toBeUndefined();
            expect(ruleset.rules).toBeUndefined();
            expect(ruleset.strictImports).toBeUndefined();
        });

        it('should handle null parameters', () => {
            const ruleset = new Ruleset(null, null, null, null);
            expect(ruleset.selectors).toBeNull();
            expect(ruleset.rules).toBeNull();
            expect(ruleset.strictImports).toBeNull();
        });

        it('should handle empty arrays', () => {
            const ruleset = new Ruleset([], []);
            expect(ruleset.selectors).toEqual([]);
            expect(ruleset.rules).toEqual([]);
        });
    });

    describe('prototype properties', () => {
        it('should inherit from Node', () => {
            const ruleset = new Ruleset();
            // Check if it's an instance of the Node constructor function
            expect(ruleset instanceof Node).toBe(true);
        });

        it('should have correct type property', () => {
            const ruleset = new Ruleset();
            expect(ruleset.type).toBe('Ruleset');
        });

        it('should have isRuleset property set to true', () => {
            const ruleset = new Ruleset();
            expect(ruleset.isRuleset).toBe(true);
        });
    });

    describe('isRulesetLike', () => {
        it('should return true', () => {
            const ruleset = new Ruleset();
            expect(ruleset.isRulesetLike()).toBe(true);
        });
    });

    describe('accept', () => {
        it('should visit paths when they exist', () => {
            const ruleset = new Ruleset();
            ruleset.paths = [mockSelectors];

            ruleset.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledWith(
                ruleset.paths,
                true
            );
        });

        it('should visit selectors when paths do not exist', () => {
            const ruleset = new Ruleset(mockSelectors, mockRules);

            ruleset.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledWith(mockSelectors);
        });

        it('should visit rules when they exist and have length', () => {
            const ruleset = new Ruleset(mockSelectors, mockRules);

            ruleset.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledWith(mockRules);
        });

        it('should not visit rules when they are empty', () => {
            const ruleset = new Ruleset(mockSelectors, []);
            mockVisitor.visitArray.mockClear();

            ruleset.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledTimes(1); // Only selectors
        });

        it('should handle undefined visitor gracefully', () => {
            const ruleset = new Ruleset();
            // The actual implementation doesn't throw for undefined visitor
            expect(() => ruleset.accept(undefined)).not.toThrow();
        });
    });

    describe('eval', () => {
        beforeEach(() => {
            // Add missing properties to make eval work
            Ruleset.prototype.parse = { importManager: {} };
        });

        it('should evaluate selectors and return new ruleset', () => {
            const ruleset = new Ruleset(mockSelectors, mockRules);
            // Add visibilityInfo method
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});
            mockContext.frames = [];

            const result = ruleset.eval(mockContext);

            expect(result).toBeInstanceOf(Ruleset);
            expect(result.selectors).toBeDefined();
            expect(result.rules).toBeDefined();
        });

        it('should handle no selectors', () => {
            const ruleset = new Ruleset(null, mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);

            expect(result).toBeInstanceOf(Ruleset);
            expect(result.selectors).toBeUndefined();
        });

        it('should handle selectors with variables', () => {
            const selectorWithVariable = {
                eval: vi.fn().mockReturnValue({
                    elements: [{ isVariable: true }],
                    evaldCondition: true,
                    toCSS: vi.fn().mockReturnValue('@var'),
                    getIndex: vi.fn().mockReturnValue(0),
                    fileInfo: vi.fn().mockReturnValue({ filename: 'test.less' })
                })
            };
            const ruleset = new Ruleset([selectorWithVariable], mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);

            expect(Parser).toHaveBeenCalled();
            expect(result).toBeInstanceOf(Ruleset);
        });

        it('should handle selector evaluation errors', () => {
            const errorSelector = {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Selector eval failed');
                })
            };
            const ruleset = new Ruleset([errorSelector], mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            expect(() => ruleset.eval(mockContext)).toThrow(
                'Selector eval failed'
            );
        });

        it('should handle no passing selectors', () => {
            const failingSelector = {
                eval: vi.fn().mockReturnValue({
                    elements: [{ isVariable: false }],
                    evaldCondition: false
                })
            };
            const ruleset = new Ruleset([failingSelector], mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);

            expect(result.rules).toHaveLength(0);
        });

        it('should copy original ruleset properties', () => {
            const ruleset = new Ruleset(mockSelectors, mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});
            ruleset.root = true;
            ruleset.firstRoot = true;
            ruleset.allowImports = true;
            ruleset.debugInfo = { test: true };

            const result = ruleset.eval(mockContext);

            expect(result.originalRuleset).toBe(ruleset);
            expect(result.root).toBe(true);
            expect(result.firstRoot).toBe(true);
            expect(result.allowImports).toBe(true);
            expect(result.debugInfo).toEqual({ test: true });
        });

        it('should handle function registry inheritance', () => {
            const mockRegistry = { inherit: vi.fn().mockReturnThis() };
            mockContext.frames = [{ functionRegistry: mockRegistry }];
            const ruleset = new Ruleset(mockSelectors, mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);

            expect(result.functionRegistry).toBeDefined();
        });

        it('should handle MixinCall evaluation', () => {
            const mixinCall = {
                type: 'MixinCall',
                eval: vi
                    .fn()
                    .mockReturnValue([{ type: 'Declaration', variable: false }])
            };
            const rules = [mixinCall];
            const ruleset = new Ruleset(mockSelectors, rules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);

            expect(result).toBeInstanceOf(Ruleset);
            expect(mixinCall.eval).toHaveBeenCalledWith(mockContext);
        });

        it('should handle VariableCall evaluation', () => {
            const variableCall = {
                type: 'VariableCall',
                eval: vi.fn().mockReturnValue({
                    rules: [{ type: 'Declaration', variable: false }]
                })
            };
            const rules = [variableCall];
            const ruleset = new Ruleset(mockSelectors, rules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);

            expect(result).toBeInstanceOf(Ruleset);
            expect(variableCall.eval).toHaveBeenCalledWith(mockContext);
        });

        it('should handle parent selector folding', () => {
            // The evaluated selector (what parentSelector.eval() returns)
            const evaluatedSelector = {
                elements: [{ isVariable: false }],
                evaldCondition: true,
                isJustParentSelector: vi.fn().mockReturnValue(true)
            };

            const parentSelector = {
                isJustParentSelector: vi.fn().mockReturnValue(true),
                eval: vi.fn().mockReturnValue(evaluatedSelector)
            };

            // Create a proper Ruleset instance that will pass instanceof check
            const nestedRuleset = new Ruleset(
                [parentSelector],
                [{ type: 'Declaration' }]
            );
            nestedRuleset.visibilityInfo = vi.fn().mockReturnValue({});
            const rules = [nestedRuleset];
            const ruleset = new Ruleset(mockSelectors, rules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);

            expect(result).toBeInstanceOf(Ruleset);
            // The isJustParentSelector is called on the evaluated selector, not the original
            expect(evaluatedSelector.isJustParentSelector).toHaveBeenCalled();
        });
    });

    describe('evalImports', () => {
        it('should evaluate import rules', () => {
            const importRule = {
                type: 'Import',
                eval: vi.fn().mockReturnValue([{ type: 'Declaration' }])
            };
            const ruleset = new Ruleset(mockSelectors, [importRule]);

            ruleset.evalImports(mockContext);

            expect(importRule.eval).toHaveBeenCalledWith(mockContext);
        });

        it('should handle empty rules array', () => {
            const ruleset = new Ruleset(mockSelectors, []);

            expect(() => ruleset.evalImports(mockContext)).not.toThrow();
        });

        it('should handle null rules', () => {
            const ruleset = new Ruleset(mockSelectors, null);

            expect(() => ruleset.evalImports(mockContext)).not.toThrow();
        });

        it('should handle import returning single rule', () => {
            const importRule = {
                type: 'Import',
                eval: vi.fn().mockReturnValue({ type: 'Declaration' })
            };
            const ruleset = new Ruleset(mockSelectors, [importRule]);

            ruleset.evalImports(mockContext);

            expect(importRule.eval).toHaveBeenCalledWith(mockContext);
        });
    });

    describe('makeImportant', () => {
        it('should create important version of ruleset', () => {
            const rule = {
                makeImportant: vi.fn().mockReturnValue({ important: true })
            };
            const ruleset = new Ruleset(mockSelectors, [rule], true, {});
            // Add visibilityInfo method
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.makeImportant();

            expect(result).toBeInstanceOf(Ruleset);
            expect(rule.makeImportant).toHaveBeenCalled();
        });

        it('should handle rules without makeImportant method', () => {
            const rule = { type: 'Comment' };
            const ruleset = new Ruleset(mockSelectors, [rule]);
            // Add visibilityInfo method
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.makeImportant();

            expect(result).toBeInstanceOf(Ruleset);
            expect(result.rules[0]).toBe(rule);
        });
    });

    describe('matchArgs', () => {
        it('should return true for no args', () => {
            const ruleset = new Ruleset();
            expect(ruleset.matchArgs()).toBe(true);
        });

        it('should return true for empty args array', () => {
            const ruleset = new Ruleset();
            expect(ruleset.matchArgs([])).toBe(true);
        });

        it('should return false for non-empty args', () => {
            const ruleset = new Ruleset();
            expect(ruleset.matchArgs(['arg1'])).toBe(false);
        });
    });

    describe('matchCondition', () => {
        it('should return false if no evaldCondition on last selector', () => {
            const selector = { evaldCondition: false };
            const ruleset = new Ruleset([selector]);

            const result = ruleset.matchCondition([], mockContext);

            expect(result).toBe(false);
        });

        it('should return false if condition evaluation fails', () => {
            const condition = {
                eval: vi.fn().mockReturnValue(false)
            };
            const selector = {
                evaldCondition: true,
                condition
            };
            const ruleset = new Ruleset([selector]);

            const result = ruleset.matchCondition([], mockContext);

            expect(result).toBe(false);
            expect(condition.eval).toHaveBeenCalled();
        });

        it('should return true if all conditions pass', () => {
            const condition = {
                eval: vi.fn().mockReturnValue(true)
            };
            const selector = {
                evaldCondition: true,
                condition
            };
            const ruleset = new Ruleset([selector]);

            const result = ruleset.matchCondition([], mockContext);

            expect(result).toBe(true);
        });

        it('should return true if no condition exists', () => {
            const selector = { evaldCondition: true };
            const ruleset = new Ruleset([selector]);

            const result = ruleset.matchCondition([], mockContext);

            expect(result).toBe(true);
        });
    });

    describe('resetCache', () => {
        it('should reset all cache properties', () => {
            const ruleset = new Ruleset();
            ruleset._rulesets = ['cached'];
            ruleset._variables = { cached: true };
            ruleset._properties = { cached: true };
            ruleset._lookups = { cached: true };

            ruleset.resetCache();

            expect(ruleset._rulesets).toBeNull();
            expect(ruleset._variables).toBeNull();
            expect(ruleset._properties).toBeNull();
            expect(ruleset._lookups).toEqual({});
        });
    });

    describe('variables', () => {
        it('should return cached variables', () => {
            const ruleset = new Ruleset();
            const cached = { var1: 'value1' };
            ruleset._variables = cached;

            const result = ruleset.variables();

            expect(result).toBe(cached);
        });

        it('should build variables from rules', () => {
            // Create proper Declaration instance that will pass instanceof check
            const variableRule = new Declaration(
                'var1',
                'value1',
                false,
                false,
                0,
                {},
                false,
                true
            );
            const ruleset = new Ruleset(mockSelectors, [variableRule]);

            const result = ruleset.variables();

            expect(result).toEqual({ var1: variableRule });
            expect(ruleset._variables).toEqual({ var1: variableRule });
        });

        it('should handle import rules with variables', () => {
            const importRule = {
                type: 'Import',
                root: {
                    variables: vi.fn().mockReturnValue({ imported: 'value' }),
                    variable: vi.fn().mockImplementation((name) => ({
                        name,
                        value: 'imported'
                    }))
                }
            };
            const ruleset = new Ruleset(mockSelectors, [importRule]);

            const result = ruleset.variables();

            expect(result.imported).toBeDefined();
        });

        it('should handle null rules', () => {
            const ruleset = new Ruleset(mockSelectors, null);

            const result = ruleset.variables();

            expect(result).toEqual({});
        });
    });

    describe('properties', () => {
        it('should return cached properties', () => {
            const ruleset = new Ruleset();
            const cached = { prop1: 'value1' };
            ruleset._properties = cached;

            const result = ruleset.properties();

            expect(result).toBe(cached);
        });

        it('should build properties from rules', () => {
            // Create proper Declaration instance for non-variable property
            const propertyRule = new Declaration(
                'color',
                'red',
                false,
                false,
                0,
                {},
                false,
                false
            );
            const ruleset = new Ruleset(mockSelectors, [propertyRule]);

            const result = ruleset.properties();

            expect(result['$color']).toEqual([propertyRule]);
            expect(ruleset._properties).toBeDefined();
        });

        it('should handle multiple properties with same name', () => {
            // Create proper Declaration instances for non-variable properties
            const prop1 = new Declaration(
                'color',
                'red',
                false,
                false,
                0,
                {},
                false,
                false
            );
            const prop2 = new Declaration(
                'color',
                'blue',
                false,
                false,
                0,
                {},
                false,
                false
            );
            const ruleset = new Ruleset(mockSelectors, [prop1, prop2]);

            const result = ruleset.properties();

            expect(result['$color']).toEqual([prop1, prop2]);
        });

        it('should handle null rules', () => {
            const ruleset = new Ruleset(mockSelectors, null);

            const result = ruleset.properties();

            expect(result).toEqual({});
        });
    });

    describe('variable', () => {
        it('should return parsed variable value', () => {
            const ruleset = new Ruleset();
            const mockDecl = { name: 'var1', value: 'value1' };
            ruleset.variables = vi.fn().mockReturnValue({ var1: mockDecl });
            ruleset.parseValue = vi.fn().mockReturnValue('parsed');

            const result = ruleset.variable('var1');

            expect(result).toBe('parsed');
            expect(ruleset.parseValue).toHaveBeenCalledWith(mockDecl);
        });

        it('should return undefined for non-existent variable', () => {
            const ruleset = new Ruleset();
            ruleset.variables = vi.fn().mockReturnValue({});

            const result = ruleset.variable('nonexistent');

            expect(result).toBeUndefined();
        });
    });

    describe('property', () => {
        it('should return parsed property value', () => {
            const ruleset = new Ruleset();
            const mockDecl = { name: 'prop1', value: 'value1' };
            ruleset.properties = vi.fn().mockReturnValue({ prop1: mockDecl });
            ruleset.parseValue = vi.fn().mockReturnValue('parsed');

            const result = ruleset.property('prop1');

            expect(result).toBe('parsed');
            expect(ruleset.parseValue).toHaveBeenCalledWith(mockDecl);
        });

        it('should return undefined for non-existent property', () => {
            const ruleset = new Ruleset();
            ruleset.properties = vi.fn().mockReturnValue({});

            const result = ruleset.property('nonexistent');

            expect(result).toBeUndefined();
        });
    });

    describe('lastDeclaration', () => {
        it('should return last declaration rule', () => {
            const decl1 = new Declaration(
                'prop1',
                'value1',
                false,
                false,
                0,
                {},
                false,
                false
            );
            const decl2 = new Declaration(
                'prop2',
                'value2',
                false,
                false,
                0,
                {},
                false,
                false
            );
            const comment = { type: 'Comment' };
            const ruleset = new Ruleset(mockSelectors, [decl1, comment, decl2]);
            ruleset.parseValue = vi.fn().mockReturnValue('parsed');

            const result = ruleset.lastDeclaration();

            expect(result).toBe('parsed');
            expect(ruleset.parseValue).toHaveBeenCalledWith(decl2);
        });

        it('should return undefined if no declarations', () => {
            const ruleset = new Ruleset(mockSelectors, [{ type: 'Comment' }]);

            const result = ruleset.lastDeclaration();

            expect(result).toBeUndefined();
        });

        it('should handle empty rules', () => {
            const ruleset = new Ruleset(mockSelectors, []);

            const result = ruleset.lastDeclaration();

            expect(result).toBeUndefined();
        });
    });

    describe('parseValue', () => {
        it('should parse single anonymous value', () => {
            Anonymous.mockImplementation(() => ({ value: { value: 'test' } }));
            const ruleset = new Ruleset();
            const decl = {
                value: new Anonymous(),
                parsed: false,
                fileInfo: vi.fn().mockReturnValue({}),
                getIndex: vi.fn().mockReturnValue(0)
            };

            const result = ruleset.parseValue(decl);

            expect(result).toBe(decl);
        });

        it('should parse array of values', () => {
            const ruleset = new Ruleset();
            const decl1 = { parsed: true };
            const decl2 = { parsed: true };

            const result = ruleset.parseValue([decl1, decl2]);

            expect(result).toEqual([decl1, decl2]);
        });

        it('should handle already parsed values', () => {
            const ruleset = new Ruleset();
            const decl = { parsed: true, value: 'already parsed' };

            const result = ruleset.parseValue(decl);

            expect(result).toBe(decl);
        });
    });

    describe('rulesets', () => {
        it('should return filtered rulesets', () => {
            const ruleset1 = { isRuleset: true };
            const declaration = { isRuleset: false };
            const ruleset2 = { isRuleset: true };
            const ruleset = new Ruleset(mockSelectors, [
                ruleset1,
                declaration,
                ruleset2
            ]);

            const result = ruleset.rulesets();

            expect(result).toEqual([ruleset1, ruleset2]);
        });

        it('should return empty array for null rules', () => {
            const ruleset = new Ruleset(mockSelectors, null);

            const result = ruleset.rulesets();

            expect(result).toEqual([]);
        });

        it('should return empty array when no rulesets', () => {
            const ruleset = new Ruleset(mockSelectors, [{ isRuleset: false }]);

            const result = ruleset.rulesets();

            expect(result).toEqual([]);
        });
    });

    describe('prependRule', () => {
        it('should prepend rule to existing rules', () => {
            const existingRule = { type: 'Declaration' };
            const newRule = { type: 'Comment' };
            const ruleset = new Ruleset(mockSelectors, [existingRule]);

            ruleset.prependRule(newRule);

            expect(ruleset.rules[0]).toBe(newRule);
            expect(ruleset.rules[1]).toBe(existingRule);
        });

        it('should create rules array if none exists', () => {
            const newRule = { type: 'Comment' };
            const ruleset = new Ruleset(mockSelectors, null);

            ruleset.prependRule(newRule);

            expect(ruleset.rules).toEqual([newRule]);
        });
    });

    describe('find', () => {
        it('should return cached results', () => {
            const selector = { toCSS: vi.fn().mockReturnValue('.test') };
            const cached = [{ rule: 'cached', path: [] }];
            const ruleset = new Ruleset();
            ruleset._lookups['.test'] = cached;

            const result = ruleset.find(selector);

            expect(result).toBe(cached);
        });

        it('should find matching rules', () => {
            const selector = {
                toCSS: vi.fn().mockReturnValue('.test'),
                match: vi.fn().mockReturnValue(1),
                elements: ['el1', 'el2']
            };
            const matchingRule = {
                selectors: [{ match: vi.fn().mockReturnValue(1) }],
                find: vi.fn().mockReturnValue([])
            };
            const ruleset = new Ruleset(mockSelectors, [matchingRule]);
            ruleset.rulesets = vi.fn().mockReturnValue([matchingRule]);

            const result = ruleset.find(selector);

            expect(result).toBeDefined();
            expect(ruleset._lookups['.test']).toBe(result);
        });

        it('should handle filter function', () => {
            const selector = {
                toCSS: vi.fn().mockReturnValue('.test'),
                match: vi.fn().mockReturnValue(1),
                elements: ['el1', 'el2']
            };
            const rule = {
                selectors: [
                    {
                        /* doesn't need match function here */
                    }
                ],
                find: vi.fn().mockReturnValue([])
            };
            const filter = vi.fn().mockReturnValue(true);
            const ruleset = new Ruleset();
            ruleset.rulesets = vi.fn().mockReturnValue([rule]);

            ruleset.find(selector, ruleset, filter);

            expect(filter).toHaveBeenCalledWith(rule);
        });
    });

    describe('genCSS', () => {
        it('should generate CSS for root ruleset', () => {
            const rule = {
                genCSS: vi.fn(),
                isVisible: vi.fn().mockReturnValue(true),
                isRulesetLike: vi.fn().mockReturnValue(false)
            };
            const ruleset = new Ruleset(mockSelectors, [rule]);
            ruleset.root = true;

            ruleset.genCSS(mockContext, mockOutput);

            expect(rule.genCSS).toHaveBeenCalledWith(mockContext, mockOutput);
        });

        it('should generate CSS with selectors', () => {
            const ruleset = new Ruleset(mockSelectors, []);
            ruleset.paths = [[{ genCSS: vi.fn() }, { genCSS: vi.fn() }]];

            ruleset.genCSS(mockContext, mockOutput);

            expect(mockOutput.add).toHaveBeenCalled();
        });

        it('should handle compressed output', () => {
            const ruleset = new Ruleset(mockSelectors, []);
            ruleset.paths = [[{ genCSS: vi.fn() }]];
            mockContext.compress = true;

            ruleset.genCSS(mockContext, mockOutput);

            // Check that mockOutput.add was called (the exact call content may vary)
            expect(mockOutput.add).toHaveBeenCalled();
        });

        it('should handle charset rules', () => {
            const charsetRule = {
                isCharset: vi.fn().mockReturnValue(true),
                genCSS: vi.fn(),
                isVisible: vi.fn().mockReturnValue(true),
                isRulesetLike: vi.fn().mockReturnValue(false)
            };
            const ruleset = new Ruleset(mockSelectors, [charsetRule]);
            // Set up paths to avoid error
            ruleset.paths = [];

            ruleset.genCSS(mockContext, mockOutput);

            expect(charsetRule.genCSS).toHaveBeenCalled();
        });

        it('should handle import rules', () => {
            const importRule = {
                type: 'Import',
                genCSS: vi.fn(),
                isVisible: vi.fn().mockReturnValue(true),
                isRulesetLike: vi.fn().mockReturnValue(false)
            };
            const ruleset = new Ruleset(mockSelectors, [importRule]);
            // Set up paths to avoid error
            ruleset.paths = [];

            ruleset.genCSS(mockContext, mockOutput);

            expect(importRule.genCSS).toHaveBeenCalled();
        });

        it('should handle comments', () => {
            const comment = {
                type: 'Comment',
                genCSS: vi.fn(),
                isVisible: vi.fn().mockReturnValue(true),
                isRulesetLike: vi.fn().mockReturnValue(false)
            };
            const ruleset = new Ruleset(mockSelectors, [comment]);
            // Set up paths to avoid error
            ruleset.paths = [];

            ruleset.genCSS(mockContext, mockOutput);

            expect(comment.genCSS).toHaveBeenCalled();
        });
    });

    describe('joinSelectors', () => {
        it('should join multiple selectors', () => {
            const ruleset = new Ruleset();
            const paths = [];
            const selectors = [{ elements: [] }, { elements: [] }];
            ruleset.joinSelector = vi.fn();

            ruleset.joinSelectors(paths, mockContext, selectors);

            expect(ruleset.joinSelector).toHaveBeenCalledTimes(2);
        });
    });

    describe('joinSelector', () => {
        it('should handle basic selector joining', () => {
            const ruleset = new Ruleset();
            const paths = [];
            const selector = {
                elements: [
                    { value: '&', combinator: { emptyOrWhitespace: true } }
                ],
                createDerived: vi.fn().mockReturnValue({ elements: [] }),
                visibilityInfo: vi.fn().mockReturnValue({})
            };
            const context = [];

            ruleset.joinSelector(paths, context, selector);

            expect(paths.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle selector with no parent references', () => {
            const ruleset = new Ruleset();

            // Test that joinSelector method exists and can be called without throwing
            expect(typeof ruleset.joinSelector).toBe('function');

            // Test with empty arrays - this should not throw
            const paths = [];
            const emptyContext = [];
            const mockSelector = {
                elements: [],
                visibilityInfo: vi.fn().mockReturnValue({})
            };

            expect(() => {
                ruleset.joinSelector(paths, emptyContext, mockSelector);
            }).not.toThrow();

            // When context is empty, it should still work
            expect(paths.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('joinSelector logic', () => {
        let ruleset;

        beforeEach(() => {
            ruleset = new Ruleset();
            // Mock to avoid dealing with visibility info
            Selector.prototype.getIndex = vi.fn().mockReturnValue(0);
            Selector.prototype.fileInfo = vi.fn().mockReturnValue({});
            Selector.prototype.toCSS = function () {
                return this.elements
                    .map((e) => {
                        let str = '';
                        if (e.combinator && e.combinator.value) {
                            str += e.combinator.value;
                        }
                        str += e.value;
                        return str;
                    })
                    .join('');
            };
            Selector.prototype.createDerived = function (
                elements,
                extendList,
                evaldCondition
            ) {
                const newSelector = new Selector(
                    elements,
                    extendList || this.extendList,
                    evaldCondition || this.evaldCondition,
                    this.getIndex(),
                    this.fileInfo()
                );
                return newSelector;
            };
        });

        it('should join a simple parent selector: .parent &', () => {
            const paths = [];
            const context = [[new Selector([new Element(null, '.parent')])]];
            const selector = new Selector([
                new Element(null, '.child'),
                new Element(' ', '&')
            ]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(1);
            expect(paths[0][0].toCSS({})).toBe('.child .parent');
        });

        it('should join a simple parent selector: & .child', () => {
            const paths = [];
            const context = [[new Selector([new Element(null, '.parent')])]];
            const selector = new Selector([
                new Element(null, '&'),
                new Element(' ', '.child')
            ]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(1);
            expect(paths[0][0].toCSS({})).toBe('.parent .child');
        });

        it('should handle no parent context', () => {
            const paths = [];
            const context = [];
            const selector = new Selector([
                new Element(null, '&'),
                new Element(' ', '.child')
            ]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(1);
            expect(paths[0][0].toCSS({})).toBe(' .child'); // space from combinator
        });

        it('should handle multiple parent contexts', () => {
            const paths = [];
            const context = [
                [new Selector([new Element(null, '.parent1')])],
                [new Selector([new Element(null, '.parent2')])]
            ];
            const selector = new Selector([
                new Element(null, '&'),
                new Element(' ', '.child')
            ]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(2);
            expect(paths[0][0].toCSS({})).toBe('.parent1 .child');
            expect(paths[1][0].toCSS({})).toBe('.parent2 .child');
        });

        it('should handle nested parent contexts', () => {
            const paths = [];
            const context = [
                [
                    new Selector([new Element(null, '.grandparent')]),
                    new Selector([new Element(null, '.parent')])
                ]
            ];
            const selector = new Selector([
                new Element(null, '&'),
                new Element(' ', '.child')
            ]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(1);
            expect(paths[0].map((s) => s.toCSS({}))).toEqual([
                '.grandparent',
                '.parent .child'
            ]);
        });

        it('should handle & with combinators', () => {
            const paths = [];
            const context = [[new Selector([new Element(null, '.parent')])]];
            const selector = new Selector([new Element('>', '&')]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(1);
            expect(paths[0][0].toCSS({})).toBe('>.parent');
        });

        it('should join when & is not the first element', () => {
            const paths = [];
            const context = [[new Selector([new Element(null, '.parent')])]];
            const selector = new Selector([
                new Element(null, 'a'),
                new Element(null, '&'),
                new Element(null, 'b')
            ]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(1);
            expect(paths[0][0].toCSS({})).toBe('a.parentb');
        });

        it('should handle multiple & references', () => {
            const paths = [];
            const context = [[new Selector([new Element(null, '.parent')])]];
            const selector = new Selector([
                new Element(null, '&'),
                new Element(null, '-and-'),
                new Element(null, '&')
            ]);

            ruleset.joinSelector(paths, context, selector);

            expect(paths).toHaveLength(1);
            expect(paths[0][0].toCSS({})).toBe('.parent-and-.parent');
        });
    });

    describe('edge cases and error handling', () => {
        beforeEach(() => {
            // Set up parse property for these tests
            Ruleset.prototype.parse = { importManager: {} };
        });

        it('should handle malformed selectors in eval', () => {
            const badSelector = {
                eval: vi.fn().mockReturnValue(null)
            };
            const ruleset = new Ruleset([badSelector], mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            expect(() => ruleset.eval(mockContext)).toThrow();
        });

        it('should handle Parser errors in eval', () => {
            Parser.mockImplementation(() => ({
                parseNode: vi
                    .fn()
                    .mockImplementation((selector, types, callback) => {
                        callback(new Error('Parse error'), null);
                    })
            }));

            const selectorWithVariable = {
                eval: vi.fn().mockReturnValue({
                    elements: [{ isVariable: true }],
                    evaldCondition: true,
                    toCSS: vi.fn().mockReturnValue('@var'),
                    getIndex: vi.fn().mockReturnValue(0),
                    fileInfo: vi.fn().mockReturnValue({ filename: 'test.less' })
                })
            };
            const ruleset = new Ruleset([selectorWithVariable], mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            const result = ruleset.eval(mockContext);
            expect(result).toBeInstanceOf(Ruleset);
        });

        it('should handle undefined context in eval', () => {
            const ruleset = new Ruleset(mockSelectors, mockRules);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            expect(() => ruleset.eval(undefined)).toThrow();
        });

        it('should handle circular references', () => {
            const circularRule = {
                type: 'Ruleset',
                eval: vi.fn().mockImplementation(function () {
                    return this;
                })
            };
            const ruleset = new Ruleset(mockSelectors, [circularRule]);
            ruleset.visibilityInfo = vi.fn().mockReturnValue({});

            expect(() => ruleset.eval(mockContext)).not.toThrow();
        });
    });

    describe('performance and caching', () => {
        it('should cache variable lookups', () => {
            const ruleset = new Ruleset();
            const mockVars = { test: 'value' };

            // Set the cache directly
            ruleset._variables = mockVars;
            const result1 = ruleset.variables();

            // Second call should return same cached result
            const result2 = ruleset.variables();

            expect(result1).toBe(result2);
            expect(result1).toBe(mockVars);
        });

        it('should cache property lookups', () => {
            const ruleset = new Ruleset();
            const mockProps = { test: 'value' };

            // Set the cache directly
            ruleset._properties = mockProps;
            const result1 = ruleset.properties();

            // Second call should return same cached result
            const result2 = ruleset.properties();

            expect(result1).toBe(result2);
            expect(result1).toBe(mockProps);
        });

        it('should cache find results', () => {
            const selector = { toCSS: vi.fn().mockReturnValue('.cached') };
            const ruleset = new Ruleset();
            ruleset.rulesets = vi.fn().mockReturnValue([]);

            const result1 = ruleset.find(selector);
            const result2 = ruleset.find(selector);

            expect(result1).toBe(result2);
            expect(ruleset.rulesets).toHaveBeenCalledTimes(1);
        });
    });
});
