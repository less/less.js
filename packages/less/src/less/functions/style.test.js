import { describe, it, expect } from 'vitest';
import styleFunctions from './style.js';
import Quoted from '../tree/quoted.js';
import Node from '../tree/node.js';
import Variable from '../tree/variable.js';

describe('Style Functions', () => {
    describe('style function', () => {
        // Mock context for testing
        const mockContext = {
            compress: false,
            frames: []
        };

        const mockThis = {
            index: 0,
            currentFileInfo: {},
            context: mockContext
        };

        it('should return undefined with no arguments', () => {
            const result = styleFunctions.style.call(mockThis);
            expect(result).toBeUndefined();
        });

        it('should handle single quoted argument', () => {
            const arg1 = new Quoted('"', 'color', false);
            
            // Mock the Variable.eval to return a simple value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => 'blue'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(blue)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle single unquoted argument', () => {
            const arg1 = new Quoted('', 'background', false);
            
            // Mock the Variable.eval to return a simple value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => 'red'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(red)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle compressed context', () => {
            const compressedContext = {
                compress: true,
                frames: []
            };

            const compressedThis = {
                index: 0,
                currentFileInfo: {},
                context: compressedContext
            };

            const arg1 = new Quoted('"', 'font-size', false);
            
            // Mock the Variable.eval to return multiple values
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '14px'
                };
            };

            const result = styleFunctions.style.call(compressedThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(14px)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable that evaluates to complex value', () => {
            const arg1 = new Quoted('"', 'margin', false);
            
            // Mock the Variable.eval to return a complex CSS value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '10px 20px 30px 40px'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(10px 20px 30px 40px)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable that evaluates to quoted string', () => {
            const arg1 = new Quoted('"', 'content', false);
            
            // Mock the Variable.eval to return a quoted value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '"Hello World"'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style("Hello World")');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable that evaluates to numeric value', () => {
            const arg1 = new Quoted('"', 'z-index', false);
            
            // Mock the Variable.eval to return a numeric value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '999'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(999)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable with units', () => {
            const arg1 = new Quoted('"', 'width', false);
            
            // Mock the Variable.eval to return a value with units
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '100%'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(100%)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable with color value', () => {
            const arg1 = new Quoted('"', 'background-color', false);
            
            // Mock the Variable.eval to return a color value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '#ff0000'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(#ff0000)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle empty string argument', () => {
            const arg1 = new Quoted('"', '', false);
            
            // Mock the Variable.eval to return empty value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => ''
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style()');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable with special characters', () => {
            const arg1 = new Quoted('"', 'custom-prop', false);
            
            // Mock the Variable.eval to return value with special characters
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => 'calc(100% - 20px)'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(calc(100% - 20px))');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable that fails to evaluate', () => {
            const arg1 = new Quoted('"', 'undefined-var', false);
            
            // Mock the Variable.eval to throw an error
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                throw new Error('Variable not found');
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            // Should return undefined when evaluation fails
            expect(result).toBeUndefined();
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle single quote in argument value', () => {
            const arg1 = new Quoted("'", 'font-family', false);
            
            // Mock the Variable.eval to return a font family value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => "'Arial', sans-serif"
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe("style('Arial', sans-serif)");
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable with boolean-like value', () => {
            const arg1 = new Quoted('"', 'visibility', false);
            
            // Mock the Variable.eval to return a boolean-like CSS value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => 'hidden'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(hidden)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable with URL value', () => {
            const arg1 = new Quoted('"', 'background-image', false);
            
            // Mock the Variable.eval to return a URL value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => 'url(image.png)'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(url(image.png))');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle variable with multiple space-separated values', () => {
            const arg1 = new Quoted('"', 'transform', false);
            
            // Mock the Variable.eval to return multiple transform values
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => 'rotate(45deg) scale(1.2)'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(rotate(45deg) scale(1.2))');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle argument with unicode characters', () => {
            const arg1 = new Quoted('"', 'content-unicode', false);
            
            // Mock the Variable.eval to return unicode content
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '"héllo wørld 🌍"'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style("héllo wørld 🌍")');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle very long CSS property name', () => {
            const longPropName = 'very-long-custom-property-name-that-is-unusually-long';
            const arg1 = new Quoted('"', longPropName, false);
            
            // Mock the Variable.eval to return a simple value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => 'value'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(value)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle different file info context', () => {
            const differentFileThis = {
                index: 5,
                currentFileInfo: { filename: 'test.less' },
                context: mockContext
            };

            const arg1 = new Quoted('"', 'border', false);
            
            // Mock the Variable.eval to return a border value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '1px solid black'
                };
            };

            const result = styleFunctions.style.call(differentFileThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(1px solid black)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });

        it('should handle CSS custom property', () => {
            const arg1 = new Quoted('"', '--main-color', false);
            
            // Mock the Variable.eval to return a CSS custom property value
            const originalEval = Variable.prototype.eval;
            Variable.prototype.eval = function() {
                return {
                    toCSS: () => '#123456'
                };
            };

            const result = styleFunctions.style.call(mockThis, arg1);
            
            expect(result).toBeInstanceOf(Node);
            expect(result.name).toBe('style(#123456)');
            
            // Restore original
            Variable.prototype.eval = originalEval;
        });
    });
});