import { expect, describe, it } from 'vitest';
import chunker from './chunker';

describe('chunker', () => {
    it('should handle empty strings', () => {
        const input = 'a: ""; b: \'\'; c: ``;';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: ""; b: \'\'; c: ``;']);
    });

    it('should handle strings with escaped backslashes', () => {
        const input = 'a: "\\\\"; b: \'\\\\\';';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: "\\\\"; b: \'\\\\\';']);
    });

    it('should handle strings with newlines', () => {
        const input = 'a: "line1\nline2"; b: \'line1\nline2\';';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: "line1\nline2"; b: \'line1\nline2\';']);
    });

    it('should handle empty comments', () => {
        const input = '/**/ a: red; //';
        const result = chunker(input, () => {});
        expect(result).toEqual(['/**/ a: red; //']);
    });

    it('should handle comments with escaped characters', () => {
        const input = '/* \\" */ a: red; // \\\'';
        const result = chunker(input, () => {});
        expect(result).toEqual(['/* \\" */ a: red; // \\\'']);
    });

    it('should handle empty blocks', () => {
        const input = 'a {} b: calc();';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a {} b: calc();']);
    });

    it('should handle invalid escape sequences in strings', () => {
        const input = 'a: "\\x"; b: \'\\y\';';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: "\\x"; b: \'\\y\';']);
    });

    it('should handle invalid characters in comments', () => {
        const input = '/* \u0000 */ a: red; // \u0001';
        const result = chunker(input, () => {});
        expect(result).toEqual(['/* \u0000 */ a: red; // \u0001']);
    });

    it('should handle unicode characters', () => {
        const input = 'a: "😊"; b: \'你好\';';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: "😊"; b: \'你好\';']);
    });

    it('should handle control characters', () => {
        const input = 'a: "\t\r\n"; b: \'\u0000\';';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: "\t\r\n"; b: \'\u0000\';']);
    });

    it('should handle input with only a closing brace', () => {
        const input = '}';
        let error;
        chunker(input, (msg) => {
            error = msg;
        });
        expect(error).toBe('missing opening `{`');
    });

    it('should handle input with only a closing parenthesis', () => {
        const input = ')';
        let error;
        chunker(input, (msg) => {
            error = msg;
        });
        expect(error).toBe('missing opening `(`');
    });

    it('should handle input with only a comment marker', () => {
        const input = '/*';
        let error;
        const result = chunker(input, (msg) => {
            error = msg;
        });
        expect(result).toEqual(['/*']);
        expect(error).toBeUndefined();
    });

    it('should handle input with only a single-line comment marker', () => {
        const input = '//';
        const result = chunker(input, () => {});
        expect(result).toEqual(['//']);
    });

    it('should handle input with mixed whitespace characters', () => {
        const input = '  \t\n\r\f\v  ';
        const result = chunker(input, () => {});
        expect(result).toEqual(['  \t\n\r\f\v  ']);
    });

    it('should handle input with all special characters', () => {
        const input = '{}()[];:,.+-*/=<>!&|^~%#@?\'"`\\';
        let error;
        const result = chunker(input, (msg) => {
            error = msg;
        });
        expect(result).toBeUndefined();
        expect(error).toBe('unmatched `/*`');
    });

    it('should handle input with multiple consecutive special characters', () => {
        const input =
            '{{}}(()));;::,,..++--**//==<<>>!!&&||^^~~%%##@@??\'\'""``\\\\';
        let error;
        const result = chunker(input, (msg) => {
            error = msg;
        });
        expect(result).toBeUndefined();
        expect(error).toBe('missing opening `(`');
    });

    it('should handle input with maximum nesting depth', () => {
        const input =
            'a { b { c { d { e { f { g { h { i { j: k; } } } } } } } } }';
        const result = chunker(input, () => {});
        expect(result).toEqual([
            'a { b { c { d { e { f { g { h { i { j: k; } } } } } } } } }'
        ]);
    });

    it('should handle input with maximum parentheses depth', () => {
        const input = 'a: calc((((((((((1))))))))));';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: calc((((((((((1))))))))));']);
    });

    it('should handle input with maximum mixed nesting depth', () => {
        const input = 'a { b: calc((((((((((1)))))))))); }';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a { b: calc((((((((((1)))))))))); }']);
    });

    it('should handle strings with nested different quote types', () => {
        const input =
            'a: "string with \' inside"; b: \'string with " inside\';';
        const result = chunker(input, () => {});
        expect(result).toEqual([
            'a: "string with \' inside"; b: \'string with " inside\';'
        ]);
    });

    it('should handle template literals with nested quotes', () => {
        const input = 'a: `string with " and \' inside`;';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: `string with " and \' inside`;']);
    });

    it('should handle comments containing string-like syntax', () => {
        const input = '/* "not a string" */ a: red;';
        const result = chunker(input, () => {});
        expect(result).toEqual(['/* "not a string" */ a: red;']);
    });

    it('should handle comments with unmatched braces/parentheses', () => {
        const input = '/* { ( */ a: red; /* ) } */';
        const result = chunker(input, () => {});
        expect(result).toEqual(['/* { ( */ a: red; /* ) } */']);
    });

    it('should report correct error positions', () => {
        const input = 'a { b: red; } }';
        let errorPos;
        chunker(input, (msg, pos) => {
            errorPos = pos;
        });
        expect(errorPos).toBe(14); // Position of the extra closing brace
    });

    it('should handle chunk size boundary cases', () => {
        const longString = 'a'.repeat(511);
        const input = `${longString}; b: red;`;
        const result = chunker(input, () => {});
        expect(result).toHaveLength(1); // Should not split at 511 characters
    });

    it('should not split mid-token', () => {
        const longString = 'a'.repeat(510);
        const input = `${longString}red;`;
        const result = chunker(input, () => {});
        expect(result).toHaveLength(1); // Should not split in the middle of "red"
    });

    it('should handle surrogate pairs correctly', () => {
        const input = 'a: "😊"; b: "👨‍👩‍👧‍👦";';
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: "😊"; b: "👨‍👩‍👧‍👦";']);
    });

    it('should handle Unicode characters that look like ASCII', () => {
        const input = 'a: "｛"; b: "｝";'; // Fullwidth brackets
        const result = chunker(input, () => {});
        expect(result).toEqual(['a: "｛"; b: "｝";']);
    });

    it('should handle complex mixed syntax', () => {
        const input =
            'a { /* "comment" */ b: "string with /* not a comment */"; }';
        const result = chunker(input, () => {});
        expect(result).toEqual([
            'a { /* "comment" */ b: "string with /* not a comment */"; }'
        ]);
    });

    it('should handle strings containing comment markers', () => {
        const input =
            'a: "string with /* not a comment */"; b: "string with // not a comment";';
        const result = chunker(input, () => {});
        expect(result).toEqual([
            'a: "string with /* not a comment */"; b: "string with // not a comment";'
        ]);
    });

    it('should handle comments containing string delimiters', () => {
        const input = '/* "not a string" \'also not\' `nope` */ a: red;';
        const result = chunker(input, () => {});
        expect(result).toEqual([
            '/* "not a string" \'also not\' `nope` */ a: red;'
        ]);
    });
});
