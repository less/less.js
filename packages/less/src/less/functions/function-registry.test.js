import { describe, it, expect, beforeEach } from 'vitest';
import defaultRegistry from './function-registry.js';

describe('function-registry', () => {
    let registry;
    let mockFunction1, mockFunction2, mockFunction3;

    beforeEach(() => {
        registry = defaultRegistry.create(null);
        mockFunction1 = () => 'result1';
        mockFunction2 = () => 'result2';
        mockFunction3 = () => 'result3';
    });

    describe('registry factory function (via create method)', () => {
        it('should create a registry with null base', () => {
            const reg = defaultRegistry.create(null);
            expect(reg).toBeDefined();
            expect(reg._data).toEqual({});
        });

        it('should create a registry with specified base', () => {
            const baseRegistry = defaultRegistry.create(null);
            baseRegistry.add('baseFunc', mockFunction1);

            const reg = defaultRegistry.create(baseRegistry);
            expect(reg).toBeDefined();
            expect(reg._data).toEqual({});
            expect(reg.get('basefunc')).toBe(mockFunction1);
        });

        it('should have default registry with null base', () => {
            // Test the default export
            expect(defaultRegistry._data).toEqual({});
        });
    });

    describe('add method', () => {
        it('should add a function to the registry', () => {
            registry.add('testFunc', mockFunction1);
            expect(registry._data.testfunc).toBe(mockFunction1);
        });

        it('should convert function names to lowercase', () => {
            registry.add('TestFunc', mockFunction1);
            registry.add('UPPERCASE', mockFunction2);
            registry.add('MiXeDcAsE', mockFunction3);

            expect(registry._data.testfunc).toBe(mockFunction1);
            expect(registry._data.uppercase).toBe(mockFunction2);
            expect(registry._data.mixedcase).toBe(mockFunction3);
        });

        it('should handle duplicate function names', () => {
            registry.add('testFunc', mockFunction1);
            registry.add('testFunc', mockFunction2);

            // Should overwrite the first function
            expect(registry._data.testfunc).toBe(mockFunction2);
        });

        it('should handle empty string names', () => {
            registry.add('', mockFunction1);
            expect(registry._data['']).toBe(mockFunction1);
        });

        it('should handle special characters in names', () => {
            registry.add('test-func', mockFunction1);
            registry.add('test_func', mockFunction2);
            registry.add('test.func', mockFunction3);

            expect(registry._data['test-func']).toBe(mockFunction1);
            expect(registry._data.test_func).toBe(mockFunction2);
            expect(registry._data['test.func']).toBe(mockFunction3);
        });
    });

    describe('addMultiple method', () => {
        it('should add multiple functions at once', () => {
            const functions = {
                func1: mockFunction1,
                func2: mockFunction2,
                func3: mockFunction3
            };

            registry.addMultiple(functions);

            expect(registry._data.func1).toBe(mockFunction1);
            expect(registry._data.func2).toBe(mockFunction2);
            expect(registry._data.func3).toBe(mockFunction3);
        });

        it('should handle empty object', () => {
            registry.addMultiple({});
            expect(registry._data).toEqual({});
        });

        it('should convert all function names to lowercase', () => {
            const functions = {
                TestFunc: mockFunction1,
                UPPERCASE: mockFunction2,
                MiXeDcAsE: mockFunction3
            };

            registry.addMultiple(functions);

            expect(registry._data.testfunc).toBe(mockFunction1);
            expect(registry._data.uppercase).toBe(mockFunction2);
            expect(registry._data.mixedcase).toBe(mockFunction3);
        });

        it('should handle functions with special characters', () => {
            const functions = {
                'test-func': mockFunction1,
                test_func: mockFunction2,
                'test.func': mockFunction3
            };

            registry.addMultiple(functions);

            expect(registry._data['test-func']).toBe(mockFunction1);
            expect(registry._data.test_func).toBe(mockFunction2);
            expect(registry._data['test.func']).toBe(mockFunction3);
        });
    });

    describe('get method', () => {
        beforeEach(() => {
            registry.add('localFunc', mockFunction1);
        });

        it('should retrieve a function by name using lowercase', () => {
            const result = registry.get('localfunc'); // Note: lowercase
            expect(result).toBe(mockFunction1);
        });

        it('should return null for non-existent functions when no base', () => {
            const result = registry.get('nonexistent');
            expect(result).toBeNull();
        });

        it('should return null when using wrong case for retrieval', () => {
            const result = registry.get('localFunc'); // Original case
            expect(result).toBeNull();
        });

        it('should fall back to base registry when function not found locally', () => {
            const baseRegistry = defaultRegistry.create(null);
            baseRegistry.add('baseFunc', mockFunction2);

            const derivedRegistry = defaultRegistry.create(baseRegistry);
            derivedRegistry.add('localFunc', mockFunction1);

            expect(derivedRegistry.get('localfunc')).toBe(mockFunction1);
            expect(derivedRegistry.get('basefunc')).toBe(mockFunction2);
        });

        it('should return null when function not found in base either', () => {
            const baseRegistry = defaultRegistry.create(null);
            const derivedRegistry = defaultRegistry.create(baseRegistry);

            const result = derivedRegistry.get('nonexistent');
            expect(result).toBeNull();
        });

        it('should prioritize local functions over base functions', () => {
            const baseRegistry = defaultRegistry.create(null);
            baseRegistry.add('sameFunc', mockFunction2);

            const derivedRegistry = defaultRegistry.create(baseRegistry);
            derivedRegistry.add('sameFunc', mockFunction1);

            expect(derivedRegistry.get('samefunc')).toBe(mockFunction1);
        });

        it('should handle nested inheritance', () => {
            const level1Registry = defaultRegistry.create(null);
            level1Registry.add('level1Func', mockFunction1);

            const level2Registry = defaultRegistry.create(level1Registry);
            level2Registry.add('level2Func', mockFunction2);

            const level3Registry = defaultRegistry.create(level2Registry);
            level3Registry.add('level3Func', mockFunction3);

            expect(level3Registry.get('level3func')).toBe(mockFunction3);
            expect(level3Registry.get('level2func')).toBe(mockFunction2);
            expect(level3Registry.get('level1func')).toBe(mockFunction1);
        });
    });

    describe('getLocalFunctions method', () => {
        it('should return the local _data object', () => {
            registry.add('func1', mockFunction1);
            registry.add('func2', mockFunction2);

            const localFunctions = registry.getLocalFunctions();

            expect(localFunctions).toBe(registry._data);
            expect(localFunctions.func1).toBe(mockFunction1);
            expect(localFunctions.func2).toBe(mockFunction2);
        });

        it('should return empty object for new registry', () => {
            const localFunctions = registry.getLocalFunctions();
            expect(localFunctions).toEqual({});
        });

        it('should not include base registry functions', () => {
            const baseRegistry = defaultRegistry.create(null);
            baseRegistry.add('baseFunc', mockFunction1);

            const derivedRegistry = defaultRegistry.create(baseRegistry);
            derivedRegistry.add('localFunc', mockFunction2);

            const localFunctions = derivedRegistry.getLocalFunctions();

            expect(localFunctions.localfunc).toBe(mockFunction2); // stored as lowercase
            expect(localFunctions.basefunc).toBeUndefined();
        });
    });

    describe('inherit method', () => {
        it('should create a new registry with current registry as base', () => {
            registry.add('parentFunc', mockFunction1);

            const childRegistry = registry.inherit();
            childRegistry.add('childFunc', mockFunction2);

            expect(childRegistry.get('childfunc')).toBe(mockFunction2);
            expect(childRegistry.get('parentfunc')).toBe(mockFunction1);
            expect(
                childRegistry.getLocalFunctions().parentfunc
            ).toBeUndefined();
        });

        it('should create independent registries', () => {
            const child1 = registry.inherit();
            const child2 = registry.inherit();

            child1.add('child1Func', mockFunction1);
            child2.add('child2Func', mockFunction2);

            expect(child1.get('child1func')).toBe(mockFunction1);
            expect(child1.get('child2func')).toBeNull();
            expect(child2.get('child2func')).toBe(mockFunction2);
            expect(child2.get('child1func')).toBeNull();
        });

        it('should maintain inheritance chain', () => {
            registry.add('grandparentFunc', mockFunction1);

            const parentRegistry = registry.inherit();
            parentRegistry.add('parentFunc', mockFunction2);

            const childRegistry = parentRegistry.inherit();
            childRegistry.add('childFunc', mockFunction3);

            expect(childRegistry.get('childfunc')).toBe(mockFunction3);
            expect(childRegistry.get('parentfunc')).toBe(mockFunction2);
            expect(childRegistry.get('grandparentfunc')).toBe(mockFunction1);
        });
    });

    describe('create method', () => {
        it('should create a new registry with specified base', () => {
            const baseRegistry = defaultRegistry.create(null);
            baseRegistry.add('baseFunc', mockFunction1);

            const newRegistry = registry.create(baseRegistry);
            newRegistry.add('newFunc', mockFunction2);

            expect(newRegistry.get('newfunc')).toBe(mockFunction2);
            expect(newRegistry.get('basefunc')).toBe(mockFunction1);
        });

        it('should create registry with null base', () => {
            const newRegistry = registry.create(null);
            newRegistry.add('newFunc', mockFunction1);

            expect(newRegistry.get('newfunc')).toBe(mockFunction1);
            expect(newRegistry.get('nonexistent')).toBeNull();
        });

        it('should be equivalent to defaultRegistry.create', () => {
            const baseRegistry = defaultRegistry.create(null);
            baseRegistry.add('baseFunc', mockFunction1);

            const registry1 = registry.create(baseRegistry);
            const registry2 = defaultRegistry.create(baseRegistry);

            registry1.add('testFunc', mockFunction2);
            registry2.add('testFunc', mockFunction2);

            expect(registry1.get('testfunc')).toBe(registry2.get('testfunc'));
            expect(registry1.get('basefunc')).toBe(registry2.get('basefunc'));
        });
    });

    describe('edge cases and error conditions', () => {
        it('should handle null function values', () => {
            registry.add('nullFunc', null);
            expect(registry.get('nullfunc')).toBeNull();
        });

        it('should handle undefined function values', () => {
            registry.add('undefinedFunc', undefined);
            expect(registry.get('undefinedfunc')).toBeNull();
        });

        it('should handle non-function values', () => {
            registry.add('stringValue', 'not a function');
            registry.add('numberValue', 42);
            registry.add('objectValue', { key: 'value' });

            expect(registry.get('stringvalue')).toBe('not a function');
            expect(registry.get('numbervalue')).toBe(42);
            expect(registry.get('objectvalue')).toEqual({ key: 'value' });
        });

        it('should handle circular inheritance safely', () => {
            const reg1 = defaultRegistry.create(null);
            const reg2 = defaultRegistry.create(reg1);

            // This doesn't create actual circular reference in the implementation
            // but tests that the structure handles complex inheritance
            reg1.add('func1', mockFunction1);
            reg2.add('func2', mockFunction2);

            expect(reg2.get('func1')).toBe(mockFunction1);
            expect(reg2.get('func2')).toBe(mockFunction2);
        });
    });

    describe('integration scenarios', () => {
        it('should work with complex inheritance and overrides', () => {
            // Create a base registry with some functions
            const baseRegistry = defaultRegistry.create(null);
            baseRegistry.add('common', () => 'base');
            baseRegistry.add('baseOnly', () => 'base-only');

            // Create a derived registry that overrides some functions
            const derivedRegistry = defaultRegistry.create(baseRegistry);
            derivedRegistry.add('common', () => 'derived');
            derivedRegistry.add('derivedOnly', () => 'derived-only');

            // Create a child registry
            const childRegistry = derivedRegistry.inherit();
            childRegistry.add('childOnly', () => 'child-only');

            // Test function resolution
            expect(childRegistry.get('childonly')()).toBe('child-only');
            expect(childRegistry.get('derivedonly')()).toBe('derived-only');
            expect(childRegistry.get('common')()).toBe('derived'); // Should use override
            expect(childRegistry.get('baseonly')()).toBe('base-only');

            // Test local functions don't include inherited ones
            const localFunctions = childRegistry.getLocalFunctions();
            expect(Object.keys(localFunctions)).toEqual(['childonly']);
        });

        it('should handle multiple inheritance levels with same function names', () => {
            const level1 = defaultRegistry.create(null);
            level1.add('func', () => 'level1');

            const level2 = defaultRegistry.create(level1);
            level2.add('func', () => 'level2');

            const level3 = defaultRegistry.create(level2);
            level3.add('func', () => 'level3');

            expect(level3.get('func')()).toBe('level3');
            expect(level2.get('func')()).toBe('level2');
            expect(level1.get('func')()).toBe('level1');
        });
    });
});
