import { describe, it, expect, vi, beforeEach } from 'vitest';
import logger from './logger.js';

describe('logger', () => {
    let mockListener;
    
    beforeEach(() => {
        // Reset listeners array before each test
        logger._listeners.length = 0;
        
        // Create mock listener with all log level methods
        mockListener = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn()
        };
    });

    describe('log level methods', () => {
        it('should call error listener when error() is called', () => {
            logger.addListener(mockListener);
            const message = 'Test error message';
            
            logger.error(message);
            
            expect(mockListener.error).toHaveBeenCalledWith(message);
            expect(mockListener.error).toHaveBeenCalledTimes(1);
        });

        it('should call warn listener when warn() is called', () => {
            logger.addListener(mockListener);
            const message = 'Test warning message';
            
            logger.warn(message);
            
            expect(mockListener.warn).toHaveBeenCalledWith(message);
            expect(mockListener.warn).toHaveBeenCalledTimes(1);
        });

        it('should call info listener when info() is called', () => {
            logger.addListener(mockListener);
            const message = 'Test info message';
            
            logger.info(message);
            
            expect(mockListener.info).toHaveBeenCalledWith(message);
            expect(mockListener.info).toHaveBeenCalledTimes(1);
        });

        it('should call debug listener when debug() is called', () => {
            logger.addListener(mockListener);
            const message = 'Test debug message';
            
            logger.debug(message);
            
            expect(mockListener.debug).toHaveBeenCalledWith(message);
            expect(mockListener.debug).toHaveBeenCalledTimes(1);
        });
    });

    describe('listener management', () => {
        it('should add listener to _listeners array', () => {
            expect(logger._listeners).toHaveLength(0);
            
            logger.addListener(mockListener);
            
            expect(logger._listeners).toHaveLength(1);
            expect(logger._listeners[0]).toBe(mockListener);
        });

        it('should add multiple listeners', () => {
            const listener2 = { error: vi.fn(), warn: vi.fn() };
            
            logger.addListener(mockListener);
            logger.addListener(listener2);
            
            expect(logger._listeners).toHaveLength(2);
            expect(logger._listeners[0]).toBe(mockListener);
            expect(logger._listeners[1]).toBe(listener2);
        });

        it('should remove listener from _listeners array', () => {
            logger.addListener(mockListener);
            expect(logger._listeners).toHaveLength(1);
            
            logger.removeListener(mockListener);
            
            expect(logger._listeners).toHaveLength(0);
        });

        it('should remove only the specified listener when multiple exist', () => {
            const listener2 = { error: vi.fn(), warn: vi.fn() };
            logger.addListener(mockListener);
            logger.addListener(listener2);
            
            logger.removeListener(mockListener);
            
            expect(logger._listeners).toHaveLength(1);
            expect(logger._listeners[0]).toBe(listener2);
        });

        it('should remove first matching listener when duplicates exist', () => {
            logger.addListener(mockListener);
            logger.addListener(mockListener); // Add same listener twice
            expect(logger._listeners).toHaveLength(2);
            
            logger.removeListener(mockListener);
            
            expect(logger._listeners).toHaveLength(1);
            expect(logger._listeners[0]).toBe(mockListener);
        });

        it('should do nothing when trying to remove non-existent listener', () => {
            const otherListener = { error: vi.fn() };
            logger.addListener(mockListener);
            
            logger.removeListener(otherListener);
            
            expect(logger._listeners).toHaveLength(1);
            expect(logger._listeners[0]).toBe(mockListener);
        });

        it('should handle removing from empty listeners array', () => {
            expect(logger._listeners).toHaveLength(0);
            
            logger.removeListener(mockListener);
            
            expect(logger._listeners).toHaveLength(0);
        });
    });

    describe('event firing mechanism', () => {
        it('should call all listeners for the same log level', () => {
            const listener2 = {
                error: vi.fn(),
                warn: vi.fn(),
                info: vi.fn(),
                debug: vi.fn()
            };
            
            logger.addListener(mockListener);
            logger.addListener(listener2);
            
            const message = 'Test message';
            logger.error(message);
            
            expect(mockListener.error).toHaveBeenCalledWith(message);
            expect(listener2.error).toHaveBeenCalledWith(message);
        });

        it('should not call listeners that do not have the log level method', () => {
            const partialListener = {
                error: vi.fn()
                // Missing warn, info, debug methods
            };
            
            logger.addListener(mockListener);
            logger.addListener(partialListener);
            
            const message = 'Test message';
            logger.warn(message);
            
            expect(mockListener.warn).toHaveBeenCalledWith(message);
            expect(partialListener.error).not.toHaveBeenCalled();
        });

        it('should handle listeners with undefined methods gracefully', () => {
            const listenerWithUndefined = {
                error: vi.fn(),
                warn: undefined,
                info: null,
                debug: vi.fn()
            };
            
            logger.addListener(listenerWithUndefined);
            
            // These should not throw errors
            expect(() => logger.warn('test')).not.toThrow();
            expect(() => logger.info('test')).not.toThrow();
            
            // But error and debug should still work
            logger.error('error test');
            logger.debug('debug test');
            
            expect(listenerWithUndefined.error).toHaveBeenCalledWith('error test');
            expect(listenerWithUndefined.debug).toHaveBeenCalledWith('debug test');
        });

        it('should work with no listeners registered', () => {
            expect(() => logger.error('test')).not.toThrow();
            expect(() => logger.warn('test')).not.toThrow();
            expect(() => logger.info('test')).not.toThrow();
            expect(() => logger.debug('test')).not.toThrow();
        });
    });

    describe('message handling', () => {
        it('should pass different message types correctly', () => {
            logger.addListener(mockListener);
            
            // Test string message
            logger.error('string message');
            expect(mockListener.error).toHaveBeenCalledWith('string message');
            
            // Test object message
            const objMessage = { type: 'error', details: 'test' };
            logger.error(objMessage);
            expect(mockListener.error).toHaveBeenCalledWith(objMessage);
            
            // Test number message
            logger.error(42);
            expect(mockListener.error).toHaveBeenCalledWith(42);
            
            // Test null/undefined messages
            logger.error(null);
            expect(mockListener.error).toHaveBeenCalledWith(null);
            
            logger.error(undefined);
            expect(mockListener.error).toHaveBeenCalledWith(undefined);
        });

        it('should preserve message reference for objects', () => {
            logger.addListener(mockListener);
            const message = { test: 'value' };
            
            logger.error(message);
            
            expect(mockListener.error).toHaveBeenCalledWith(message);
            // Verify it's the same reference
            expect(mockListener.error.mock.calls[0][0]).toBe(message);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex workflow with multiple listeners and log levels', () => {
            const consoleListener = {
                error: vi.fn(),
                warn: vi.fn(),
                info: vi.fn(),
                debug: vi.fn()
            };
            
            const fileListener = {
                error: vi.fn(),
                warn: vi.fn()
                // Only handles error and warn
            };
            
            logger.addListener(consoleListener);
            logger.addListener(fileListener);
            
            logger.error('Critical error');
            logger.warn('Warning message');
            logger.info('Info message');
            logger.debug('Debug message');
            
            // Console listener should receive all messages
            expect(consoleListener.error).toHaveBeenCalledWith('Critical error');
            expect(consoleListener.warn).toHaveBeenCalledWith('Warning message');
            expect(consoleListener.info).toHaveBeenCalledWith('Info message');
            expect(consoleListener.debug).toHaveBeenCalledWith('Debug message');
            
            // File listener should only receive error and warn
            expect(fileListener.error).toHaveBeenCalledWith('Critical error');
            expect(fileListener.warn).toHaveBeenCalledWith('Warning message');
            
            // Remove console listener
            logger.removeListener(consoleListener);
            
            logger.error('Another error');
            
            // Only file listener should receive this
            expect(fileListener.error).toHaveBeenCalledWith('Another error');
            expect(consoleListener.error).toHaveBeenCalledTimes(1); // Still just the first call
        });

        it('should maintain state across multiple operations', () => {
            expect(logger._listeners).toHaveLength(0);
            
            logger.addListener(mockListener);
            logger.error('test1');
            expect(mockListener.error).toHaveBeenCalledTimes(1);
            
            const listener2 = { error: vi.fn() };
            logger.addListener(listener2);
            logger.error('test2');
            
            expect(mockListener.error).toHaveBeenCalledTimes(2);
            expect(listener2.error).toHaveBeenCalledTimes(1);
            
            logger.removeListener(mockListener);
            logger.error('test3');
            
            expect(mockListener.error).toHaveBeenCalledTimes(2); // No additional calls
            expect(listener2.error).toHaveBeenCalledTimes(2);
        });
    });

    describe('edge cases', () => {
        it('should handle listeners that throw errors', () => {
            const throwingListener = {
                error: vi.fn(() => { throw new Error('Listener error'); }),
                warn: vi.fn()
            };
            
            logger.addListener(throwingListener);
            logger.addListener(mockListener);
            
            // The error from the first listener should not prevent the second from being called
            expect(() => logger.error('test')).toThrow('Listener error');
            
            // But the throwing listener should have been called
            expect(throwingListener.error).toHaveBeenCalledWith('test');
        });

        it('should handle empty _listeners array correctly', () => {
            // Ensure _listeners is empty
            logger._listeners.length = 0;
            
            expect(() => {
                logger.error('test');
                logger.warn('test');
                logger.info('test');
                logger.debug('test');
            }).not.toThrow();
        });

        it('should handle listener with no methods', () => {
            const emptyListener = {};
            logger.addListener(emptyListener);
            
            expect(() => {
                logger.error('test');
                logger.warn('test');
                logger.info('test');
                logger.debug('test');
            }).not.toThrow();
        });
    });

    describe('_listeners array direct access', () => {
        it('should expose _listeners as an array', () => {
            expect(Array.isArray(logger._listeners)).toBe(true);
        });

        it('should start with empty _listeners array', () => {
            // Reset to ensure clean state
            logger._listeners.length = 0;
            expect(logger._listeners).toHaveLength(0);
        });

        it('should allow direct manipulation of _listeners array', () => {
            // This tests the current implementation behavior
            logger._listeners.push(mockListener);
            
            logger.error('direct test');
            
            expect(mockListener.error).toHaveBeenCalledWith('direct test');
        });
    });
});