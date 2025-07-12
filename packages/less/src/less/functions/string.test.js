import { describe, it, expect } from 'vitest';
import stringFunctions from './string.js';
import Quoted from '../tree/quoted.js';
import Anonymous from '../tree/anonymous.js';
import JavaScript from '../tree/javascript.js';

describe('String Functions', () => {
    describe('e function', () => {
        it('should escape a simple string', () => {
            const input = new Quoted('"', 'hello world', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('hello world');
            expect(result.escaped).toBe(true);
        });

        it('should handle empty string', () => {
            const input = new Quoted('"', '', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('');
            expect(result.escaped).toBe(true);
        });

        it('should handle single quote string', () => {
            const input = new Quoted("'", 'test string', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('test string');
            expect(result.escaped).toBe(true);
        });

        it('should handle unquoted string', () => {
            const input = new Quoted('', 'unquoted', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('unquoted');
            expect(result.escaped).toBe(true);
        });

        it('should handle string with special characters', () => {
            const input = new Quoted('"', 'hello\\nworld\\ttab', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('hello\\nworld\\ttab');
            expect(result.escaped).toBe(true);
        });

        it('should handle JavaScript node with evaluated property', () => {
            const jsNode = new JavaScript('console.log("test")', 0, false);
            jsNode.evaluated = 'test output';
            
            const result = stringFunctions.e(jsNode);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('test output');
            expect(result.escaped).toBe(true);
        });

        it('should handle string with quotes inside', () => {
            const input = new Quoted('"', 'say "hello" to world', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('say "hello" to world');
            expect(result.escaped).toBe(true);
        });

        it('should handle string with unicode characters', () => {
            const input = new Quoted('"', 'héllo wørld 🌍', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('héllo wørld 🌍');
            expect(result.escaped).toBe(true);
        });

        it('should handle very long string', () => {
            const longString = 'a'.repeat(1000);
            const input = new Quoted('"', longString, false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe(longString);
            expect(result.escaped).toBe(true);
        });

        it('should handle string with backslashes', () => {
            const input = new Quoted('"', 'path\\to\\file', false);
            const result = stringFunctions.e(input);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.quote).toBe('"');
            expect(result.value).toBe('path\\to\\file');
            expect(result.escaped).toBe(true);
        });
    });

    describe('escape function', () => {
        it('should escape basic URI characters', () => {
            const input = new Quoted('"', 'hello world', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('hello%20world');
        });

        it('should escape equals sign', () => {
            const input = new Quoted('"', 'key=value', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('key%3Dvalue');
        });

        it('should escape colon', () => {
            const input = new Quoted('"', 'http://example.com', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('http%3A//example.com');
        });

        it('should escape hash', () => {
            const input = new Quoted('"', 'url#fragment', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('url%23fragment');
        });

        it('should escape semicolon', () => {
            const input = new Quoted('"', 'param1=value1;param2=value2', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('param1%3Dvalue1%3Bparam2%3Dvalue2');
        });

        it('should escape parentheses', () => {
            const input = new Quoted('"', 'function(arg)', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('function%28arg%29');
        });

        it('should escape all special characters together', () => {
            const input = new Quoted('"', 'url(http://example.com/path?key=value#section);', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('url%28http%3A//example.com/path?key%3Dvalue%23section%29%3B');
        });

        it('should handle empty string', () => {
            const input = new Quoted('"', '', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('');
        });

        it('should handle string with no special characters', () => {
            const input = new Quoted('"', 'plaintext', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('plaintext');
        });

        it('should handle unicode characters', () => {
            const input = new Quoted('"', 'héllo wørld 🌍', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('h%C3%A9llo%20w%C3%B8rld%20%F0%9F%8C%8D');
        });

        it('should handle repeated special characters', () => {
            const input = new Quoted('"', '==::##;;(())', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('%3D%3D%3A%3A%23%23%3B%3B%28%28%29%29');
        });

        it('should handle mixed case', () => {
            const input = new Quoted('"', 'MixedCase=Value', false);
            const result = stringFunctions.escape(input);
            
            expect(result).toBeInstanceOf(Anonymous);
            expect(result.value).toBe('MixedCase%3DValue');
        });
    });

    describe('replace function', () => {
        it('should replace simple string', () => {
            const string = new Quoted('"', 'hello world', false);
            const pattern = new Quoted('"', 'world', false);
            const replacement = new Quoted('"', 'universe', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello universe');
            expect(result.quote).toBe('"');
            expect(result.escaped).toBe(false);
        });

        it('should preserve original quote style', () => {
            const string = new Quoted("'", 'hello world', false);
            const pattern = new Quoted('"', 'world', false);
            const replacement = new Quoted('"', 'universe', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello universe');
            expect(result.quote).toBe("'");
            expect(result.escaped).toBe(false);
        });

        it('should preserve escaped status', () => {
            const string = new Quoted('"', 'hello world', true);
            const pattern = new Quoted('"', 'world', false);
            const replacement = new Quoted('"', 'universe', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello universe');
            expect(result.quote).toBe('"');
            expect(result.escaped).toBe(true);
        });

        it('should handle no quotes in original string', () => {
            const string = new Quoted('', 'hello world', false);
            const pattern = new Quoted('"', 'world', false);
            const replacement = new Quoted('"', 'universe', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello universe');
            expect(result.quote).toBe('');
            expect(result.escaped).toBe(false);
        });

        it('should replace with regex pattern', () => {
            const string = new Quoted('"', 'hello world 123', false);
            const pattern = new Quoted('"', '\\d+', false);
            const replacement = new Quoted('"', 'ABC', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello world ABC');
        });

        it('should handle global flag', () => {
            const string = new Quoted('"', 'hello hello hello', false);
            const pattern = new Quoted('"', 'hello', false);
            const replacement = new Quoted('"', 'hi', false);
            const flags = new Quoted('"', 'g', false);
            
            const result = stringFunctions.replace(string, pattern, replacement, flags);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hi hi hi');
        });

        it('should handle case insensitive flag', () => {
            const string = new Quoted('"', 'Hello HELLO hello', false);
            const pattern = new Quoted('"', 'hello', false);
            const replacement = new Quoted('"', 'hi', false);
            const flags = new Quoted('"', 'gi', false);
            
            const result = stringFunctions.replace(string, pattern, replacement, flags);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hi hi hi');
        });

        it('should handle no flags', () => {
            const string = new Quoted('"', 'hello hello hello', false);
            const pattern = new Quoted('"', 'hello', false);
            const replacement = new Quoted('"', 'hi', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hi hello hello');
        });

        it('should handle empty pattern', () => {
            const string = new Quoted('"', 'hello', false);
            const pattern = new Quoted('"', '', false);
            const replacement = new Quoted('"', 'X', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Xhello');
        });

        it('should handle empty replacement', () => {
            const string = new Quoted('"', 'hello world', false);
            const pattern = new Quoted('"', 'world', false);
            const replacement = new Quoted('"', '', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello ');
        });

        it('should handle non-Quoted replacement using toCSS', () => {
            const string = new Quoted('"', 'hello world', false);
            const pattern = new Quoted('"', 'world', false);
            const replacement = new Anonymous('universe');
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello universe');
        });

        it('should handle complex regex patterns', () => {
            const string = new Quoted('"', 'test@example.com', false);
            const pattern = new Quoted('"', '([a-zA-Z0-9]+)@([a-zA-Z0-9]+)\\.([a-zA-Z]{2,})', false);
            const replacement = new Quoted('"', '$1 at $2 dot $3', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('test at example dot com');
        });

        it('should handle pattern not found', () => {
            const string = new Quoted('"', 'hello world', false);
            const pattern = new Quoted('"', 'xyz', false);
            const replacement = new Quoted('"', 'abc', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('hello world');
        });

        it('should handle special regex characters in pattern', () => {
            const string = new Quoted('"', 'price: $10.99', false);
            const pattern = new Quoted('"', '\\$[0-9]+\\.[0-9]{2}', false);
            const replacement = new Quoted('"', '**price**', false);
            
            const result = stringFunctions.replace(string, pattern, replacement);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('price: **price**');
        });
    });

    describe('% function (string formatting)', () => {
        it('should replace %s with string value', () => {
            const string = new Quoted('"', 'Hello %s!', false);
            const arg = new Quoted('"', 'world', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world!');
            expect(result.quote).toBe('"');
            expect(result.escaped).toBe(false);
        });

        it('should replace %d with CSS representation', () => {
            const string = new Quoted('"', 'Count: %d', false);
            const arg = { toCSS: () => '42' };
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Count: 42');
        });

        it('should replace %a with CSS representation', () => {
            const string = new Quoted('"', 'Value: %a', false);
            const arg = { toCSS: () => '#ff0000' };
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Value: #ff0000');
        });

        it('should handle uppercase %S with string value', () => {
            const string = new Quoted('"', 'Hello %S!', false);
            const arg = new Quoted('"', 'world test', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world%20test!');
        });

        it('should handle uppercase %D with URL encoding', () => {
            const string = new Quoted('"', 'Count: %D', false);
            const arg = { toCSS: () => '42 items' };
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Count: 42%20items');
        });

        it('should handle uppercase %A with URL encoding', () => {
            const string = new Quoted('"', 'Value: %A', false);
            const arg = { toCSS: () => '#ff0000 red' };
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Value: %23ff0000%20red');
        });

        it('should handle multiple replacements', () => {
            const string = new Quoted('"', 'Hello %s, you have %d messages', false);
            const arg1 = new Quoted('"', 'John', false);
            const arg2 = { toCSS: () => '5' };
            
            const result = stringFunctions['%'](string, arg1, arg2);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello John, you have 5 messages');
        });

        it('should handle mixed case placeholders', () => {
            const string = new Quoted('"', '%s has %D items and %A color', false);
            const arg1 = new Quoted('"', 'Cart', false);
            const arg2 = { toCSS: () => '3 new' };
            const arg3 = { toCSS: () => 'blue red' };
            
            const result = stringFunctions['%'](string, arg1, arg2, arg3);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Cart has 3%20new items and blue%20red color');
        });

        it('should replace %% with single %', () => {
            const string = new Quoted('"', 'Progress: 50%%', false);
            
            const result = stringFunctions['%'](string);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Progress: 50%');
        });

        it('should handle %% and normal placeholders together', () => {
            const string = new Quoted('"', '%s completed 100%% of %d tasks', false);
            const arg1 = new Quoted('"', 'User', false);
            const arg2 = { toCSS: () => '10' };
            
            const result = stringFunctions['%'](string, arg1, arg2);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('User completed 100% of 10 tasks');
        });

        it('should preserve original quote style', () => {
            const string = new Quoted("'", 'Hello %s!', false);
            const arg = new Quoted('"', 'world', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world!');
            expect(result.quote).toBe("'");
        });

        it('should preserve escaped status', () => {
            const string = new Quoted('"', 'Hello %s!', true);
            const arg = new Quoted('"', 'world', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world!');
            expect(result.escaped).toBe(true);
        });

        it('should handle no quotes in original string', () => {
            const string = new Quoted('', 'Hello %s!', false);
            const arg = new Quoted('"', 'world', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world!');
            expect(result.quote).toBe('');
        });

        it('should handle more arguments than placeholders', () => {
            const string = new Quoted('"', 'Hello %s!', false);
            const arg1 = new Quoted('"', 'world', false);
            const arg2 = new Quoted('"', 'extra', false);
            
            const result = stringFunctions['%'](string, arg1, arg2);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world!');
        });

        it('should handle fewer arguments than placeholders', () => {
            const string = new Quoted('"', 'Hello %s and %s!', false);
            const arg1 = new Quoted('"', 'world', false);
            
            const result = stringFunctions['%'](string, arg1);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world and %s!');
        });

        it('should handle empty string template', () => {
            const string = new Quoted('"', '', false);
            const arg = new Quoted('"', 'test', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('');
        });

        it('should handle no arguments', () => {
            const string = new Quoted('"', 'Hello world! 100%%', false);
            
            const result = stringFunctions['%'](string);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Hello world! 100%');
        });

        it('should handle case insensitive matching', () => {
            const string = new Quoted('"', 'Test %S %d %A %s', false);
            const arg1 = new Quoted('"', 'quoted string', false);
            const arg2 = { toCSS: () => '123' };
            const arg3 = { toCSS: () => 'color value' };
            const arg4 = new Quoted('"', 'another string', false);
            
            const result = stringFunctions['%'](string, arg1, arg2, arg3, arg4);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Test quoted%20string 123 color%20value another string');
        });

        it('should handle special characters in replacement values', () => {
            const string = new Quoted('"', 'Path: %s', false);
            const arg = new Quoted('"', 'folder/subfolder file.txt', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Path: folder/subfolder file.txt');
        });

        it('should handle unicode characters in replacement values', () => {
            const string = new Quoted('"', 'Message: %s', false);
            const arg = new Quoted('"', 'héllo wørld 🌍', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('Message: héllo wørld 🌍');
        });

        it('should handle complex URL encoding with uppercase placeholders', () => {
            const string = new Quoted('"', 'URL: %S', false);
            const arg = new Quoted('"', 'hello world & stuff', false);
            
            const result = stringFunctions['%'](string, arg);
            
            expect(result).toBeInstanceOf(Quoted);
            expect(result.value).toBe('URL: hello%20world%20%26%20stuff');
        });
    });
});