import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImportSequencer from './import-sequencer.js';

describe('ImportSequencer', () => {
    let sequencer;
    let onSequencerEmpty;

    beforeEach(() => {
        onSequencerEmpty = vi.fn();
        sequencer = new ImportSequencer(onSequencerEmpty);
    });

    describe('constructor', () => {
        it('initializes with empty imports and variableImports arrays', () => {
            expect(sequencer.imports).toEqual([]);
            expect(sequencer.variableImports).toEqual([]);
        });

        it('stores the onSequencerEmpty callback', () => {
            expect(sequencer._onSequencerEmpty).toBe(onSequencerEmpty);
        });

        it('initializes _currentDepth to 0', () => {
            expect(sequencer._currentDepth).toBe(0);
        });

        it('can be created without onSequencerEmpty callback', () => {
            const seq = new ImportSequencer();
            expect(seq._onSequencerEmpty).toBeUndefined();
        });
    });

    describe('addImport', () => {
        it('adds an import item to the imports array', () => {
            const callback = vi.fn();
            sequencer.addImport(callback);

            expect(sequencer.imports).toHaveLength(1);
            expect(sequencer.imports[0]).toEqual({
                callback,
                args: null,
                isReady: false
            });
        });

        it('returns a trigger function', () => {
            const callback = vi.fn();
            const trigger = sequencer.addImport(callback);

            expect(typeof trigger).toBe('function');
        });

        it('trigger function sets isReady to true and stores arguments', () => {
            const callback = vi.fn();
            const trigger = sequencer.addImport(callback);

            // Mock tryRun to prevent it from removing the import
            const originalTryRun = sequencer.tryRun;
            sequencer.tryRun = vi.fn();

            trigger('arg1', 'arg2', 'arg3');

            expect(sequencer.imports[0].isReady).toBe(true);
            expect(sequencer.imports[0].args).toEqual(['arg1', 'arg2', 'arg3']);

            // Restore original tryRun
            sequencer.tryRun = originalTryRun;
        });

        it('trigger function calls tryRun', () => {
            const callback = vi.fn();
            const tryRunSpy = vi.spyOn(sequencer, 'tryRun');
            const trigger = sequencer.addImport(callback);

            trigger();

            expect(tryRunSpy).toHaveBeenCalled();
        });

        it('trigger function works with no arguments', () => {
            const callback = vi.fn();
            const trigger = sequencer.addImport(callback);

            // Mock tryRun to prevent it from removing the import
            const originalTryRun = sequencer.tryRun;
            sequencer.tryRun = vi.fn();

            trigger();

            expect(sequencer.imports[0].args).toEqual([]);
            expect(sequencer.imports[0].isReady).toBe(true);

            // Restore original tryRun
            sequencer.tryRun = originalTryRun;
        });

        it('can add multiple imports', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            sequencer.addImport(callback1);
            sequencer.addImport(callback2);

            expect(sequencer.imports).toHaveLength(2);
            expect(sequencer.imports[0].callback).toBe(callback1);
            expect(sequencer.imports[1].callback).toBe(callback2);
        });
    });

    describe('addVariableImport', () => {
        it('adds a callback to the variableImports array', () => {
            const callback = vi.fn();
            sequencer.addVariableImport(callback);

            expect(sequencer.variableImports).toHaveLength(1);
            expect(sequencer.variableImports[0]).toBe(callback);
        });

        it('can add multiple variable imports', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            sequencer.addVariableImport(callback1);
            sequencer.addVariableImport(callback2);

            expect(sequencer.variableImports).toHaveLength(2);
            expect(sequencer.variableImports[0]).toBe(callback1);
            expect(sequencer.variableImports[1]).toBe(callback2);
        });
    });

    describe('tryRun', () => {
        it('does not run callback if import is not ready', () => {
            const callback = vi.fn();
            sequencer.addImport(callback);

            sequencer.tryRun();

            expect(callback).not.toHaveBeenCalled();
            expect(sequencer.imports).toHaveLength(1);
        });

        it('runs callback when import is ready', () => {
            const callback = vi.fn();
            const trigger = sequencer.addImport(callback);

            trigger('arg1', 'arg2');
            // tryRun is called automatically by trigger, but let's call it explicitly for clarity

            expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
            expect(sequencer.imports).toHaveLength(0);
        });

        it('processes imports in FIFO order', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();
            const callOrder = [];

            callback1.mockImplementation(() => callOrder.push('callback1'));
            callback2.mockImplementation(() => callOrder.push('callback2'));
            callback3.mockImplementation(() => callOrder.push('callback3'));

            const trigger1 = sequencer.addImport(callback1);
            const trigger2 = sequencer.addImport(callback2);
            const trigger3 = sequencer.addImport(callback3);

            // Trigger in reverse order to test FIFO
            trigger3('arg3');
            trigger1('arg1');
            trigger2('arg2');

            expect(callOrder).toEqual(['callback1', 'callback2', 'callback3']);
        });

        it('processes all ready imports before variable imports', () => {
            const importCallback = vi.fn();
            const variableCallback = vi.fn();
            const callOrder = [];

            importCallback.mockImplementation(() => callOrder.push('import'));
            variableCallback.mockImplementation(() =>
                callOrder.push('variable')
            );

            sequencer.addVariableImport(variableCallback);
            const trigger = sequencer.addImport(importCallback);

            trigger();

            expect(callOrder).toEqual(['import', 'variable']);
        });

        it('processes variable imports in FIFO order', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callOrder = [];

            callback1.mockImplementation(() => callOrder.push('variable1'));
            callback2.mockImplementation(() => callOrder.push('variable2'));

            sequencer.addVariableImport(callback1);
            sequencer.addVariableImport(callback2);

            sequencer.tryRun();

            expect(callOrder).toEqual(['variable1', 'variable2']);
            expect(sequencer.variableImports).toHaveLength(0);
        });

        it('handles mixed imports and variable imports correctly', () => {
            const importCallback1 = vi.fn();
            const importCallback2 = vi.fn();
            const variableCallback1 = vi.fn();
            const variableCallback2 = vi.fn();
            const callOrder = [];

            importCallback1.mockImplementation(() => callOrder.push('import1'));
            importCallback2.mockImplementation(() => callOrder.push('import2'));
            variableCallback1.mockImplementation(() =>
                callOrder.push('variable1')
            );
            variableCallback2.mockImplementation(() =>
                callOrder.push('variable2')
            );

            const trigger1 = sequencer.addImport(importCallback1);
            sequencer.addVariableImport(variableCallback1);
            const trigger2 = sequencer.addImport(importCallback2);
            sequencer.addVariableImport(variableCallback2);

            trigger1();
            trigger2();

            expect(callOrder).toEqual([
                'import1',
                'import2',
                'variable1',
                'variable2'
            ]);
        });

        it('stops processing imports when encountering a non-ready import', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();

            const trigger1 = sequencer.addImport(callback1);
            sequencer.addImport(callback2); // This one won't be triggered
            const trigger3 = sequencer.addImport(callback3);

            trigger1();
            trigger3();

            sequencer.tryRun();

            expect(callback1).toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
            expect(callback3).not.toHaveBeenCalled();
            expect(sequencer.imports).toHaveLength(2); // callback2 and callback3 remain
        });

        it('increments and decrements _currentDepth', () => {
            expect(sequencer._currentDepth).toBe(0);

            sequencer.tryRun();

            expect(sequencer._currentDepth).toBe(0); // Should be back to 0 after completion
        });

        it('tracks depth correctly during nested calls', () => {
            const callback = vi.fn(() => {
                expect(sequencer._currentDepth).toBe(1);
                sequencer.tryRun(); // Nested call
                expect(sequencer._currentDepth).toBe(1); // Should still be 1 after nested call returns
            });

            const trigger = sequencer.addImport(callback);
            trigger();

            expect(sequencer._currentDepth).toBe(0);
        });

        it('calls onSequencerEmpty when depth reaches 0 and all imports are processed', () => {
            const callback = vi.fn();
            const trigger = sequencer.addImport(callback);

            trigger();

            expect(onSequencerEmpty).toHaveBeenCalled();
        });

        it('does not call onSequencerEmpty when depth is not 0', () => {
            const callback = vi.fn(() => {
                sequencer.tryRun(); // This creates a nested call
            });
            const trigger = sequencer.addImport(callback);

            trigger();

            // onSequencerEmpty should only be called once, after the outermost tryRun completes
            expect(onSequencerEmpty).toHaveBeenCalledTimes(1);
        });

        it('does not call onSequencerEmpty when callback is not provided', () => {
            const seq = new ImportSequencer(); // No callback provided
            const callback = vi.fn();
            const trigger = seq.addImport(callback);

            trigger();

            // Should not throw an error
            expect(() => seq.tryRun()).not.toThrow();
        });

        it('handles exceptions in import callbacks gracefully', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Test error');
            });
            const normalCallback = vi.fn();

            sequencer.addImport(errorCallback);
            sequencer.addImport(normalCallback);

            // Need to manually set ready state since we're testing exception handling
            sequencer.imports[0].isReady = true;
            sequencer.imports[0].args = [];
            sequencer.imports[1].isReady = true;
            sequencer.imports[1].args = [];

            expect(() => sequencer.tryRun()).toThrow('Test error');
            // _currentDepth should be properly decremented even after exception
            expect(sequencer._currentDepth).toBe(0);
        });

        it('handles exceptions in variable import callbacks gracefully', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Variable import error');
            });

            sequencer.addVariableImport(errorCallback);

            expect(() => sequencer.tryRun()).toThrow('Variable import error');
            expect(sequencer._currentDepth).toBe(0);
        });

        it('processes imports that become ready during execution', () => {
            const callOrder = [];
            let trigger2;

            const callback1 = vi.fn(() => {
                callOrder.push('callback1');
                // Make the second import ready during execution of first
                trigger2('arg2');
            });

            const callback2 = vi.fn(() => {
                callOrder.push('callback2');
            });

            const trigger1 = sequencer.addImport(callback1);
            trigger2 = sequencer.addImport(callback2);

            trigger1('arg1');

            expect(callOrder).toEqual(['callback1', 'callback2']);
        });

        it('handles variable imports that add new imports', () => {
            const callOrder = [];

            const variableCallback = vi.fn(() => {
                callOrder.push('variable');
                const newImportCallback = vi.fn(() =>
                    callOrder.push('newImport')
                );
                const trigger = sequencer.addImport(newImportCallback);
                trigger();
            });

            const regularCallback = vi.fn(() => callOrder.push('regular'));

            sequencer.addVariableImport(variableCallback);
            const trigger = sequencer.addImport(regularCallback);
            trigger();

            expect(callOrder).toEqual(['regular', 'variable', 'newImport']);
        });
    });

    describe('integration scenarios', () => {
        it('handles complex workflow with multiple import types', () => {
            const results = [];

            // Add some variable imports
            sequencer.addVariableImport(() => results.push('var1'));
            sequencer.addVariableImport(() => results.push('var2'));

            // Add regular imports
            const trigger1 = sequencer.addImport(() => results.push('import1'));
            const trigger2 = sequencer.addImport(() => results.push('import2'));

            // Add more variable imports
            sequencer.addVariableImport(() => results.push('var3'));

            // Trigger imports
            trigger2();
            trigger1();

            expect(results).toEqual([
                'import1',
                'import2',
                'var1',
                'var2',
                'var3'
            ]);
            expect(onSequencerEmpty).toHaveBeenCalled();
        });

        it('handles recursive import additions', () => {
            const results = [];
            let recursionCount = 0;

            const recursiveCallback = vi.fn(() => {
                results.push(`recursive${recursionCount}`);
                recursionCount++;

                if (recursionCount < 3) {
                    const trigger = sequencer.addImport(recursiveCallback);
                    trigger();
                }
            });

            const trigger = sequencer.addImport(recursiveCallback);
            trigger();

            expect(results).toEqual(['recursive0', 'recursive1', 'recursive2']);
            expect(onSequencerEmpty).toHaveBeenCalled();
        });

        it('maintains correct state when no imports are added', () => {
            sequencer.tryRun();

            expect(sequencer.imports).toEqual([]);
            expect(sequencer.variableImports).toEqual([]);
            expect(sequencer._currentDepth).toBe(0);
            expect(onSequencerEmpty).toHaveBeenCalled();
        });
    });
});
