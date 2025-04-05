import { describe, it, expect, vi } from 'vitest';
import Call from './call';
import Anonymous from './anonymous';
import FunctionCaller from '../functions/function-caller';

// Mock FunctionCaller
vi.mock('../functions/function-caller', () => {
    return {
        default: vi.fn().mockImplementation((name, context) => ({
            name,
            context,
            isValid: vi.fn(),
            call: vi.fn()
        }))
    };
});

describe('Call', () => {
    const mockFileInfo = { filename: 'test.less' };
    const mockIndex = 1;

    describe('constructor', () => {
        it('should create a Call node with correct properties', () => {
            const args = [new Anonymous('10px')];
            const call = new Call('rgb', args, mockIndex, mockFileInfo);

            expect(call.name).toBe('rgb');
            expect(call.args).toBe(args);
            expect(call._index).toBe(mockIndex);
            expect(call._fileInfo).toBe(mockFileInfo);
            expect(call.type).toBe('Call');
            expect(call.calc).toBe(false);
        });

        it('should handle undefined fileInfo and index', () => {
            const call = new Call('rgb', [], undefined, undefined);
            expect(call._index).toBeUndefined();
            expect(call._fileInfo).toBeUndefined();
        });

        it('should handle empty args array', () => {
            const call = new Call('rgb', [], mockIndex, mockFileInfo);
            expect(call.args).toEqual([]);
        });

        it('should set calc property to true for calc function', () => {
            const call = new Call('calc', [], mockIndex, mockFileInfo);
            expect(call.calc).toBe(true);
        });
    });

    describe('accept', () => {
        it('should visit args array if present', () => {
            const args = [new Anonymous('10px')];
            const call = new Call('rgb', args, mockIndex, mockFileInfo);
            const mockVisitor = {
                visitArray: vi.fn().mockReturnValue(['visited'])
            };

            call.accept(mockVisitor);

            expect(mockVisitor.visitArray).toHaveBeenCalledWith(args);
            expect(call.args).toEqual(['visited']);
        });

        it('should not throw if args is undefined', () => {
            const call = new Call('rgb', undefined, mockIndex, mockFileInfo);
            const mockVisitor = {
                visitArray: vi.fn()
            };

            expect(() => call.accept(mockVisitor)).not.toThrow();
            expect(mockVisitor.visitArray).not.toHaveBeenCalled();
        });
    });

    describe('eval', () => {
        const mockContext = {
            mathOn: true,
            inCalc: false,
            enterCalc: vi.fn(),
            exitCalc: vi.fn()
        };

        beforeEach(() => {
            vi.clearAllMocks();
            mockContext.mathOn = true;
            mockContext.inCalc = false;
        });

        it('should handle calc functions correctly', () => {
            const call = new Call('calc', [], mockIndex, mockFileInfo);
            call.eval(mockContext);

            expect(mockContext.enterCalc).toHaveBeenCalled();
            expect(mockContext.exitCalc).toHaveBeenCalled();
            expect(mockContext.mathOn).toBe(true); // Should restore original mathOn
        });

        it('should enter calc mode when context.inCalc is true', () => {
            mockContext.inCalc = true;
            const call = new Call('rgb', [], mockIndex, mockFileInfo);
            call.eval(mockContext);

            expect(mockContext.enterCalc).toHaveBeenCalled();
            expect(mockContext.exitCalc).toHaveBeenCalled();
        });

        it('should temporarily toggle mathOn for non-calc functions', () => {
            const call = new Call('rgb', [], mockIndex, mockFileInfo);

            // Mock FunctionCaller to capture mathOn during execution
            let mathOnDuringExecution;
            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => {
                    mathOnDuringExecution = mockContext.mathOn;
                    return new Anonymous('result');
                }
            }));

            const originalMathOn = mockContext.mathOn;
            call.eval(mockContext);

            // During execution, mathOn should be true (!this.calc)
            expect(mathOnDuringExecution).toBe(true);
            // After execution, mathOn should be restored
            expect(mockContext.mathOn).toBe(originalMathOn);
        });

        it('should evaluate args when creating new Call node', () => {
            const mockArg = {
                eval: vi.fn().mockReturnValue('evaluated')
            };
            const call = new Call(
                'unknown',
                [mockArg],
                mockIndex,
                mockFileInfo
            );

            FunctionCaller.mockImplementation(() => ({
                isValid: () => false
            }));

            const result = call.eval(mockContext);
            expect(mockArg.eval).toHaveBeenCalledWith(mockContext);
            expect(result.args[0]).toBe('evaluated');
        });

        it('should handle errors with custom type', () => {
            const call = new Call('rgb', [], mockIndex, mockFileInfo);
            const error = new Error('test error');
            error.type = 'CustomError';
            error.lineNumber = 1;
            error.columnNumber = 1;

            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => {
                    throw error;
                }
            }));

            expect(() => call.eval(mockContext)).toThrow(
                expect.objectContaining({
                    type: 'CustomError',
                    message: 'Error evaluating function `rgb`: test error'
                })
            );
        });

        it('should handle successful function calls', () => {
            const args = [new Anonymous('10px')];
            const call = new Call('rgb', args, mockIndex, mockFileInfo);
            const mockResult = new Anonymous('result');

            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => mockResult
            }));

            const result = call.eval(mockContext);
            expect(result).toBe(mockResult);
            expect(result._index).toBe(mockIndex);
            expect(result._fileInfo).toBe(mockFileInfo);
        });

        it('should handle function call errors', () => {
            const call = new Call('rgb', [], mockIndex, mockFileInfo);
            const error = new Error('test error');
            error.lineNumber = 1;
            error.columnNumber = 1;

            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => {
                    throw error;
                }
            }));

            expect(() => call.eval(mockContext)).toThrow(
                expect.objectContaining({
                    type: 'Runtime',
                    message: 'Error evaluating function `rgb`: test error',
                    index: mockIndex,
                    filename: mockFileInfo.filename,
                    line: 1,
                    column: 1
                })
            );
        });

        it('should handle errors without line/column numbers', () => {
            const call = new Call('rgb', [], mockIndex, mockFileInfo);
            const error = new Error('test error');

            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => {
                    throw error;
                }
            }));

            expect(() => call.eval(mockContext)).toThrow(
                expect.objectContaining({
                    type: 'Runtime',
                    message: 'Error evaluating function `rgb`: test error',
                    index: mockIndex,
                    filename: mockFileInfo.filename
                })
            );
        });

        it('should wrap non-Node results in Anonymous nodes', () => {
            const call = new Call('test', [], mockIndex, mockFileInfo);

            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => 'string result'
            }));

            const result = call.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('string result');
        });

        it('should handle falsy results as empty Anonymous nodes', () => {
            const call = new Call('test', [], mockIndex, mockFileInfo);

            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => false
            }));

            const result = call.eval(mockContext);
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe(null);
        });

        it('should handle undefined function results by creating new Call', () => {
            const args = [new Anonymous('10px')];
            const call = new Call('test', args, mockIndex, mockFileInfo);

            FunctionCaller.mockImplementation(() => ({
                isValid: () => true,
                call: () => undefined
            }));

            const result = call.eval(mockContext);
            expect(result).toBeInstanceOf(Call);
            expect(result.name).toBe('test');
            expect(result.args).toHaveLength(1);
        });

        it('should create new Call node when function is not found', () => {
            const args = [new Anonymous('10px')];
            const call = new Call('unknown', args, mockIndex, mockFileInfo);

            FunctionCaller.mockImplementation(() => ({
                isValid: () => false,
                call: vi.fn()
            }));

            const result = call.eval(mockContext);
            expect(result).toBeInstanceOf(Call);
            expect(result.name).toBe('unknown');
            expect(result.args).toHaveLength(1);
            expect(result._index).toBe(mockIndex);
            expect(result._fileInfo).toBe(mockFileInfo);
        });
    });

    describe('genCSS', () => {
        it('should generate correct CSS output', () => {
            const args = [
                new Anonymous('10px'),
                new Anonymous('20px'),
                new Anonymous('30px')
            ];
            const call = new Call('rgb', args, mockIndex, mockFileInfo);
            const output = {
                add: vi.fn()
            };

            call.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith(
                'rgb(',
                mockFileInfo,
                mockIndex
            );
            expect(output.add).toHaveBeenCalledWith(', ');
            expect(output.add).toHaveBeenCalledWith(')');
            expect(output.add).toHaveBeenCalledTimes(7); // name + 3 args + 2 commas + closing paren
        });

        it('should handle single argument without comma', () => {
            const args = [new Anonymous('10px')];
            const call = new Call('func', args, mockIndex, mockFileInfo);
            const output = {
                add: vi.fn()
            };

            call.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith(
                'func(',
                mockFileInfo,
                mockIndex
            );
            expect(output.add).not.toHaveBeenCalledWith(', ');
            expect(output.add).toHaveBeenCalledWith(')');
        });

        it('should handle empty args array', () => {
            const call = new Call('func', [], mockIndex, mockFileInfo);
            const output = {
                add: vi.fn()
            };

            call.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith(
                'func(',
                mockFileInfo,
                mockIndex
            );
            expect(output.add).toHaveBeenCalledWith(')');
            expect(output.add).toHaveBeenCalledTimes(2);
        });

        it('should handle nested function calls in arguments', () => {
            const innerCall = new Call(
                'rgba',
                [new Anonymous('255')],
                mockIndex,
                mockFileInfo
            );
            const call = new Call(
                'darken',
                [innerCall],
                mockIndex,
                mockFileInfo
            );
            const output = {
                add: vi.fn()
            };

            call.genCSS({}, output);

            expect(output.add).toHaveBeenCalledWith(
                'darken(',
                mockFileInfo,
                mockIndex
            );
            expect(output.add).toHaveBeenCalledWith(
                'rgba(',
                mockFileInfo,
                mockIndex
            );
            expect(output.add).toHaveBeenCalledWith(')');
            expect(output.add).toHaveBeenCalledTimes(5); // darken( + rgba( + 255 + ) + )
        });

        it('should call genCSS on each argument', () => {
            const args = [{ genCSS: vi.fn() }, { genCSS: vi.fn() }];
            const call = new Call('rgb', args, mockIndex, mockFileInfo);
            const context = {};
            const output = { add: vi.fn() };

            call.genCSS(context, output);

            args.forEach((arg) => {
                expect(arg.genCSS).toHaveBeenCalledWith(context, output);
            });
        });

        it('should insert commas in correct order for multiple arguments', () => {
            const args = [
                new Anonymous('10px'),
                new Anonymous('20px'),
                new Anonymous('30px')
            ];
            const call = new Call('rgb', args, mockIndex, mockFileInfo);
            const output = {
                add: vi.fn()
            };
            const addCalls = [];
            output.add.mockImplementation((...args) => {
                addCalls.push(args[0]);
            });

            call.genCSS({}, output);

            // Verify the order of function name, args, and commas
            expect(addCalls).toEqual([
                'rgb(',
                '10px',
                ', ',
                '20px',
                ', ',
                '30px',
                ')'
            ]);
        });
    });
});
