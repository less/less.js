import { describe, it, expect, vi } from 'vitest';
import Assignment from './assignment';
import Node from './node';

describe('Assignment', () => {
    it('should create an assignment with key and value', () => {
        const assignment = new Assignment('color', '#000');
        expect(assignment.key).toBe('color');
        expect(assignment.value).toBe('#000');
    });

    it('should handle null/undefined key and value', () => {
        const assignment1 = new Assignment(null, '#000');
        expect(assignment1.key).toBeNull();
        expect(assignment1.value).toBe('#000');

        const assignment2 = new Assignment('color', undefined);
        expect(assignment2.key).toBe('color');
        expect(assignment2.value).toBeUndefined();
    });

    it('should inherit from Node', () => {
        const assignment = new Assignment('color', '#000');
        expect(assignment instanceof Node).toBe(true);
    });

    describe('accept', () => {
        it('should visit the value with the visitor', () => {
            const assignment = new Assignment('color', '#000');
            const mockVisitor = {
                visit: vi.fn().mockReturnValue('#fff')
            };

            assignment.accept(mockVisitor);
            expect(mockVisitor.visit).toHaveBeenCalledWith('#000');
            expect(assignment.value).toBe('#fff');
        });

        it('should always visit the value, even if it has no eval method', () => {
            const assignment = new Assignment('color', '#000');
            const mockVisitor = {
                visit: vi.fn().mockReturnValue('#fff')
            };

            assignment.accept(mockVisitor);
            expect(mockVisitor.visit).toHaveBeenCalledWith('#000');
            expect(assignment.value).toBe('#fff');
        });

        it('should handle null/undefined visitor', () => {
            const assignment = new Assignment('color', '#000');
            expect(() => assignment.accept(null)).toThrow(
                "Cannot read properties of null (reading 'visit')"
            );
            expect(() => assignment.accept(undefined)).toThrow(
                "Cannot read properties of undefined (reading 'visit')"
            );
        });

        it('should handle visitor that throws error', () => {
            const assignment = new Assignment('color', '#000');
            const mockVisitor = {
                visit: vi.fn().mockImplementation(() => {
                    throw new Error('Visitor error');
                })
            };

            expect(() => assignment.accept(mockVisitor)).toThrow(
                'Visitor error'
            );
        });

        it('should handle visitor that returns null/undefined', () => {
            const assignment = new Assignment('color', '#000');
            const mockVisitor = {
                visit: vi.fn().mockReturnValue(null)
            };

            assignment.accept(mockVisitor);
            expect(assignment.value).toBeNull();
        });
    });

    describe('eval', () => {
        it('should evaluate the value if it has an eval method', () => {
            const mockValue = {
                eval: vi.fn().mockReturnValue('#fff')
            };
            const assignment = new Assignment('color', mockValue);
            const context = {};

            const result = assignment.eval(context);
            expect(mockValue.eval).toHaveBeenCalledWith(context);
            expect(result).toBeInstanceOf(Assignment);
            expect(result.key).toBe('color');
            expect(result.value).toBe('#fff');
        });

        it('should return the assignment unchanged if value has no eval method', () => {
            const assignment = new Assignment('color', '#000');
            const context = {};

            const result = assignment.eval(context);
            expect(result).toBe(assignment);
            expect(result.key).toBe('color');
            expect(result.value).toBe('#000');
        });

        it('should handle null/undefined context', () => {
            const assignment = new Assignment('color', '#000');
            expect(() => assignment.eval(null)).not.toThrow();
            expect(() => assignment.eval(undefined)).not.toThrow();
        });

        it('should handle value.eval that throws error', () => {
            const mockValue = {
                eval: vi.fn().mockImplementation(() => {
                    throw new Error('Eval error');
                })
            };
            const assignment = new Assignment('color', mockValue);
            const context = {};

            expect(() => assignment.eval(context)).toThrow('Eval error');
        });

        it('should handle value.eval that returns null/undefined', () => {
            const mockValue = {
                eval: vi.fn().mockReturnValue(null)
            };
            const assignment = new Assignment('color', mockValue);
            const context = {};

            const result = assignment.eval(context);
            expect(result.value).toBeNull();
        });
    });

    describe('genCSS', () => {
        it('should generate CSS with key and value', () => {
            const assignment = new Assignment('color', '#000');
            const output = {
                add: vi.fn()
            };
            const context = {};

            assignment.genCSS(context, output);
            expect(output.add).toHaveBeenCalledWith('color=');
            expect(output.add).toHaveBeenCalledWith('#000');
        });

        it('should handle values with genCSS method', () => {
            const mockValue = {
                genCSS: vi.fn()
            };
            const assignment = new Assignment('color', mockValue);
            const output = {
                add: vi.fn()
            };
            const context = {};

            assignment.genCSS(context, output);
            expect(output.add).toHaveBeenCalledWith('color=');
            expect(mockValue.genCSS).toHaveBeenCalledWith(context, output);
        });

        it('should handle empty or null values', () => {
            const assignment = new Assignment('color', '');
            const output = {
                add: vi.fn()
            };
            const context = {};

            assignment.genCSS(context, output);
            expect(output.add).toHaveBeenCalledWith('color=');
            expect(output.add).toHaveBeenCalledWith('');
        });

        it('should handle null/undefined context and output', () => {
            const assignment = new Assignment('color', '#000');
            // context can be null/undefined since it's only used if value has genCSS
            expect(() =>
                assignment.genCSS(null, { add: vi.fn() })
            ).not.toThrow();
            expect(() =>
                assignment.genCSS(undefined, { add: vi.fn() })
            ).not.toThrow();

            // output cannot be null/undefined as it's used directly
            expect(() => assignment.genCSS({}, null)).toThrow(
                "Cannot read properties of null (reading 'add')"
            );
            expect(() => assignment.genCSS({}, undefined)).toThrow(
                "Cannot read properties of undefined (reading 'add')"
            );
        });

        it('should handle value.genCSS that throws error', () => {
            const mockValue = {
                genCSS: vi.fn().mockImplementation(() => {
                    throw new Error('genCSS error');
                })
            };
            const assignment = new Assignment('color', mockValue);
            const output = {
                add: vi.fn()
            };
            const context = {};

            expect(() => assignment.genCSS(context, output)).toThrow(
                'genCSS error'
            );
        });

        it('should handle special characters in key and value', () => {
            const assignment = new Assignment(
                'color:special',
                'value:with:colons'
            );
            const output = {
                add: vi.fn()
            };
            const context = {};

            assignment.genCSS(context, output);
            expect(output.add).toHaveBeenCalledWith('color:special=');
            expect(output.add).toHaveBeenCalledWith('value:with:colons');
        });
    });
});
