import { describe, it, expect, beforeEach, vi } from 'vitest';
import Definition from './mixin-definition';
import Selector from './selector';
import Element from './element';
import Ruleset from './ruleset';
import Declaration from './declaration';
import DetachedRuleset from './detached-ruleset';
import Expression from './expression';
import contexts from '../contexts';
import * as utils from '../utils';

// Mock dependencies
vi.mock('./selector', () => ({
    default: vi
        .fn()
        .mockImplementation(function (
            elements,
            extendList,
            condition,
            index,
            fileInfo
        ) {
            this.elements = elements || [];
            this.extendList = extendList;
            this.condition = condition;
            this._index = index;
            this._fileInfo = fileInfo;
            this.eval = vi.fn().mockReturnThis();
            this.toCSS = vi.fn().mockReturnValue('.test');
            this.getIndex = vi.fn().mockReturnValue(index || 0);
            this.fileInfo = vi.fn().mockReturnValue(fileInfo || {});
        })
}));

vi.mock('./element', () => ({
    default: vi
        .fn()
        .mockImplementation(function (
            combinator,
            value,
            isVariable,
            index,
            fileInfo
        ) {
            this.combinator = combinator;
            this.value = value;
            this.isVariable = isVariable;
            this._index = index;
            this._fileInfo = fileInfo;
            this.eval = vi.fn().mockReturnThis();
        })
}));

vi.mock('./ruleset', () => ({
    default: vi
        .fn()
        .mockImplementation(function (selectors, rules, strictImports) {
            this.selectors = selectors;
            this.rules = rules;
            this.strictImports = strictImports;
            this.functionRegistry = null;
            this.prependRule = vi.fn();
            this.resetCache = vi.fn();
            this.eval = vi.fn().mockReturnThis();
            this.makeImportant = vi.fn().mockReturnThis();
            this.copyVisibilityInfo = vi.fn();
            this.originalRuleset = null;
        })
}));

vi.mock('./declaration', () => ({
    default: vi
        .fn()
        .mockImplementation(function (
            name,
            value,
            important,
            merge,
            index,
            fileInfo,
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
            this._fileInfo = fileInfo;
            this.eval = vi.fn().mockReturnThis();
        })
}));

vi.mock('./detached-ruleset', () => ({
    default: vi.fn().mockImplementation(function (ruleset) {
        this.ruleset = ruleset;
        this.eval = vi.fn().mockReturnThis();
    })
}));

vi.mock('./expression', () => ({
    default: vi.fn().mockImplementation(function (value) {
        this.value = value;
        this.eval = vi.fn().mockReturnThis();
    })
}));

vi.mock('../contexts', () => ({
    default: {
        Eval: vi.fn().mockImplementation(function (options, frames) {
            this.frames = frames || [];
            this.importantScope = options?.importantScope || [];
            Object.assign(this, options);
        })
    }
}));

vi.mock('../utils', () => ({
    copyArray: vi.fn().mockImplementation((arr) => (arr ? [...arr] : []))
}));

describe('Definition (MixinDefinition)', () => {
    let mockParams;
    let mockRules;
    let mockCondition;
    let mockFrames;
    let mockVisibilityInfo;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup common mocks
        mockParams = [
            { name: 'param1', value: null },
            {
                name: 'param2',
                value: { eval: vi.fn().mockReturnValue('default') }
            },
            { name: null, value: { eval: vi.fn().mockReturnValue('pattern') } }
        ];

        mockRules = [
            { type: 'Declaration', name: 'color', value: 'red' },
            { type: 'Ruleset', rules: [] }
        ];

        mockCondition = {
            eval: vi.fn().mockReturnValue(true)
        };

        mockFrames = [
            {
                functionRegistry: {
                    inherit: vi
                        .fn()
                        .mockReturnValue({ inherit: vi.fn().mockReturnThis() })
                }
            }
        ];

        mockVisibilityInfo = { visible: true };
    });

    describe('constructor', () => {
        it('should create a basic mixin definition with all parameters', () => {
            const definition = new Definition(
                'test-mixin',
                mockParams,
                mockRules,
                mockCondition,
                true,
                mockFrames,
                mockVisibilityInfo
            );

            expect(definition.name).toBe('test-mixin');
            expect(definition.params).toBe(mockParams);
            expect(definition.rules).toBe(mockRules);
            expect(definition.condition).toBe(mockCondition);
            expect(definition.variadic).toBe(true);
            expect(definition.frames).toBe(mockFrames);
            expect(definition.arity).toBe(3);
            expect(definition._lookups).toEqual({});
            expect(definition.allowRoot).toBe(true);
        });

        it('should create a mixin with default name when name is null', () => {
            const definition = new Definition(null, mockParams, mockRules);

            expect(definition.name).toBe('anonymous mixin');
        });

        it('should create a mixin with default name when name is undefined', () => {
            const definition = new Definition(undefined, mockParams, mockRules);

            expect(definition.name).toBe('anonymous mixin');
        });

        it('should create selectors array with single selector', () => {
            const definition = new Definition(
                'test-mixin',
                mockParams,
                mockRules
            );

            expect(definition.selectors).toHaveLength(1);
            expect(Selector).toHaveBeenCalledWith(
                [expect.any(Object)] // Element instance only
            );
            expect(Element).toHaveBeenCalledWith(
                null, // combinator
                'test-mixin', // value
                false, // isVariable
                definition._index,
                definition._fileInfo
            );
        });

        it('should correctly calculate required parameters count', () => {
            const paramsWithRequired = [
                { name: 'required1', value: null },
                { name: 'required2', value: undefined },
                { name: 'optional1', value: { eval: vi.fn() } },
                { name: 'optional2', value: { eval: vi.fn() } }
            ];

            const definition = new Definition(
                'test',
                paramsWithRequired,
                mockRules
            );

            expect(definition.required).toBe(2);
            expect(definition.optionalParameters).toEqual([
                'optional1',
                'optional2'
            ]);
        });

        it('should handle unnamed parameters in required count', () => {
            const paramsWithUnnamed = [
                { name: null, value: null },
                { name: undefined, value: null },
                { name: 'named', value: null }
            ];

            const definition = new Definition(
                'test',
                paramsWithUnnamed,
                mockRules
            );

            expect(definition.required).toBe(3);
            expect(definition.optionalParameters).toEqual([]);
        });

        it('should handle empty parameters array', () => {
            const definition = new Definition('test', [], mockRules);

            expect(definition.arity).toBe(0);
            expect(definition.required).toBe(0);
            expect(definition.optionalParameters).toEqual([]);
        });

        it('should throw error when params is null', () => {
            expect(() => {
                new Definition('test', null, mockRules);
            }).toThrow();
        });

        it('should inherit from Ruleset', () => {
            const definition = new Definition('test', mockParams, mockRules);

            expect(definition).toBeInstanceOf(Ruleset);
        });

        it('should have correct type and evalFirst properties', () => {
            const definition = new Definition('test', mockParams, mockRules);

            expect(definition.type).toBe('MixinDefinition');
            expect(definition.evalFirst).toBe(true);
        });

        it('should copy visibility info', () => {
            const definition = new Definition(
                'test',
                mockParams,
                mockRules,
                mockCondition,
                false,
                mockFrames,
                mockVisibilityInfo
            );

            expect(definition.copyVisibilityInfo).toHaveBeenCalledWith(
                mockVisibilityInfo
            );
        });
    });

    describe('accept', () => {
        let mockVisitor;
        let definition;

        beforeEach(() => {
            mockVisitor = {
                visitArray: vi.fn().mockImplementation((arr) => arr),
                visit: vi.fn().mockImplementation((node) => node)
            };
            definition = new Definition(
                'test',
                mockParams,
                mockRules,
                mockCondition
            );
        });

        it('should visit params when they exist and have length', () => {
            definition.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledWith(mockParams);
        });

        it('should visit rules', () => {
            definition.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledWith(mockRules);
        });

        it('should visit condition when it exists', () => {
            definition.accept(mockVisitor);

            expect(mockVisitor.visit).toHaveBeenCalledWith(mockCondition);
        });

        it('should not visit params when they are null', () => {
            definition.params = null;
            definition.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledTimes(1); // Only rules
        });

        it('should not visit params when they are empty', () => {
            definition.params = [];
            definition.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledTimes(1); // Only rules
        });

        it('should not visit condition when it is null', () => {
            definition.condition = null;
            definition.accept(mockVisitor);

            expect(mockVisitor.visit).not.toHaveBeenCalled();
        });

        it('should update params from visitor result', () => {
            const newParams = [{ name: 'new-param' }];
            mockVisitor.visitArray.mockReturnValueOnce(newParams);

            definition.accept(mockVisitor);

            expect(definition.params).toBe(newParams);
        });

        it('should update rules from visitor result', () => {
            const newRules = [{ name: 'new-rule' }];
            mockVisitor.visitArray
                .mockReturnValueOnce(mockParams)
                .mockReturnValueOnce(newRules);

            definition.accept(mockVisitor);

            expect(definition.rules).toBe(newRules);
        });

        it('should update condition from visitor result', () => {
            const newCondition = { eval: vi.fn() };
            mockVisitor.visit.mockReturnValue(newCondition);

            definition.accept(mockVisitor);

            expect(definition.condition).toBe(newCondition);
        });
    });

    describe('evalParams', () => {
        let definition;
        let mockContext;
        let mockMixinEnv;
        let mockArgs;
        let mockEvaldArguments;

        beforeEach(() => {
            definition = new Definition('test', mockParams, mockRules);
            mockContext = {
                frames: []
            };
            mockMixinEnv = {
                frames: mockFrames
            };
            mockArgs = [
                {
                    name: null,
                    value: { eval: vi.fn().mockReturnValue('value1') }
                },
                {
                    name: 'param2',
                    value: { eval: vi.fn().mockReturnValue('value2') }
                }
            ];
            mockEvaldArguments = [];
        });

        it('should create new frame and eval context', () => {
            const result = definition.evalParams(
                mockContext,
                mockMixinEnv,
                mockArgs,
                mockEvaldArguments
            );

            expect(result).toBeInstanceOf(Ruleset);
            expect(contexts.Eval).toHaveBeenCalledWith(
                mockMixinEnv,
                [result].concat(mockMixinEnv.frames)
            );
        });

        it('should inherit function registry from mixin environment', () => {
            const result = definition.evalParams(
                mockContext,
                mockMixinEnv,
                mockArgs,
                mockEvaldArguments
            );

            expect(result.functionRegistry).toBeDefined();
        });

        it('should handle named arguments', () => {
            const namedArgs = [
                {
                    name: 'param1',
                    value: { eval: vi.fn().mockReturnValue('named-value') }
                }
            ];

            definition.evalParams(
                mockContext,
                mockMixinEnv,
                namedArgs,
                mockEvaldArguments
            );

            expect(mockEvaldArguments[0]).toBe('named-value');
            expect(Declaration).toHaveBeenCalledWith('param1', 'named-value');
        });

        it('should throw error for unknown named arguments', () => {
            const badNamedArgs = [
                { name: 'unknown-param', value: { eval: vi.fn() } }
            ];

            expect(() => {
                definition.evalParams(
                    mockContext,
                    mockMixinEnv,
                    badNamedArgs,
                    mockEvaldArguments
                );
            }).toThrow('Named argument for test unknown-param not found');
        });

        it('should handle positional arguments', () => {
            const positionalArgs = [
                { value: { eval: vi.fn().mockReturnValue('pos-value1') } },
                { value: { eval: vi.fn().mockReturnValue('pos-value2') } }
            ];

            definition.evalParams(
                mockContext,
                mockMixinEnv,
                positionalArgs,
                mockEvaldArguments
            );

            expect(mockEvaldArguments[0]).toBe('pos-value1');
            expect(Declaration).toHaveBeenCalledWith('param1', 'pos-value1');
        });

        it('should handle variadic parameters', () => {
            const variadicParams = [{ name: 'args', variadic: true }];
            const variadicDefinition = new Definition(
                'test',
                variadicParams,
                mockRules
            );
            const variadicArgs = [
                { value: { eval: vi.fn().mockReturnValue('var1') } },
                { value: { eval: vi.fn().mockReturnValue('var2') } },
                { value: { eval: vi.fn().mockReturnValue('var3') } }
            ];

            variadicDefinition.evalParams(
                mockContext,
                mockMixinEnv,
                variadicArgs,
                []
            );

            expect(Expression).toHaveBeenCalledWith(['var1', 'var2', 'var3']);
        });

        it('should use default parameter values', () => {
            const defaultValue = {
                eval: vi.fn().mockReturnValue('default-val')
            };
            const paramsWithDefault = [{ name: 'param1', value: defaultValue }];
            const defWithDefault = new Definition(
                'test',
                paramsWithDefault,
                mockRules
            );

            defWithDefault.evalParams(mockContext, mockMixinEnv, [], []);

            expect(defaultValue.eval).toHaveBeenCalledWith(expect.any(Object));
        });

        it('should handle detached ruleset values', () => {
            const detachedValue = [{ type: 'rule' }];
            const argsWithDetached = [{ value: detachedValue }];

            definition.evalParams(
                mockContext,
                mockMixinEnv,
                argsWithDetached,
                mockEvaldArguments
            );

            expect(DetachedRuleset).toHaveBeenCalledWith(expect.any(Ruleset));
        });

        it('should throw error for missing required arguments', () => {
            const requiredParams = [
                { name: 'required1', value: null },
                { name: 'required2', value: null }
            ];
            const reqDefinition = new Definition(
                'test',
                requiredParams,
                mockRules
            );

            expect(() => {
                reqDefinition.evalParams(mockContext, mockMixinEnv, [], []);
            }).toThrow('wrong number of arguments for test (0 for 2)');
        });

        it('should reset cache when using default values', () => {
            const defaultValue = { eval: vi.fn().mockReturnValue('default') };
            const paramsWithDefault = [{ name: 'param1', value: defaultValue }];
            const defWithDefault = new Definition(
                'test',
                paramsWithDefault,
                mockRules
            );

            const result = defWithDefault.evalParams(
                mockContext,
                mockMixinEnv,
                [],
                []
            );

            // Verify resetCache was called on the returned frame
            expect(result.resetCache).toHaveBeenCalled();
        });

        it('should handle empty args gracefully with optional parameters', () => {
            const optionalParams = [
                {
                    name: 'optional1',
                    value: { eval: vi.fn().mockReturnValue('default1') }
                },
                {
                    name: 'optional2',
                    value: { eval: vi.fn().mockReturnValue('default2') }
                }
            ];
            const optionalDefinition = new Definition(
                'test',
                optionalParams,
                mockRules
            );

            const result = optionalDefinition.evalParams(
                mockContext,
                mockMixinEnv,
                null,
                mockEvaldArguments
            );

            expect(result).toBeInstanceOf(Ruleset);
        });

        it('should handle mix of named and positional arguments', () => {
            const mockEvaldArgs = [];
            const mixedArgs = [
                { value: { eval: vi.fn().mockReturnValue('pos1') } },
                {
                    name: 'param2',
                    value: { eval: vi.fn().mockReturnValue('named2') }
                }
            ];

            const result = definition.evalParams(
                mockContext,
                mockMixinEnv,
                mixedArgs,
                mockEvaldArgs
            );

            // Verify that evalParams ran successfully and returned a frame
            expect(result).toBeInstanceOf(Ruleset);
            // Verify that Declaration was called for both arguments
            expect(Declaration).toHaveBeenCalledWith('param1', 'pos1');
            expect(Declaration).toHaveBeenCalledWith('param2', 'named2');
        });
    });

    describe('makeImportant', () => {
        it('should create new definition with important rules', () => {
            const rulesWithImportant = [
                { makeImportant: vi.fn().mockReturnValue({ important: true }) },
                { makeImportant: vi.fn().mockReturnValue({ important: true }) }
            ];
            const definition = new Definition(
                'test',
                mockParams,
                rulesWithImportant,
                mockCondition,
                true,
                mockFrames
            );

            const result = definition.makeImportant();

            expect(result).toBeInstanceOf(Definition);
            expect(result.name).toBe('test');
            expect(result.params).toBe(mockParams);
            expect(result.condition).toBe(mockCondition);
            expect(result.variadic).toBe(true);
            expect(result.frames).toBe(mockFrames);
            expect(rulesWithImportant[0].makeImportant).toHaveBeenCalledWith(
                true
            );
            expect(rulesWithImportant[1].makeImportant).toHaveBeenCalledWith(
                true
            );
        });

        it('should handle rules without makeImportant method', () => {
            const mixedRules = [
                { makeImportant: vi.fn().mockReturnValue({ important: true }) },
                { type: 'SimpleRule' }
            ];
            const definition = new Definition('test', mockParams, mixedRules);

            const result = definition.makeImportant();

            expect(result).toBeInstanceOf(Definition);
            expect(result.rules).toHaveLength(2);
            expect(result.rules[1]).toEqual({ type: 'SimpleRule' });
        });

        it('should handle null rules', () => {
            const definition = new Definition('test', mockParams, null);

            const result = definition.makeImportant();

            expect(result).toBeInstanceOf(Definition);
            expect(result.rules).toBeNull();
        });

        it('should handle undefined rules', () => {
            const definition = new Definition('test', mockParams, undefined);

            const result = definition.makeImportant();

            expect(result).toBeInstanceOf(Definition);
            expect(result.rules).toBeUndefined();
        });
    });

    describe('eval', () => {
        it('should create new definition with copied frames from context', () => {
            const definition = new Definition(
                'test',
                mockParams,
                mockRules,
                mockCondition,
                true,
                null
            );
            const mockContext = { frames: ['frame1', 'frame2'] };

            const result = definition.eval(mockContext);

            expect(result).toBeInstanceOf(Definition);
            expect(result.name).toBe('test');
            expect(result.params).toBe(mockParams);
            expect(result.rules).toBe(mockRules);
            expect(result.condition).toBe(mockCondition);
            expect(result.variadic).toBe(true);
            expect(utils.copyArray).toHaveBeenCalledWith(mockContext.frames);
        });

        it('should preserve existing frames when they exist', () => {
            const definition = new Definition(
                'test',
                mockParams,
                mockRules,
                mockCondition,
                true,
                mockFrames
            );
            const mockContext = { frames: ['frame1', 'frame2'] };

            const result = definition.eval(mockContext);

            expect(result.frames).toBe(mockFrames);
        });

        it('should handle null context frames', () => {
            const definition = new Definition('test', mockParams, mockRules);
            const mockContext = { frames: null };

            const result = definition.eval(mockContext);

            expect(result).toBeInstanceOf(Definition);
        });
    });

    describe('evalCall', () => {
        let definition;
        let mockContext;
        let mockArgs;

        beforeEach(() => {
            definition = new Definition('test', mockParams, mockRules);
            definition.evalParams = vi.fn().mockReturnValue(new Ruleset());
            mockContext = { frames: ['contextFrame'] };
            mockArgs = [{ value: { eval: vi.fn() } }];
        });

        it('should evaluate mixin call and return ruleset', () => {
            const result = definition.evalCall(mockContext, mockArgs, false);

            expect(result).toBeInstanceOf(Ruleset);
            expect(result.originalRuleset).toBe(definition);
        });

        it('should create @arguments declaration', () => {
            definition.evalCall(mockContext, mockArgs, false);

            expect(Declaration).toHaveBeenCalledWith(
                '@arguments',
                expect.any(Expression)
            );
        });

        it('should handle important flag', () => {
            const result = definition.evalCall(mockContext, mockArgs, true);

            expect(result.makeImportant).toHaveBeenCalled();
        });

        it('should combine frames correctly', () => {
            definition.frames = ['defFrame'];
            definition.evalCall(mockContext, mockArgs, false);

            expect(definition.evalParams).toHaveBeenCalledWith(
                mockContext,
                expect.any(Object),
                mockArgs,
                []
            );
        });

        it('should handle no arguments', () => {
            const result = definition.evalCall(mockContext, null, false);

            expect(result).toBeInstanceOf(Ruleset);
        });

        it('should copy rules before evaluation', () => {
            definition.evalCall(mockContext, mockArgs, false);

            expect(utils.copyArray).toHaveBeenCalledWith(mockRules);
        });

        it('should evaluate ruleset with proper context', () => {
            const result = definition.evalCall(mockContext, mockArgs, false);

            expect(result.eval).toHaveBeenCalledWith(expect.any(Object));
        });
    });

    describe('matchCondition', () => {
        let definition;
        let mockContext;

        beforeEach(() => {
            definition = new Definition(
                'test',
                mockParams,
                mockRules,
                mockCondition
            );
            definition.evalParams = vi.fn().mockReturnValue(new Ruleset());
            mockContext = { frames: [] };
        });

        it('should return true when condition evaluates to true', () => {
            mockCondition.eval.mockReturnValue(true);

            const result = definition.matchCondition([], mockContext);

            expect(result).toBe(true);
        });

        it('should return false when condition evaluates to false', () => {
            mockCondition.eval.mockReturnValue(false);

            const result = definition.matchCondition([], mockContext);

            expect(result).toBe(false);
        });

        it('should return true when no condition exists', () => {
            definition.condition = null;

            const result = definition.matchCondition([], mockContext);

            expect(result).toBe(true);
        });

        it('should evaluate condition with proper context', () => {
            const args = [{ value: 'test' }];
            definition.matchCondition(args, mockContext);

            expect(mockCondition.eval).toHaveBeenCalledWith(expect.any(Object));
            expect(contexts.Eval).toHaveBeenCalled();
        });

        it('should handle frames in condition evaluation', () => {
            definition.frames = ['frame1'];
            definition.matchCondition([], mockContext);

            expect(contexts.Eval).toHaveBeenCalled();
        });
    });

    describe('matchArgs', () => {
        let definition;
        let mockContext;

        beforeEach(() => {
            mockContext = {
                frames: []
            };
        });

        it('should match correct number of required arguments', () => {
            const params = [
                { name: 'required1', value: null },
                { name: 'required2', value: null }
            ];
            definition = new Definition('test', params, mockRules);
            const args = [
                {
                    name: null,
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('val1')
                        })
                    }
                },
                {
                    name: null,
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('val2')
                        })
                    }
                }
            ];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(true);
        });

        it('should reject insufficient required arguments', () => {
            const params = [
                { name: 'required1', value: null },
                { name: 'required2', value: null }
            ];
            definition = new Definition('test', params, mockRules);
            const args = [{ name: null, value: { eval: vi.fn() } }];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(false);
        });

        it('should reject too many arguments for non-variadic mixin', () => {
            const params = [{ name: 'param1', value: null }];
            definition = new Definition('test', params, mockRules);
            const args = [
                { name: null, value: { eval: vi.fn() } },
                { name: null, value: { eval: vi.fn() } }
            ];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(false);
        });

        it('should accept extra arguments for variadic mixin', () => {
            const params = [{ name: 'param1', value: null, variadic: true }];
            definition = new Definition('test', params, mockRules, null, true);
            const args = [
                { name: null, value: { eval: vi.fn() } },
                { name: null, value: { eval: vi.fn() } },
                { name: null, value: { eval: vi.fn() } }
            ];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(true);
        });

        it('should handle optional parameters correctly', () => {
            const params = [
                { name: 'required', value: null },
                { name: 'optional', value: { eval: vi.fn() } }
            ];
            definition = new Definition('test', params, mockRules);
            const args = [{ name: 'optional', value: { eval: vi.fn() } }];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(false); // Should fail because required param is missing
        });

        it('should match pattern arguments', () => {
            const params = [
                {
                    name: null,
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('pattern')
                        })
                    },
                    variadic: false
                }
            ];
            definition = new Definition('test', params, mockRules);
            const args = [
                {
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('pattern')
                        })
                    }
                }
            ];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(true);
        });

        it('should reject mismatched pattern arguments', () => {
            const params = [
                {
                    name: null,
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('pattern1')
                        })
                    },
                    variadic: false
                }
            ];
            definition = new Definition('test', params, mockRules);
            const args = [
                {
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('pattern2')
                        })
                    }
                }
            ];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(false);
        });

        it('should handle null args', () => {
            const params = [{ name: 'optional', value: { eval: vi.fn() } }];
            definition = new Definition('test', params, mockRules);

            const result = definition.matchArgs(null, mockContext);

            expect(result).toBe(true);
        });

        it('should handle empty args array', () => {
            const params = [{ name: 'optional', value: { eval: vi.fn() } }];
            definition = new Definition('test', params, mockRules);

            const result = definition.matchArgs([], mockContext);

            expect(result).toBe(true);
        });

        it('should handle variadic parameter with insufficient args', () => {
            const params = [
                { name: 'required1', value: null },
                { name: 'required2', value: null },
                { name: 'variadic', value: null, variadic: true }
            ];
            definition = new Definition('test', params, mockRules, null, true);
            const args = [{ name: null, value: { eval: vi.fn() } }];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(false); // Should fail because not enough required args
        });

        it('should count named arguments correctly', () => {
            const params = [
                { name: 'param1', value: null },
                { name: 'param2', value: { eval: vi.fn() } }
            ];
            definition = new Definition('test', params, mockRules);
            const args = [{ name: 'param1', value: { eval: vi.fn() } }];

            const result = definition.matchArgs(args, mockContext);

            expect(result).toBe(true);
        });
    });

    describe('integration tests', () => {
        it('should work with complex mixin definition and call', () => {
            const complexParams = [
                { name: 'color', value: null },
                {
                    name: 'size',
                    value: { eval: vi.fn().mockReturnValue('10px') }
                },
                { name: 'extras', variadic: true }
            ];
            const complexRules = [
                {
                    type: 'Declaration',
                    makeImportant: vi.fn().mockReturnThis()
                },
                { type: 'Ruleset', makeImportant: vi.fn().mockReturnThis() }
            ];
            const definition = new Definition(
                'complex-mixin',
                complexParams,
                complexRules,
                mockCondition,
                true,
                mockFrames
            );

            // Test that it can be created
            expect(definition).toBeInstanceOf(Definition);
            expect(definition.name).toBe('complex-mixin');
            expect(definition.variadic).toBe(true);

            // Test that matchArgs works
            const args = [
                {
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('red')
                        })
                    }
                },
                {
                    value: {
                        eval: vi.fn().mockReturnValue({
                            toCSS: vi.fn().mockReturnValue('bold')
                        })
                    }
                }
            ];
            const matches = definition.matchArgs(args, { frames: [] });
            expect(matches).toBe(true);
        });

        it('should handle visitor pattern correctly', () => {
            const definition = new Definition(
                'test',
                mockParams,
                mockRules,
                mockCondition
            );
            const visitor = {
                visitArray: vi
                    .fn()
                    .mockImplementation((arr) =>
                        arr.map((item) => ({ ...item, visited: true }))
                    ),
                visit: vi
                    .fn()
                    .mockImplementation((node) => ({ ...node, visited: true }))
            };

            definition.accept(visitor);

            expect(visitor.visitArray).toHaveBeenCalledTimes(2); // params and rules
            expect(visitor.visit).toHaveBeenCalledTimes(1); // condition
            expect(definition.params[0]).toHaveProperty('visited', true);
            expect(definition.rules[0]).toHaveProperty('visited', true);
            expect(definition.condition).toHaveProperty('visited', true);
        });
    });
});
