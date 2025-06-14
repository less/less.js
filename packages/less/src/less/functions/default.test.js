import { describe, it, expect, beforeEach } from 'vitest';
import defaultFunc from './default.js';
import Keyword from '../tree/keyword.js';

describe('defaultFunc', () => {
    let instance;

    beforeEach(() => {
        // Create a fresh instance for each test by creating an object that inherits from defaultFunc
        instance = Object.create(defaultFunc);
        instance.value_ = null;
        instance.error_ = null;
    });

    describe('eval method', () => {
        it('should throw error when error_ is set', () => {
            const testError = new Error('Test error');
            instance.error_ = testError;
            instance.value_ = 'some value';

            expect(() => instance.eval()).toThrow('Test error');
        });

        it('should return undefined when value_ is null', () => {
            instance.value_ = null;
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBeUndefined();
        });

        it('should return undefined when value_ is undefined', () => {
            instance.value_ = undefined;
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBeUndefined();
        });

        it('should return Keyword.True when value_ is truthy', () => {
            instance.value_ = 'truthy string';
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });

        it('should return Keyword.True when value_ is number 1', () => {
            instance.value_ = 1;
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });

        it('should return Keyword.True when value_ is true boolean', () => {
            instance.value_ = true;
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });

        it('should return Keyword.False when value_ is empty string', () => {
            instance.value_ = '';
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.False);
        });

        it('should return Keyword.False when value_ is number 0', () => {
            instance.value_ = 0;
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.False);
        });

        it('should return Keyword.False when value_ is false boolean', () => {
            instance.value_ = false;
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.False);
        });

        it('should return Keyword.False when value_ is NaN', () => {
            instance.value_ = NaN;
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.False);
        });

        it('should prioritize error over value when both are set', () => {
            const testError = new Error('Priority test');
            instance.error_ = testError;
            instance.value_ = 'some value';

            expect(() => instance.eval()).toThrow('Priority test');
        });

        it('should handle complex truthy objects', () => {
            instance.value_ = { key: 'value' };
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });

        it('should handle arrays as truthy values', () => {
            instance.value_ = [1, 2, 3];
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });

        it('should handle empty arrays as truthy values', () => {
            instance.value_ = [];
            instance.error_ = null;

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });
    });

    describe('value method', () => {
        it('should set value_ property to provided value', () => {
            const testValue = 'test value';
            instance.value(testValue);

            expect(instance.value_).toBe(testValue);
        });

        it('should set value_ to null when null is provided', () => {
            instance.value(null);

            expect(instance.value_).toBe(null);
        });

        it('should set value_ to undefined when undefined is provided', () => {
            instance.value(undefined);

            expect(instance.value_).toBe(undefined);
        });

        it('should set value_ to number', () => {
            instance.value(42);

            expect(instance.value_).toBe(42);
        });

        it('should set value_ to boolean', () => {
            instance.value(false);

            expect(instance.value_).toBe(false);
        });

        it('should set value_ to object', () => {
            const testObj = { key: 'value' };
            instance.value(testObj);

            expect(instance.value_).toBe(testObj);
        });

        it('should set value_ to array', () => {
            const testArray = [1, 2, 3];
            instance.value(testArray);

            expect(instance.value_).toBe(testArray);
        });

        it('should overwrite existing value_', () => {
            instance.value_ = 'old value';
            instance.value('new value');

            expect(instance.value_).toBe('new value');
        });
    });

    describe('error method', () => {
        it('should set error_ property to provided error', () => {
            const testError = new Error('Test error');
            instance.error(testError);

            expect(instance.error_).toBe(testError);
        });

        it('should set error_ to null when null is provided', () => {
            instance.error(null);

            expect(instance.error_).toBe(null);
        });

        it('should set error_ to undefined when undefined is provided', () => {
            instance.error(undefined);

            expect(instance.error_).toBe(undefined);
        });

        it('should set error_ to string', () => {
            const errorString = 'Error message';
            instance.error(errorString);

            expect(instance.error_).toBe(errorString);
        });

        it('should set error_ to custom error object', () => {
            const customError = { message: 'Custom error', code: 500 };
            instance.error(customError);

            expect(instance.error_).toBe(customError);
        });

        it('should overwrite existing error_', () => {
            instance.error_ = new Error('Old error');
            const newError = new Error('New error');
            instance.error(newError);

            expect(instance.error_).toBe(newError);
        });
    });

    describe('reset method', () => {
        it('should set both value_ and error_ to null', () => {
            instance.value_ = 'some value';
            instance.error_ = new Error('some error');

            instance.reset();

            expect(instance.value_).toBe(null);
            expect(instance.error_).toBe(null);
        });

        it('should set value_ and error_ to null when they are already null', () => {
            instance.value_ = null;
            instance.error_ = null;

            instance.reset();

            expect(instance.value_).toBe(null);
            expect(instance.error_).toBe(null);
        });

        it('should set value_ and error_ to null when they are undefined', () => {
            instance.value_ = undefined;
            instance.error_ = undefined;

            instance.reset();

            expect(instance.value_).toBe(null);
            expect(instance.error_).toBe(null);
        });

        it('should reset complex values to null', () => {
            instance.value_ = { complex: 'object', with: ['nested', 'values'] };
            instance.error_ = new TypeError('Complex error with details');

            instance.reset();

            expect(instance.value_).toBe(null);
            expect(instance.error_).toBe(null);
        });
    });

    describe('integration tests', () => {
        it('should work correctly when chaining value and eval', () => {
            instance.value('test');
            const result = instance.eval();

            expect(result).toBe(Keyword.True);
        });

        it('should work correctly when chaining error and eval', () => {
            const testError = new Error('Chain test');
            instance.error(testError);

            expect(() => instance.eval()).toThrow('Chain test');
        });

        it('should work correctly when chaining value, error, and eval (error takes priority)', () => {
            const testError = new Error('Priority chain test');
            instance.value('test value');
            instance.error(testError);

            expect(() => instance.eval()).toThrow('Priority chain test');
        });

        it('should work correctly after reset', () => {
            instance.value('test');
            instance.error(new Error('test'));
            instance.reset();

            const result = instance.eval();
            expect(result).toBeUndefined();
        });

        it('should handle multiple reset calls', () => {
            instance.value('test');
            instance.reset();
            instance.reset();

            expect(instance.value_).toBe(null);
            expect(instance.error_).toBe(null);
        });

        it('should work with falsy values after reset', () => {
            instance.value('truthy');
            instance.reset();
            instance.value(0);

            const result = instance.eval();
            expect(result).toBe(Keyword.False);
        });
    });

    describe('edge cases and error conditions', () => {
        it('should handle function as value', () => {
            const testFunc = () => 'test';
            instance.value(testFunc);

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });

        it('should handle Symbol as value', () => {
            const testSymbol = Symbol('test');
            instance.value(testSymbol);

            const result = instance.eval();
            expect(result).toBe(Keyword.True);
        });

        it('should preserve error type when throwing', () => {
            const typeError = new TypeError('Type error test');
            instance.error(typeError);

            expect(() => instance.eval()).toThrow(TypeError);
            expect(() => instance.eval()).toThrow('Type error test');
        });

        it('should handle non-Error objects as errors', () => {
            const customError = 'String error';
            instance.error(customError);

            expect(() => instance.eval()).toThrow('String error');
        });
    });
});
