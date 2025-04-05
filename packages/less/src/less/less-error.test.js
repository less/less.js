import { describe, it, expect } from 'vitest';
import LessError from './less-error';

// A simple identity stylize function for testing purposes
const identityStylize = (str) => str;

describe('LessError', () => {
    it('should behave correctly without fileContentMap', () => {
        const errorObj = { message: 'Test error', stack: 'Test stack' };
        const lessErr = new LessError(errorObj);
        expect(lessErr.message).toBe('Test error');
        expect(lessErr.stack).toBe('Test stack');
        expect(lessErr.filename).toBeUndefined();
        expect(lessErr.line).toBeUndefined();
        expect(lessErr.column).toBeUndefined();

        const str = lessErr.toString({ stylize: identityStylize });
        expect(str).toContain('Test error');
    });

    it('should compute location correctly when fileContentMap is provided', () => {
        const fileContent = 'first line\nsecond line\nthird line\nfourth line';
        const fileContentMap = { contents: { 'test.less': fileContent } };
        const errorObj = {
            message: 'Syntax error occurred',
            index: 12, // falls in 'second line'
            call: 23, // falls in 'third line'
            stack: 'Dummy stack',
            filename: 'test.less'
        };
        const lessErr = new LessError(errorObj, fileContentMap);

        // getLocation for index 12 on "first line\nsecond line\n..." should return line:1, column:1 so this.line becomes 2 and column remains 1
        expect(lessErr.type).toBe('Syntax');
        expect(lessErr.filename).toBe('test.less');
        expect(lessErr.line).toBe(2);
        expect(lessErr.column).toBe(1);

        // For call index 23, the substring "first line\nsecond line\n" contains 2 newlines, so callLine becomes 3, and callExtract should be 'third line'
        expect(lessErr.callLine).toBe(3);
        expect(lessErr.callExtract).toBe('third line');

        // extract should be [ first line, second line, third line ]
        expect(lessErr.extract).toEqual([
            'first line',
            'second line',
            'third line'
        ]);

        const str = lessErr.toString({ stylize: identityStylize });
        // Since error type is not warning, it appends 'Error' to type
        expect(str).toContain('SyntaxError: Syntax error occurred');
        expect(str).toContain('in test.less');
        expect(str).toContain('on line 2, column 2:');
        expect(str).toContain('1 first line');
        expect(str).toContain('3 third line');
        expect(str).toContain('from test.less');
    });

    it('should allow custom stylize function and throw error if it is not a function', () => {
        const fileContent = 'alpha\nbeta\ngamma\ndelta';
        const fileContentMap = { contents: { 'sample.less': fileContent } };
        const errorObj = {
            message: 'Custom stylize test',
            index: 12,
            call: 23,
            stack: 'Dummy stack',
            filename: 'sample.less',
            type: 'Warning'
        };
        const lessErr = new LessError(errorObj, fileContentMap);

        // Custom stylize function that wraps styled text
        const customStylize = (str, style) => `<${style}>${str}</${style}>`;
        const out = lessErr.toString({ stylize: customStylize });
        // For Warning type, isWarning is true so type remains unchanged
        expect(out).toContain('Warning: Custom stylize test');
        expect(out).toContain('<yellow> in </yellow>');

        // Expect to throw if stylize option is not a function
        expect(() => lessErr.toString({ stylize: 123 })).toThrow(
            'options.stylize should be a function, got a number!'
        );
    });

    it('should handle missing e.call gracefully', () => {
        const fileContent = 'one\ntwo\nthree\nfour';
        const fileContentMap = { contents: { 'test.less': fileContent } };
        const errorObj = {
            message: 'No call test',
            index: 5,
            stack: 'Dummy stack',
            filename: 'test.less',
            type: 'Syntax'
        };
        const lessErr = new LessError(errorObj, fileContentMap);

        // When e.call is missing, callLine becomes NaN and callExtract is undefined
        expect(lessErr.callLine).toBeNaN();
        expect(lessErr.callExtract).toBeUndefined();
    });

    it('should handle fileContentMap with missing file content', () => {
        const fileContentMap = { contents: {} };
        const errorObj = {
            message: 'Missing file content',
            stack: 'Stack trace',
            filename: 'missing.less',
            type: 'Syntax'
        };
        const lessErr = new LessError(errorObj, fileContentMap);
        // When file content is missing, line-related properties should be null/undefined
        expect(lessErr.line).toBeNull();
        expect(lessErr.column).toBe(-1);
        expect(lessErr.extract).toEqual([undefined, undefined, undefined]);
        expect(lessErr.callLine).toBeNaN();
        expect(lessErr.callExtract).toBeUndefined();

        // toString should still work
        const str = lessErr.toString();
        expect(str).toContain('SyntaxError: Missing file content');
        expect(str).toContain('in missing.less');
    });

    it('should derive line and column from anonymous function in stack when index is non-numeric', () => {
        const fileContent = 'first\nsecond\nthird';
        const fileContentMap = { contents: { 'test.less': fileContent } };
        const errorObj = {
            message: 'Anon stack test',
            stack: '<anonymous>:5:10',
            filename: 'test.less',
            type: 'Syntax'
        };
        const lessErr = new LessError(errorObj, fileContentMap);
        // After processing the anonymous function in the stack, line should be computed and column should be set to 10
        expect(lessErr.line).not.toBeNull();
        expect(lessErr.column).toBe(10);
    });

    it('should have proper prototype chain and constructor set', () => {
        const errorObj = { message: 'Prototype test', stack: 'Test stack' };
        const lessErr = new LessError(errorObj);
        expect(lessErr instanceof Error).toBe(true);
        expect(lessErr.constructor).toBe(LessError);
    });

    it('should handle error near start of file', () => {
        const fileContent = 'first line\nsecond line\nthird line';
        const fileContentMap = { contents: { 'test.less': fileContent } };
        const errorObj = {
            message: 'Error at start',
            index: 0,
            stack: 'Stack trace',
            filename: 'test.less',
            type: 'Parse'
        };
        const lessErr = new LessError(errorObj, fileContentMap);
        expect(lessErr.extract).toEqual([
            undefined,
            'first line',
            'second line'
        ]);
    });

    it('should handle error near end of file', () => {
        const fileContent = 'first line\nsecond line\nthird line';
        const fileContentMap = { contents: { 'test.less': fileContent } };
        const errorObj = {
            message: 'Error at end',
            index: fileContent.length - 1,
            stack: 'Stack trace',
            filename: 'test.less',
            type: 'Parse'
        };
        const lessErr = new LessError(errorObj, fileContentMap);
        expect(lessErr.extract).toEqual([
            'second line',
            'third line',
            undefined
        ]);
    });

    it('should use currentFilename when e.filename is not provided', () => {
        const fileContent = 'test content';
        const fileContentMap = { contents: { 'current.less': fileContent } };
        const errorObj = {
            message: 'Error message',
            index: 0,
            stack: 'Stack trace'
        };
        const lessErr = new LessError(errorObj, fileContentMap, 'current.less');
        expect(lessErr.filename).toBe('current.less');
    });

    it('should format error message correctly without stylize option', () => {
        const fileContent = 'test\ncontent\nhere';
        const fileContentMap = { contents: { 'test.less': fileContent } };
        const errorObj = {
            message: 'Test error',
            index: 6,
            stack: 'Stack trace',
            filename: 'test.less',
            type: 'Eval'
        };
        const lessErr = new LessError(errorObj, fileContentMap);
        const str = lessErr.toString();
        // Verify the exact format without stylize
        expect(str).toMatch(/^EvalError: Test error/);
        expect(str).toMatch(/in test\.less/);
        expect(str).toMatch(/on line \d+, column \d+:/);
    });

    it('should handle different error types correctly', () => {
        const types = ['Parse', 'Syntax', 'Eval', 'Runtime', 'Warning'];
        types.forEach((type) => {
            const errorObj = {
                message: 'Test',
                stack: 'Stack'
            };
            const lessErr = new LessError(errorObj);
            lessErr.type = type; // Set type after construction
            const str = lessErr.toString();
            if (type === 'Warning') {
                expect(str).toContain('Warning: Test');
            } else {
                expect(str).toContain(`${type}Error: Test`);
            }
        });
    });

    it('should handle complex anonymous function stack traces', () => {
        const fileContent = 'test\nfile\ncontent';
        const fileContentMap = { contents: { 'test.less': fileContent } };

        // Test with <anonymous> format
        const errorObj1 = {
            message: 'Test error',
            stack: 'Error: Test error\n    at <anonymous>:5:10',
            type: 'Runtime',
            index: undefined, // Force stack trace parsing
            filename: 'test.less'
        };
        const lessErr1 = new LessError(errorObj1, fileContentMap);
        expect(lessErr1.column).toBe(10);

        // Test with Function format
        const errorObj2 = {
            message: 'Test error',
            stack: 'Error: Test error\n    at Function:8:15',
            type: 'Runtime',
            index: undefined, // Force stack trace parsing
            filename: 'test.less'
        };
        const lessErr2 = new LessError(errorObj2, fileContentMap);
        expect(lessErr2.column).toBe(15);

        // Verify that line numbers are extracted from stack
        expect(typeof lessErr1.line).toBe('number');
        expect(typeof lessErr2.line).toBe('number');
        expect(lessErr1.line).toBeGreaterThan(0);
        expect(lessErr2.line).toBeGreaterThan(0);
    });

    it('should handle empty or malformed input gracefully', () => {
        const testCases = [
            { input: '', index: 0 },
            { input: '\n', index: 0 },
            { input: '\n\n\n', index: 2 }
        ];

        testCases.forEach(({ input, index }) => {
            const fileContentMap = { contents: { 'test.less': input } };
            const errorObj = {
                message: 'Test error',
                index,
                filename: 'test.less'
            };
            const lessErr = new LessError(errorObj, fileContentMap);
            expect(() => lessErr.toString()).not.toThrow();
        });
    });

    it('should handle input validation edge cases', () => {
        // Test with null/undefined error objects - these should throw since the code doesn't handle them
        expect(() => new LessError(null)).toThrow(TypeError);
        expect(() => new LessError(undefined)).toThrow(TypeError);

        // Test with empty object - this should work
        const emptyObj = new LessError({});
        expect(emptyObj.message).toBeUndefined();

        // Test with non-string message
        const nonStringMsg = new LessError({ message: 123 });
        expect(nonStringMsg.message).toBe(123);

        // Test with non-numeric index
        const nonNumericIndex = new LessError({
            message: 'test',
            index: 'not a number',
            filename: 'test.less'
        });
        expect(nonNumericIndex.line).toBeUndefined();
    });

    it('should handle complex stack traces correctly', () => {
        const multiLineStack = `Error: Test error
            at Object.<anonymous> (/path/to/file.js:10:20)
            at Module._compile (internal/modules/cjs/loader.js:999:30)
            at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)`;

        const errorWithStack = new LessError({
            message: 'Complex stack',
            stack: multiLineStack,
            filename: 'test.less'
        });

        expect(errorWithStack.stack).toBe(multiLineStack);

        // Test malformed stack
        const malformedStack = new LessError({
            message: 'Bad stack',
            stack: 'Not a real stack trace',
            filename: 'test.less'
        });
        expect(malformedStack.toString()).toContain('Bad stack');
    });

    it('should handle special characters in source content', () => {
        const specialContent =
            'line\u0000with\u0001null\nline\u{1F600}with\u{1F601}emoji';
        const fileContentMap = { contents: { 'test.less': specialContent } };
        const errorObj = {
            message: 'Special chars test',
            index: 5,
            filename: 'test.less'
        };
        const lessErr = new LessError(errorObj, fileContentMap);
        expect(() => lessErr.toString()).not.toThrow();
    });

    it('should handle extreme line and column numbers', () => {
        const largeContent = Array(1000).fill('x').join('\n');
        const fileContentMap = { contents: { 'test.less': largeContent } };

        // Test very large line number
        const largeLineErr = new LessError(
            {
                message: 'Large line test',
                index: largeContent.length - 1,
                filename: 'test.less'
            },
            fileContentMap
        );
        expect(() => largeLineErr.toString()).not.toThrow();

        // Test with negative index - the code will still calculate a line number
        // based on the input content length
        const negativeErr = new LessError(
            {
                message: 'Negative index test',
                index: -1,
                filename: 'test.less'
            },
            fileContentMap
        );
        // The line will be calculated based on the content length
        expect(negativeErr.line).toBe(1000);
        expect(negativeErr.column).toBe(-1);
    });

    it('should validate stylize function behavior', () => {
        const errorObj = {
            message: 'Stylize test',
            filename: 'test.less'
        };
        const lessErr = new LessError(errorObj);

        // Test with stylize returning different types
        const numberStylize = () => 42;
        const str = lessErr.toString({ stylize: numberStylize });
        expect(typeof str).toBe('string');

        // Test with null/undefined return
        const nullStylize = () => null;
        expect(() => lessErr.toString({ stylize: nullStylize })).not.toThrow();
    });

    describe('Additional Edge Cases', () => {
        describe('type coercion cases', () => {
            // Create a minimal fileContentMap for all tests
            const dummyFileMap = { contents: { 'test.less': '' } };

            it('should handle undefined type', () => {
                const lessErr = new LessError(
                    {
                        message: 'test',
                        type: undefined,
                        filename: 'test.less'
                    },
                    dummyFileMap
                );
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe(
                    'SyntaxError: test in test.less'
                ); // Falls back to 'Syntax'
            });

            it('should handle null type', () => {
                const lessErr = new LessError(
                    {
                        message: 'test',
                        type: null,
                        filename: 'test.less'
                    },
                    dummyFileMap
                );
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe(
                    'SyntaxError: test in test.less'
                ); // Falls back to 'Syntax'
            });

            it('should handle Warning type', () => {
                const lessErr = new LessError(
                    {
                        message: 'test',
                        type: 'Warning',
                        filename: 'test.less'
                    },
                    dummyFileMap
                );
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe('Warning: test in test.less');
            });

            it('should handle Syntax type', () => {
                const lessErr = new LessError(
                    {
                        message: 'test',
                        type: 'Syntax',
                        filename: 'test.less'
                    },
                    dummyFileMap
                );
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe(
                    'SyntaxError: test in test.less'
                );
            });

            it('should handle empty string type', () => {
                const lessErr = new LessError(
                    {
                        message: 'test',
                        type: '',
                        filename: 'test.less'
                    },
                    dummyFileMap
                );
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe(
                    'SyntaxError: test in test.less'
                ); // Empty string falls back to 'Syntax'
            });

            it('should handle missing fileContentMap', () => {
                const lessErr = new LessError({
                    message: 'test',
                    type: 'Syntax',
                    filename: 'test.less'
                });
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe('undefinedError: test'); // No filename in output when fileContentMap missing
            });

            it('should handle error without filename', () => {
                const lessErr = new LessError(
                    {
                        message: 'test',
                        type: 'Syntax'
                    },
                    dummyFileMap
                );
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe('undefinedError: test'); // No filename in output when filename missing
            });

            it('should handle error with currentFilename', () => {
                const lessErr = new LessError(
                    {
                        message: 'test',
                        type: 'Syntax'
                    },
                    dummyFileMap,
                    'current.less'
                );
                const str = lessErr.toString();
                expect(str.split('\n')[0]).toBe(
                    'SyntaxError: test in current.less'
                );
            });
        });

        it('should handle extract array elements correctly', () => {
            const fileContent = 'line1\nline2\nline3\nline4\nline5';
            const fileContentMap = { contents: { 'test.less': fileContent } };
            const errorObj = {
                message: 'test',
                index: fileContent.indexOf('line3'),
                filename: 'test.less',
                type: 'Syntax'
            };
            const lessErr = new LessError(errorObj, fileContentMap);

            // The extract array should contain the lines around the error
            expect(lessErr.extract).toEqual(['line2', 'line3', 'line4']);

            // Test toString output with the extract
            const str = lessErr.toString();
            expect(str).toContain('line2');
            expect(str).toContain('line3');
            expect(str).toContain('line4');
        });

        it('should handle column edge cases', () => {
            const fileContent = 'short\nverylongline\nend';
            const fileContentMap = { contents: { 'test.less': fileContent } };

            // Test column at end of line
            const endCol = new LessError(
                {
                    message: 'test',
                    index: fileContent.indexOf('short') + 4,
                    filename: 'test.less'
                },
                fileContentMap
            );
            expect(endCol.column).toBe(4);

            // Test column at start of line
            const startCol = new LessError(
                {
                    message: 'test',
                    index: fileContent.indexOf('verylongline'),
                    filename: 'test.less'
                },
                fileContentMap
            );
            expect(startCol.column).toBe(0);
        });

        it('should handle malformed fileContentMap gracefully', () => {
            // Test with null fileContentMap
            const err1 = new LessError(
                { message: 'test', filename: 'test.less' },
                null
            );
            expect(err1.toString()).toContain('test');

            // Test with empty fileContentMap
            const err2 = new LessError(
                { message: 'test', filename: 'test.less' },
                { contents: {} }
            );
            expect(err2.toString()).toContain('test');

            // Test with empty string content
            const err3 = new LessError(
                { message: 'test', filename: 'test.less' },
                { contents: { 'test.less': '' } }
            );
            expect(err3.toString()).toContain('test');
        });

        it('should handle stack trace parsing', () => {
            const errorObj = {
                message: 'test',
                stack: 'Error: test\n    at <anonymous>:1:1',
                filename: 'test.less'
            };
            const lessErr = new LessError(errorObj);
            expect(lessErr.toString()).toContain('test');
        });

        it('should handle unicode characters in stack traces', () => {
            const errorObj = {
                message: 'Unicode test 🚀',
                stack: 'Error: Unicode test 🚀\n    at <anonymous>:1:1',
                filename: 'test.less'
            };
            const lessErr = new LessError(errorObj);
            const str = lessErr.toString();
            expect(str).toContain('🚀');
        });

        it('should handle extract array with mixed undefined values', () => {
            const fileContent = 'line1\nline2\nline3';
            const fileContentMap = { contents: { 'test.less': fileContent } };
            const errorObj = {
                message: 'test',
                index: fileContent.indexOf('line2'),
                filename: 'test.less',
                type: 'Syntax'
            };
            const lessErr = new LessError(errorObj, fileContentMap);

            // Verify the normal extract array
            expect(lessErr.extract).toEqual(['line1', 'line2', 'line3']);

            // Test toString still works with missing extract
            lessErr.extract = undefined;
            const str = lessErr.toString();
            expect(str).toContain('test');
        });
    });
});
