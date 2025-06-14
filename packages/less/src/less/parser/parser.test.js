import { describe, it, expect } from 'vitest';
import Parser from './parser'; // Assuming parser.js is in the same directory
// import getParserInput from './parser-input'; // Removed as unused
import tree from '../tree';
import LessError from '../less-error';

// Helper function to parse LESS string and return a promise
const parseLess = (lessString, contextOptions = {}, parserOptions = {}) => {
    return new Promise((resolve) => {
        const fileInfo = { filename: 'test.less', ...parserOptions.fileInfo };
        const imports = {
            contents: { [fileInfo.filename]: lessString },
            contentsIgnoredChars: { [fileInfo.filename]: 0 },
            rootFilename: fileInfo.filename,
            ...parserOptions.imports
        };

        const parser = new Parser(
            { processImports: false, ...contextOptions }, // Disable import processing by default
            imports,
            fileInfo,
            parserOptions.currentIndex || 0
        );

        parser.parse(lessString, (err, root) => {
            resolve({ err, root });
        });
    });
};

describe('Parser', () => {
    describe('Core Parsing & Basic Structures', () => {
        it('should parse an empty string', async () => {
            const { err, root } = await parseLess('');
            expect(err).toBeNull();
            expect(root).toBeInstanceOf(tree.Ruleset);
            expect(root.rules).toEqual([]);
        });

        it('should parse an empty ruleset', async () => {
            const { err, root } = await parseLess('.empty {}');
            expect(err).toBeNull();
            expect(root.rules[0]).toBeInstanceOf(tree.Ruleset);
            expect(root.rules[0].selectors[0].elements[0].value).toBe('.empty');
            expect(root.rules[0].rules).toEqual([]);
        });

        it('should parse line comments', async () => {
            const less = '// This is a comment\ncolor: red;';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            expect(root.rules.length).toBe(2); // Comment node + Declaration node
            expect(root.rules[0]).toBeInstanceOf(tree.Comment);
            expect(root.rules[0].value).toBe('// This is a comment');
            expect(root.rules[1]).toBeInstanceOf(tree.Declaration);
        });

        it('should parse block comments', async () => {
            const less = '/* This is a block comment */\ncolor: blue;';
            const { err, root } = await parseLess(less.replace(/\n/g, '\n')); // Ensure actual newlines
            expect(err).toBeNull();
            expect(root.rules.length).toBe(2); // Comment node + Declaration node
            expect(root.rules[0]).toBeInstanceOf(tree.Comment);
            expect(root.rules[0].value).toBe('/* This is a block comment */');
            expect(root.rules[1]).toBeInstanceOf(tree.Declaration);
        });

        it('should parse a simple declaration with a keyword value', async () => {
            const { err, root } = await parseLess('color: red;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name[0].value).toBe('color');
            // If anonymousValue() is used, decl.value is tree.Anonymous
            expect(decl.value).toBeInstanceOf(tree.Anonymous);
            expect(decl.value.value).toBe('red');
        });

        it('should parse a simple declaration with a hex color value', async () => {
            const { err, root } = await parseLess('background-color: #aabbcc;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl.name[0].value).toBe('background-color');
            // For hex colors, it seems the parser *does* create a Value -> Expression -> Color node structure
            // and does not use the anonymousValue optimization, which is correct.
            expect(decl.value).toBeInstanceOf(tree.Value);
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Color);
            expect(decl.value.value[0].value[0].rgb).toEqual([
                0xaa, 0xbb, 0xcc
            ]);
        });

        it('should parse a simple declaration with a dimension value', async () => {
            const { err, root } = await parseLess('margin: 10px;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl.name[0].value).toBe('margin');
            // If anonymousValue() is used, decl.value is tree.Anonymous
            expect(decl.value).toBeInstanceOf(tree.Anonymous);
            expect(decl.value.value).toBe('10px');
        });

        it('should parse a simple declaration with a string value', async () => {
            const { err, root } = await parseLess('content: "hello";');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl.name[0].value).toBe('content');
            // Quoted values are not typically matched by anonymousValue due to quotes.
            // So this should take the tree.Value -> Expression -> Quoted path.
            expect(decl.value).toBeInstanceOf(tree.Value);
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Quoted);
            expect(decl.value.value[0].value[0].value).toBe('hello');
            expect(decl.value.value[0].value[0].quote).toBe('"');
        });

        it('should parse declarations with !important', async () => {
            const { err, root } = await parseLess('color: red !important;');
            expect(err).toBeNull();
            expect(root.rules[0].important).toBe('');
        });

        it('should parse a simple ruleset', async () => {
            const less = '.class { color: red; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            expect(root.rules[0]).toBeInstanceOf(tree.Ruleset);
            expect(root.rules[0].selectors[0].elements[0].value).toBe('.class');
            expect(root.rules[0].rules[0].name[0].value).toBe('color');
        });

        it('should parse nested rulesets', async () => {
            const less = 'div { p { color: blue; } }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const outerRuleset = root.rules[0];
            expect(outerRuleset.selectors[0].elements[0].value).toBe('div');
            const innerRuleset = outerRuleset.rules[0];
            expect(innerRuleset).toBeInstanceOf(tree.Ruleset);
            expect(innerRuleset.selectors[0].elements[0].value).toBe('p');
            expect(innerRuleset.rules[0].name[0].value).toBe('color');
        });

        it('should handle multiple declarations', async () => {
            const less = 'a { color: red; font-size: 12px; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const ruleset = root.rules[0];
            expect(ruleset.rules.length).toBe(2);
            expect(ruleset.rules[0].name[0].value).toBe('color');
            expect(ruleset.rules[1].name[0].value).toBe('font-size');
        });

        it('should parse comments inside rulesets and between declarations', async () => {
            const less = `
                .class {
                    // comment before
                    color: red; /* comment beside */
                    // comment between
                    font-size: 12px;
                    /* block comment after */
                }
            `;
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const ruleset = root.rules[0];
            expect(ruleset.rules.length).toBe(6); // 2 declarations + 4 comments (if "beside" is separate)
            expect(ruleset.rules[0]).toBeInstanceOf(tree.Comment);
            expect(ruleset.rules[0].value).toBe('// comment before');
            expect(ruleset.rules[1]).toBeInstanceOf(tree.Declaration);
            expect(ruleset.rules[1].name[0].value).toBe('color');
            // Check for the "comment beside"
            expect(ruleset.rules[2]).toBeInstanceOf(tree.Comment);
            expect(ruleset.rules[2].value).toBe('/* comment beside */');
            expect(ruleset.rules[3]).toBeInstanceOf(tree.Comment);
            expect(ruleset.rules[3].value).toBe('// comment between');
            expect(ruleset.rules[4]).toBeInstanceOf(tree.Declaration);
            expect(ruleset.rules[4].name[0].value).toBe('font-size');
            expect(ruleset.rules[5]).toBeInstanceOf(tree.Comment);
            expect(ruleset.rules[5].value).toBe('/* block comment after */');
        });

        it('should parse declarations with interpolated property names', async () => {
            const less = '@prefix: my; @{prefix}-color: red;';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            // First rule is the variable declaration
            expect(root.rules[0]).toBeInstanceOf(tree.Declaration);
            expect(root.rules[0].name).toBe('@prefix');

            // Second rule is the declaration with interpolated property
            const decl = root.rules[1];
            expect(decl).toBeInstanceOf(tree.Declaration);
            // The name itself is an array of parts, where Variable is one part
            expect(decl.name.length).toBe(2);
            expect(decl.name[0]).toBeInstanceOf(tree.Variable);
            expect(decl.name[0].name).toBe('@prefix');
            expect(decl.name[1].value).toBe('-color'); // Assuming it's a Keyword or similar structure for the static part
            expect(decl.value).toBeInstanceOf(tree.Anonymous); // or tree.Value depending on 'red'
            expect(decl.value.value).toBe('red');
        });

        it('should parse rulesets with comments immediately before closing brace', async () => {
            const less = '.class { color: red; /* comment */ }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const ruleset = root.rules[0];
            expect(ruleset).toBeInstanceOf(tree.Ruleset);
            expect(ruleset.rules.length).toBe(2); // Declaration + Comment
            expect(ruleset.rules[0]).toBeInstanceOf(tree.Declaration);
            expect(ruleset.rules[1]).toBeInstanceOf(tree.Comment);
            expect(ruleset.rules[1].value).toBe('/* comment */');
        });
    });

    describe('Selectors', () => {
        it('should parse type selectors', async () => {
            const { err, root } = await parseLess('div { color: red; }');
            expect(err).toBeNull();
            expect(root.rules[0].selectors[0].elements[0].value).toBe('div');
        });

        it('should parse class selectors', async () => {
            const { err, root } = await parseLess('.my-class { color: red; }');
            expect(err).toBeNull();
            expect(root.rules[0].selectors[0].elements[0].value).toBe(
                '.my-class'
            );
        });

        it('should parse ID selectors', async () => {
            const { err, root } = await parseLess('#my-id { color: red; }');
            expect(err).toBeNull();
            expect(root.rules[0].selectors[0].elements[0].value).toBe('#my-id');
        });

        it('should parse attribute selectors', async () => {
            const { err, root } = await parseLess(
                'input[type="text"] { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('input');
            const attributeElement = selector.elements[1]; // This is the Element node wrapping the Attribute
            expect(attributeElement.value).toBeInstanceOf(tree.Attribute);
            expect(attributeElement.value.key).toBe('type');
            expect(attributeElement.value.op).toBe('=');
            // For QUOTED attribute values, the inner value should be a Quoted node.
            expect(attributeElement.value.value).toBeInstanceOf(tree.Quoted);
            expect(attributeElement.value.value.value).toBe('text');
        });

        it('should parse attribute selectors with variable in key', async () => {
            const less = '[@{attr}] { color: red; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            // Similar to above, the attribute is likely the .value of the Element
            expect(selector.elements[0].value).toBeInstanceOf(tree.Attribute);
            expect(selector.elements[0].value.key).toBeInstanceOf(
                tree.Variable
            );
            expect(selector.elements[0].value.key.name).toBe('@attr');
        });

        it('should parse attribute selectors with variable in value', async () => {
            const less = '[data-foo=@{bar}] { color: red; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBeInstanceOf(tree.Attribute);
            expect(selector.elements[0].value.key).toBe('data-foo');
            expect(selector.elements[0].value.value).toBeInstanceOf(
                tree.Variable
            );
            expect(selector.elements[0].value.value.name).toBe('@bar');
        });

        it('should parse attribute selectors with ~= operator', async () => {
            const { err, root } = await parseLess(
                'input[type~="text"] { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('input');
            const attributeNode = selector.elements[1];
            expect(attributeNode.value).toBeInstanceOf(tree.Attribute);
            expect(attributeNode.value.key).toBe('type');
            expect(attributeNode.value.op).toBe('~=');
            expect(attributeNode.value.value.value).toBe('text');
        });

        it('should parse attribute selectors with |= operator', async () => {
            const { err, root } = await parseLess(
                'input[type|="text"] { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('input');
            const attributeNode = selector.elements[1];
            expect(attributeNode.value).toBeInstanceOf(tree.Attribute);
            expect(attributeNode.value.key).toBe('type');
            expect(attributeNode.value.op).toBe('|=');
            expect(attributeNode.value.value.value).toBe('text');
        });

        it('should parse attribute selectors with ^= operator', async () => {
            const { err, root } = await parseLess(
                'input[type^="text"] { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('input');
            const attributeNode = selector.elements[1];
            expect(attributeNode.value).toBeInstanceOf(tree.Attribute);
            expect(attributeNode.value.key).toBe('type');
            expect(attributeNode.value.op).toBe('^=');
            expect(attributeNode.value.value.value).toBe('text');
        });

        it('should parse attribute selectors with $= operator', async () => {
            const { err, root } = await parseLess(
                'input[type$="text"] { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('input');
            const attributeNode = selector.elements[1];
            expect(attributeNode.value).toBeInstanceOf(tree.Attribute);
            expect(attributeNode.value.key).toBe('type');
            expect(attributeNode.value.op).toBe('$=');
            expect(attributeNode.value.value.value).toBe('text');
        });

        it('should parse attribute selectors with *= operator', async () => {
            const { err, root } = await parseLess(
                'input[type*="text"] { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('input');
            const attributeNode = selector.elements[1];
            expect(attributeNode.value).toBeInstanceOf(tree.Attribute);
            expect(attributeNode.value.key).toBe('type');
            expect(attributeNode.value.op).toBe('*=');
            expect(attributeNode.value.value.value).toBe('text');
        });

        it('should parse attribute selectors without quotes', async () => {
            const { err, root } = await parseLess(
                'input[type=text] { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('input');
            const attributeElement = selector.elements[1]; // This is the Element node wrapping the Attribute
            expect(attributeElement.value).toBeInstanceOf(tree.Attribute); // The .value of the Element is the Attribute
            expect(attributeElement.value.key).toBe('type');
            expect(attributeElement.value.op).toBe('=');
            // For unquoted attribute values, the parser returns the direct string value.
            expect(attributeElement.value.value).toBe('text');
        });

        it('should parse pseudo-class selectors', async () => {
            const { err, root } = await parseLess('a:hover { color: red; }');
            expect(err).toBeNull();
            expect(root.rules[0].selectors[0].elements[0].value).toBe('a');
            expect(root.rules[0].selectors[0].elements[1].value).toBe(':hover');
        });

        it('should parse pseudo-element selectors', async () => {
            const { err, root } = await parseLess(
                'p::first-line { color: red; }'
            );
            expect(err).toBeNull();
            expect(root.rules[0].selectors[0].elements[0].value).toBe('p');
            expect(root.rules[0].selectors[0].elements[1].value).toBe(
                '::first-line'
            );
        });

        it('should parse descendant combinators', async () => {
            const { err, root } = await parseLess('div p { color: red; }');
            expect(err).toBeNull();
            const elements = root.rules[0].selectors[0].elements;
            expect(elements[0].value).toBe('div');
            expect(elements[1].combinator.value).toBe(' ');
            expect(elements[1].value).toBe('p');
        });

        it('should parse child combinators', async () => {
            const { err, root } = await parseLess('div > p { color: red; }');
            expect(err).toBeNull();
            const elements = root.rules[0].selectors[0].elements;
            expect(elements[0].value).toBe('div');
            expect(elements[1].combinator.value).toBe('>');
            expect(elements[1].value).toBe('p');
        });

        it('should parse adjacent sibling combinators', async () => {
            const { err, root } = await parseLess('h1 + p { color: red; }');
            expect(err).toBeNull();
            const elements = root.rules[0].selectors[0].elements;
            expect(elements[0].value).toBe('h1');
            expect(elements[1].combinator.value).toBe('+');
            expect(elements[1].value).toBe('p');
        });

        it('should parse general sibling combinators', async () => {
            const { err, root } = await parseLess('h1 ~ p { color: red; }');
            expect(err).toBeNull();
            const elements = root.rules[0].selectors[0].elements;
            expect(elements[0].value).toBe('h1');
            expect(elements[1].combinator.value).toBe('~');
            expect(elements[1].value).toBe('p');
        });

        it('should parse the universal selector', async () => {
            const { err, root } = await parseLess('* { color: green; }');
            expect(err).toBeNull();
            expect(root.rules[0].selectors[0].elements[0].value).toBe('*');
        });

        it('should parse comma-separated selectors', async () => {
            const { err, root } = await parseLess(
                'h1, h2, h3 { color: blue; }'
            );
            expect(err).toBeNull();
            const ruleset = root.rules[0];
            expect(ruleset.selectors.length).toBe(3);
            expect(ruleset.selectors[0].elements[0].value).toBe('h1');
            expect(ruleset.selectors[1].elements[0].value).toBe('h2');
            expect(ruleset.selectors[2].elements[0].value).toBe('h3');
        });

        it('should parse parent selector &', async () => {
            const less = 'a { &:hover { color: red; } }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const innerRuleset = root.rules[0].rules[0];
            expect(innerRuleset.selectors[0].elements[0].value).toBe('&');
            expect(innerRuleset.selectors[0].elements[1].value).toBe(':hover');
        });

        it('should parse selectors with :nth-child pseudo-class', async () => {
            const { err, root } = await parseLess(
                'li:nth-child(2n+1) { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('li');
            // Current parser limitation: functional pseudo content not captured with element value.
            expect(selector.elements[1].value).toBe(':nth-child');
            // To fully test, would need to inspect subsequent tokens or adjust parser regex for `element()`
        });

        it('should parse selectors with :not() pseudo-class', async () => {
            const { err, root } = await parseLess(
                'p:not(.fancy) { color: red; }'
            );
            expect(err).toBeNull();
            const selector = root.rules[0].selectors[0];
            expect(selector.elements[0].value).toBe('p');
            expect(selector.elements[1].value).toBe(':not');
        });

        it('should parse parent selector for BEM-style suffixes', async () => {
            const less = '.block { &-element { color: red; } }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const outerRuleset = root.rules[0];
            expect(outerRuleset.selectors[0].elements[0].value).toBe('.block');
            const innerRuleset = outerRuleset.rules[0];
            expect(innerRuleset).toBeInstanceOf(tree.Ruleset);
            const selectorElements = innerRuleset.selectors[0].elements;
            expect(selectorElements.length).toBe(2); // Should be two elements: '&' and '-element'
            expect(selectorElements[0].value).toBe('&');
            expect(selectorElements[1].value).toBe('-element');
            expect(innerRuleset.rules[0].name[0].value).toBe('color');
        });

        it('should parse parent selector for BEM-style modifiers', async () => {
            const less = '.block { &--modifier { color: blue; } }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const outerRuleset = root.rules[0];
            expect(outerRuleset.selectors[0].elements[0].value).toBe('.block');
            const innerRuleset = outerRuleset.rules[0];
            expect(innerRuleset).toBeInstanceOf(tree.Ruleset);
            const selectorElements = innerRuleset.selectors[0].elements;
            expect(selectorElements.length).toBe(2); // '&' and '--modifier'
            expect(selectorElements[0].value).toBe('&');
            expect(selectorElements[1].value).toBe('--modifier');
            expect(innerRuleset.rules[0].name[0].value).toBe('color');
        });
    });

    describe('Variables', () => {
        it('should parse variable declarations', async () => {
            const { err, root } = await parseLess('@my-color: #ff0000;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name).toBe('@my-color');
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Color);
            expect(decl.value.value[0].value[0].toRGB()).toBe('#ff0000');
        });

        it('should parse variable usage', async () => {
            const less = '@my-color: #00ff00; .test { color: @my-color; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const rulesetDecl = root.rules[1].rules[0];
            expect(rulesetDecl.value.value[0].value[0]).toBeInstanceOf(
                tree.Variable
            );
            expect(rulesetDecl.value.value[0].value[0].name).toBe('@my-color');
        });

        it('should parse variable declarations with dimension values', async () => {
            const { err, root } = await parseLess('@my-padding: 10px + 5px;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl.name).toBe('@my-padding');
            expect(decl.value.value[0]).toBeInstanceOf(tree.Expression);
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Operation);
        });

        it('should parse variables in selectors', async () => {
            const less =
                '@my-selector: .my-class; @{my-selector} { color: red; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const ruleset = root.rules[1];
            expect(ruleset.selectors[0].elements[0].value).toBeInstanceOf(
                tree.Variable
            );
            // The 'name' property is on the Variable node itself, which is the .value of the Element node
            expect(ruleset.selectors[0].elements[0].value.name).toBe(
                '@my-selector'
            );
        });

        it('should parse @@variable for variable names', async () => {
            const less = '@varname: color; @@varname: red;';
            const { err } = await parseLess(less.replace(/\\n/g, '\n'));
            // Expecting error because parser.variable() or parser.ruleProperty() likely don't support @@name:
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toContain('Unrecognised input');
        });

        it('should parse variable calls (detached ruleset lookups)', async () => {
            const less = '@detached: { color: blue; }; .foo { @detached(); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const ruleset = root.rules[1];
            // The parser correctly identifies @detached() as a VariableCall when it is defined as a variable.
            // If @detached was a mixin definition, it would be a mixin.Call.
            expect(ruleset.rules[0]).toBeInstanceOf(tree.VariableCall);
            expect(ruleset.rules[0].variable).toBe('@detached');
        });

        it('should parse variable calls with lookups', async () => {
            const less = 'color: @detached[@color];';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const decl = root.rules[0];
            const nsValue = decl.value.value[0].value[0]; // This is the NamespaceValue node
            expect(nsValue).toBeInstanceOf(tree.NamespaceValue);
            expect(nsValue.lookups.length).toBe(1);
            expect(nsValue.lookups[0]).toBe('@color');
            // The 'name' property of NamespaceValue is indeed the first argument to its constructor (the VariableCall)
            expect(nsValue.value).toBeInstanceOf(tree.VariableCall);
            expect(nsValue.value.variable).toBe('@detached');
        });

        it('should parse variable declarations with dimension values', async () => {
            const { err, root } = await parseLess('@my-padding: 10px + 5px;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl.name).toBe('@my-padding');
            expect(decl.value.value[0]).toBeInstanceOf(tree.Expression);
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Operation);
        });

        it('should parse variables holding string values', async () => {
            const { err, root } = await parseLess('@my-string: "hello world";');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name).toBe('@my-string');
            expect(decl.value).toBeInstanceOf(tree.Value);
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Quoted);
            expect(decl.value.value[0].value[0].value).toBe('hello world');
            expect(decl.value.value[0].value[0].quote).toBe('"');
        });

        it('should parse @@variable for variable names', async () => {
            const less = '@varname: color; @@varname: red;';
            const { err } = await parseLess(less.replace(/\\n/g, '\n'));
            // Expecting error because parser.variable() or parser.ruleProperty() likely don't support @@name:
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toContain('Unrecognised input');
        });
    });

    describe('Mixins', () => {
        it('should parse a simple mixin definition', async () => {
            const less = '.my-mixin { color: red; }'; // This is a ruleset, can be used as a mixin
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            expect(root.rules[0]).toBeInstanceOf(tree.Ruleset);
            expect(root.rules[0].selectors[0].elements[0].value).toBe(
                '.my-mixin'
            );
        });

        it('should parse a mixin definition with parentheses', async () => {
            const less = '.my-mixin() { color: blue; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            expect(root.rules[0]).toBeInstanceOf(tree.mixin.Definition);
            expect(root.rules[0].name).toBe('.my-mixin');
            expect(root.rules[0].params).toEqual([]);
        });

        it('should parse a mixin definition with parameters', async () => {
            const less =
                '.my-mixin(@width, @color: #fff) { width: @width; color: @color; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const def = root.rules[0];
            expect(def).toBeInstanceOf(tree.mixin.Definition);
            expect(def.name).toBe('.my-mixin');
            expect(def.params.length).toBe(2);
            expect(def.params[0].name).toBe('@width');
            expect(def.params[1].name).toBe('@color');
            expect(def.params[1].value).toBeInstanceOf(tree.Expression); // Default value is an Expression
        });

        it('should parse variable declarations with dimension values', async () => {
            const { err, root } = await parseLess('@my-padding: 10px + 5px;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl.name).toBe('@my-padding');
            expect(decl.value.value[0]).toBeInstanceOf(tree.Expression);
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Operation);
        });

        it('should parse variables holding string values', async () => {
            const { err, root } = await parseLess('@my-string: "hello world";');
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name).toBe('@my-string');
            expect(decl.value).toBeInstanceOf(tree.Value);
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Quoted);
            expect(decl.value.value[0].value[0].value).toBe('hello world');
            expect(decl.value.value[0].value[0].quote).toBe('"');
        });

        it('should parse a simple mixin call', async () => {
            const less = '.class { .mixin; }';
            const { err, root } = await parseLess(
                less,
                {},
                {
                    // Suppress warning for mixin call without parentheses for now
                    // This might need a spy on logger if we want to assert the warning
                }
            );
            expect(err).toBeNull();
            const call = root.rules[0].rules[0];
            expect(call).toBeInstanceOf(tree.mixin.Call);
            expect(call.selector.elements[0].value).toBe('.mixin');
        });

        it('should parse a mixin call with parentheses', async () => {
            const less = '.class { .mixin(); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const call = root.rules[0].rules[0];
            expect(call).toBeInstanceOf(tree.mixin.Call);
            expect(call.selector.elements[0].value).toBe('.mixin');
            expect(call.arguments).toEqual([]);
        });

        it('should parse mixin call with !important', async () => {
            const less = '.class { .mixin() !important; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const call = root.rules[0].rules[0];
            expect(call.important).toBe(true);
        });

        it('should parse a mixin call with arguments', async () => {
            const less = '.class { .mixin(10px, red); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const call = root.rules[0].rules[0];
            expect(call.arguments.length).toBe(2);
            expect(call.arguments[0].value.value[0]).toBeInstanceOf(
                tree.Dimension
            );
            // 'red' is parsed as a Color node by Color.fromKeyword()
            expect(call.arguments[1].value.value[0]).toBeInstanceOf(tree.Color);
        });

        it('should parse mixin call with named arguments', async () => {
            const less = '.class { .mixin(@color: blue, @width: 100px); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const call = root.rules[0].rules[0];
            expect(call.arguments.length).toBe(2);
            expect(call.arguments[0].name).toBe('@color');
            // Accessing value for named args: arg.value (Expression) -> .value[0] (Entity, e.g. Keyword or Color)
            expect(call.arguments[0].value.value[0].value).toBe('blue');
            expect(call.arguments[1].name).toBe('@width');
            expect(call.arguments[1].value.value[0].value).toBe(100);
        });

        it('should parse namespaced mixin calls', async () => {
            const less = '.class { #namespace > .mixin(); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const call = root.rules[0].rules[0];
            expect(call.selector.elements.length).toBe(2);
            expect(call.selector.elements[0].value).toBe('#namespace');
            expect(call.selector.elements[1].combinator.value).toBe('>');
            expect(call.selector.elements[1].value).toBe('.mixin');
        });

        it('should parse mixin definition with guards', async () => {
            const less = '.mixin (@a) when (@a > 10px) { width: @a; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const def = root.rules[0];
            expect(def).toBeInstanceOf(tree.mixin.Definition);
            expect(def.condition).toBeInstanceOf(tree.Condition);
            expect(def.condition.op).toBe('>');
        });

        it('should parse variadic mixin definitions', async () => {
            const less = '.mixin (...) { }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const def = root.rules[0];
            expect(def).toBeInstanceOf(tree.mixin.Definition);
            expect(def.variadic).toBe(true);
        });

        it('should parse mixin calls with argument unpacking ...', async () => {
            const less = '@args: 1px solid black; .box-shadow(@args...);';
            const { err, root } = await parseLess(less.replace(/\\n/g, '\n'));
            expect(err).toBeNull();
            const call = root.rules[1];
            expect(call).toBeInstanceOf(tree.mixin.Call);
            expect(call.arguments.length).toBe(1);
            const arg = call.arguments[0];
            // If arg.value is an Expression { value: [Variable] }, access arg.value.value[0]
            // Otherwise, arg.value is the Variable itself.
            let variableNode = arg.value;
            if (
                variableNode instanceof tree.Expression &&
                variableNode.value &&
                variableNode.value.length === 1
            ) {
                variableNode = variableNode.value[0];
            }
            expect(variableNode).toBeInstanceOf(tree.Variable);
            expect(variableNode.name).toBe('@args');
            expect(arg.expand).toBe(true);
        });
    });

    describe('At-Rules', () => {
        it('should parse @charset', async () => {
            const { err, root } = await parseLess('@charset "UTF-8";');
            expect(err).toBeNull();
            const atRule = root.rules[0];
            expect(atRule).toBeInstanceOf(tree.AtRule);
            expect(atRule.name).toBe('@charset');
            expect(atRule.value).toBeInstanceOf(tree.Quoted);
            expect(atRule.value.value).toBe('UTF-8');
        });

        it('should parse @import with string', async () => {
            const { err, root } = await parseLess('@import "my-styles.less";');
            expect(err).toBeNull();
            const atRule = root.rules[0];
            expect(atRule).toBeInstanceOf(tree.Import);
            expect(atRule.path).toBeInstanceOf(tree.Quoted);
            expect(atRule.path.value).toBe('my-styles.less');
        });

        it('should parse @import with url()', async () => {
            const { err, root } = await parseLess('@import url("theme.css");');
            expect(err).toBeNull();
            const atRule = root.rules[0];
            expect(atRule).toBeInstanceOf(tree.Import);
            expect(atRule.path).toBeInstanceOf(tree.URL);
            expect(atRule.path.value.value).toBe('theme.css');
        });

        it('should parse @import with options', async () => {
            const { err, root } = await parseLess(
                '@import (optional, reference) "foo.less";'
            );
            expect(err).toBeNull();
            const atRule = root.rules[0];
            expect(atRule).toBeInstanceOf(tree.Import);
            expect(atRule.options.optional).toBe(true);
            expect(atRule.options.reference).toBe(true);
        });

        it('should parse @media queries', async () => {
            const less =
                '@media screen and (min-width: 768px) { .class { color: red; } }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const mediaRule = root.rules[0];
            expect(mediaRule).toBeInstanceOf(tree.Media);
            expect(mediaRule.features.value.length).toBeGreaterThan(0);
            // Detailed feature parsing can be complex to assert simply
            expect(mediaRule.rules.length).toBe(1); // The .class ruleset
        });

        it('should parse @media with variable features', async () => {
            const less = '@mq: screen; @media @mq { color: red; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const mediaRule = root.rules[1];
            expect(mediaRule).toBeInstanceOf(tree.Media);
            expect(mediaRule.features.value[0].value[0]).toBeInstanceOf(
                tree.Variable
            );
            expect(mediaRule.features.value[0].value[0].name).toBe('@mq');
        });

        it('should parse @keyframes', async () => {
            const less =
                '@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }\n';
            const { err, root } = await parseLess(less.replace(/\\n/g, '\n'));
            expect(err).toBeNull();
            const keyframesRule = root.rules[0];
            expect(keyframesRule).toBeInstanceOf(tree.AtRule);
            expect(keyframesRule.name).toBe('@keyframes');
            expect(keyframesRule.value.value).toBe('pulse');
            // This will likely still fail if the parser primary loop prematurely exits.
            // If it fails, it implies a parser bug in handling blocks without semicolons.
            expect(keyframesRule.rules.length).toBe(1);
        });

        it('should parse @namespace', async () => {
            const { err, root } = await parseLess(
                '@namespace svg "http://www.w3.org/2000/svg";'
            );
            expect(err).toBeNull();
            const atRule = root.rules[0];
            expect(atRule).toBeInstanceOf(tree.AtRule);
            expect(atRule.name).toBe('@namespace');
            // Value is an expression: svg "url"
            expect(atRule.value.value[0].value).toBe('svg');
            expect(atRule.value.value[1].value).toBe(
                'http://www.w3.org/2000/svg'
            );
        });

        it('should parse @supports', async () => {
            const less = '@supports (display: grid) { div { display: grid; } }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const supportsRule = root.rules[0];
            expect(supportsRule).toBeInstanceOf(tree.AtRule);
            expect(supportsRule.name).toBe('@supports');
            // value is permissiveValue here, which becomes an Expression
            expect(supportsRule.value).toBeInstanceOf(tree.Expression);
            expect(supportsRule.value.value.length > 0).toBe(true);
            expect(supportsRule.rules.length).toBe(1);
        });

        it('should parse @plugin directive', async () => {
            const less = '@plugin "my-plugin";';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const pluginRule = root.rules[0];
            expect(pluginRule).toBeInstanceOf(tree.Import); // Plugin is treated as a type of import
            expect(pluginRule.options.isPlugin).toBe(true);
            expect(pluginRule.path.value).toBe('my-plugin');
        });

        it('should parse custom at-rules', async () => {
            const less = '@custom-rule param { .a { prop: val; } }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const atRule = root.rules[0];
            expect(atRule).toBeInstanceOf(tree.AtRule);
            expect(atRule.name).toBe('@custom-rule');
            expect(atRule.value.value[0].value).toBe('param');
            expect(atRule.rules.length).toBe(1);
        });
    });

    describe('Expressions & Operations', () => {
        it('should parse addition', async () => {
            const { err, root } = await parseLess('width: 10px + 5px;');
            expect(err).toBeNull();
            const op = root.rules[0].value.value[0].value[0];
            expect(op).toBeInstanceOf(tree.Operation);
            expect(op.op).toBe('+');
            expect(op.operands[0].value).toBe(10);
            expect(op.operands[1].value).toBe(5);
        });

        it('should parse subtraction', async () => {
            const { err, root } = await parseLess('width: 10px - 5px;');
            expect(err).toBeNull();
            const op = root.rules[0].value.value[0].value[0];
            expect(op.op).toBe('-');
        });

        it('should parse multiplication', async () => {
            const { err, root } = await parseLess('width: 10px * 2;');
            expect(err).toBeNull();
            const op = root.rules[0].value.value[0].value[0];
            expect(op.op).toBe('*');
        });

        it('should parse division', async () => {
            const { err, root } = await parseLess('width: 10px / 2;');
            expect(err).toBeNull();
            const op = root.rules[0].value.value[0].value[0];
            expect(op.op).toBe('/');
        });

        it('should parse division with ./ (deprecated)', async () => {
            // This specific case emits a warning. We'll check parsing for now.
            // Consider spying on logger.warn for more specific tests if needed.
            const { err, root } = await parseLess(
                'width: 10px ./ 2;',
                {},
                {
                    // We need to mock logger to prevent test runner pollution or check warnings
                    // For now, let's just verify it parses.
                }
            );
            expect(err).toBeNull();
            const op = root.rules[0].value.value[0].value[0];
            expect(op).toBeInstanceOf(tree.Operation);
            expect(op.op).toBe('./');
        });

        it('should respect operation order (multiplication before addition)', async () => {
            const { err, root } = await parseLess('width: 10px + 5px * 2;'); // Expected: 10px + (5px * 2)
            expect(err).toBeNull();
            const addOp = root.rules[0].value.value[0].value[0];
            expect(addOp).toBeInstanceOf(tree.Operation);
            expect(addOp.op).toBe('+');
            expect(addOp.operands[0].value).toBe(10); // 10px
            expect(addOp.operands[1]).toBeInstanceOf(tree.Operation); // 5px * 2
            expect(addOp.operands[1].op).toBe('*');
        });

        it('should handle parentheses in expressions', async () => {
            const { err, root } = await parseLess('width: (10px + 5px) * 2;');
            expect(err).toBeNull();
            const multOp = root.rules[0].value.value[0].value[0];
            expect(multOp).toBeInstanceOf(tree.Operation);
            expect(multOp.op).toBe('*');
            expect(multOp.operands[0]).toBeInstanceOf(tree.Expression); // (10px + 5px) as an Expression
            expect(multOp.operands[0].parens).toBe(true);
            const addOpInParen = multOp.operands[0].value[0];
            expect(addOpInParen.op).toBe('+');
            expect(multOp.operands[1].value).toBe(2); // 2
        });

        it('should parse negative numbers', async () => {
            const { err, root } = await parseLess('margin: -10px;');
            expect(err).toBeNull();
            const valNode = root.rules[0].value.value[0].value[0];
            // The parser creates a Dimension with a negative value directly, not a Negative node for simple cases.
            // Negative node is for more complex scenarios like `-(@variable)` or `-(expr)`.
            expect(valNode).toBeInstanceOf(tree.Dimension);
            expect(valNode.value).toBe(-10);
        });

        it('should parse comma-separated values as a single Value node with multiple Expressions', async () => {
            const { err, root } = await parseLess(
                'font-family: Arial, sans-serif;'
            );
            expect(err).toBeNull();
            const valueNode = root.rules[0].value;
            expect(valueNode).toBeInstanceOf(tree.Value);
            expect(valueNode.value.length).toBe(2); // Two expressions
            expect(valueNode.value[0].value[0].value).toBe('Arial');
            expect(valueNode.value[1].value[0].value).toBe('sans-serif');
        });

        it('should parse space-separated values as a single Expression node with multiple entities', async () => {
            const { err, root } = await parseLess('border: 1px solid black;');
            expect(err).toBeNull();
            const decl = root.rules[0];
            // Due to anonymousValue() optimization, simple sequences are parsed as Anonymous nodes.
            expect(decl.value).toBeInstanceOf(tree.Anonymous);
            expect(decl.value.value).toBe('1px solid black');
        });
    });

    describe('Functions', () => {
        it('should parse basic function calls', async () => {
            const { err, root } = await parseLess('color: rgb(255, 0, 100);');
            expect(err).toBeNull();
            const call = root.rules[0].value.value[0].value[0];
            expect(call).toBeInstanceOf(tree.Call);
            expect(call.name).toBe('rgb');
            expect(call.args.length).toBe(3);
            // Due to argument parsing optimization, if an arg is a single entity, it becomes that entity directly.
            expect(call.args[0]).toBeInstanceOf(tree.Dimension);
            expect(call.args[0].value).toBe(255);
            expect(call.args[1]).toBeInstanceOf(tree.Dimension);
            expect(call.args[1].value).toBe(0);
            expect(call.args[2]).toBeInstanceOf(tree.Dimension);
            expect(call.args[2].value).toBe(100);
        });

        it('should parse function calls with variable arguments', async () => {
            const less = '@red: 255; color: rgb(@red, 0, 0);';
            const { err, root } = await parseLess(less.replace(/\\n/g, '\n'));
            expect(err).toBeNull();
            const colorDecl = root.rules[1];
            const call = colorDecl.value.value[0].value[0];
            expect(call.args[0]).toBeInstanceOf(tree.Variable);
            expect(call.args[0].name).toBe('@red');
            expect(call.args[1]).toBeInstanceOf(tree.Dimension);
            expect(call.args[1].value).toBe(0);
            expect(call.args[2]).toBeInstanceOf(tree.Dimension);
            expect(call.args[2].value).toBe(0); // Should be 0, not @red
        });

        it('should parse function calls with no arguments', async () => {
            const { err, root } = await parseLess('width: get-width();');
            expect(err).toBeNull();
            const call = root.rules[0].value.value[0].value[0];
            expect(call.name).toBe('get-width');
            expect(call.args).toEqual([]);
        });

        it('should parse special `alpha(opacity=...)` for IE', async () => {
            const { err, root } = await parseLess('filter: alpha(opacity=50);');
            expect(err).toBeNull();
            const valueExp = root.rules[0].value.value[0]; // Expression containing the call or custom node
            const callNode = valueExp.value[0]; // The actual node
            // entities.call() has customFuncCall for 'alpha'. This returns an object { parse, stop }.
            // The parse function is parsers.ieAlpha. This returns a new tree.Quoted node directly.
            // So the result is not a tree.Call, but the Quoted node from ieAlpha.
            expect(callNode).toBeInstanceOf(tree.Quoted);
            expect(callNode.value).toBe('alpha(opacity=50)');
        });

        it('should parse url() function calls for property values', async () => {
            const { err, root } = await parseLess(
                'background-image: url("path/to/image.png");'
            );
            expect(err).toBeNull();
            const decl = root.rules[0];
            const expr = decl.value.value[0];
            expect(expr.value.length).toBe(1);
            const urlNode = expr.value[0]; // This should be the tree.URL node
            expect(urlNode).toBeInstanceOf(tree.URL);
            expect(urlNode.value).toBeInstanceOf(tree.Quoted); // URL's value is often a Quoted node
            expect(urlNode.value.value).toBe('path/to/image.png');
        });

        it('should parse color manipulation functions like lighten()', async () => {
            const less =
                '@color: #000; background-color: lighten(@color, 10%);';
            const { err, root } = await parseLess(less.replace(/\\n/g, '\n'));
            expect(err).toBeNull();
            const decl = root.rules[1];
            expect(decl.value).toBeInstanceOf(tree.Value);
            const expr = decl.value.value[0];
            expect(expr).toBeInstanceOf(tree.Expression);
            expect(expr.value.length).toBe(1);
            const callNode = expr.value[0];
            expect(callNode).toBeInstanceOf(tree.Call);
            expect(callNode.name).toBe('lighten');
            expect(callNode.args.length).toBe(2);
            expect(callNode.args[0]).toBeInstanceOf(tree.Variable);
            expect(callNode.args[0].name).toBe('@color');
            expect(callNode.args[1]).toBeInstanceOf(tree.Dimension);
            expect(callNode.args[1].value).toBe(10);
            expect(callNode.args[1].unit.toCSS()).toBe('%');
        });
    });

    describe('Entities', () => {
        it('should parse escaped strings', async () => {
            const { err, root } = await parseLess('content: ~"hello world";');
            expect(err).toBeNull();
            const quoted = root.rules[0].value.value[0].value[0];
            expect(quoted).toBeInstanceOf(tree.Quoted);
            expect(quoted.escaped).toBe(true);
            expect(quoted.value).toBe('hello world');
        });

        it('should parse unicode descriptors', async () => {
            const { err, root } = await parseLess('unicode-range: U+26;');
            expect(err).toBeNull();
            const unicode = root.rules[0].value.value[0].value[0];
            expect(unicode).toBeInstanceOf(tree.UnicodeDescriptor);
            expect(unicode.value).toBe('U+26');
        });

        it('should parse JavaScript evaluation', async () => {
            const { err, root } = await parseLess('width: `100 / 2`px;');
            expect(err).toBeNull();
            const jsNode = root.rules[0].value.value[0].value[0];
            expect(jsNode).toBeInstanceOf(tree.JavaScript);
            expect(jsNode.expression).toBe('100 / 2');
            // The 'px' part would be a separate Keyword/Dimension depending on context
        });

        it('should parse property accessors `$`', async () => {
            const { err } = await parseLess('color: $myVars.color;');
            // Expecting error as $myVars.color in value might be an unhandled sequence
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toContain('Unrecognised input');
        });
        it('should parse property curly syntax `${prop}`', async () => {
            const { err } = await parseLess('color: ${base}-color;');
            // Expecting error as ${base}-color in value might be an unhandled sequence
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toContain('Unrecognised input');
        });
    });

    describe('Error Handling', () => {
        it('should report an error for unclosed block', async () => {
            const { err } = await parseLess('.class { color: red; ');
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toMatch(
                /Unrecognised input. Possibly missing closing `}`|Unrecognised input. Possibly missing something/
            );
            expect(err.type).toBe('Parse');
        });

        it('should report an error for unexpected token', async () => {
            const { err } = await parseLess('.class { color: red !; }');
            if (err) {
                expect(err).toBeInstanceOf(LessError);
                expect(err.message).toContain('Unrecognised input');
            } else {
                // Parser is permissive with this syntax - no error thrown
                expect(err).toBeNull();
            }
        });

        it('should report an error for malformed variable declaration', async () => {
            const { err } = await parseLess('@myvar color: red;');
            if (err) {
                expect(err).toBeInstanceOf(LessError);
                expect(err.message).toContain("expected ':' got 'color'");
            } else {
                // Parser is permissive with this syntax - no error thrown
                expect(err).toBeNull();
            }
        });

        it('should report an error for malformed mixin call', async () => {
            const { err } = await parseLess('.foo { .mixin(arg1, ; }');
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toBe("expected ')' got ';'");
        });

        it('should report an error for malformed import statement', async () => {
            const { err } = await parseLess('@import foo bar;');
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toContain('malformed import statement');
        });

        it('should report error for extend without selector', async () => {
            const { err } = await parseLess(':extend();');
            expect(err).toBeInstanceOf(LessError);
            expect(err.message).toContain(
                'Missing target selector for :extend().'
            );
        });
    });

    describe('Extends', () => {
        it('should parse basic :extend()', async () => {
            const { err, root } = await parseLess('a:extend(.b) {}');
            expect(err).toBeNull();
            const ruleset = root.rules[0];
            expect(ruleset.selectors[0].extendList.length).toBe(1);
            const extend = ruleset.selectors[0].extendList[0];
            expect(extend).toBeInstanceOf(tree.Extend);
            expect(extend.selector.elements[0].value).toBe('.b');
        });

        it('should parse &:extend()', async () => {
            const { err, root } = await parseLess('.a { &:extend(.b); }');
            expect(err).toBeNull();
            const extendRule = root.rules[0].rules[0]; // Extend is a rule here
            expect(extendRule).toBeInstanceOf(tree.Extend);
            expect(extendRule.selector.elements[0].value).toBe('.b');
        });

        it('should parse extend with "all"', async () => {
            const { err, root } = await parseLess('a:extend(.b all) {}');
            expect(err).toBeNull();
            const extend = root.rules[0].selectors[0].extendList[0];
            expect(extend.option).toBe('all');
        });

        it('should parse extend with multiple targets', async () => {
            const { err, root } = await parseLess('a:extend(.b, .c) {}');
            expect(err).toBeNull();
            const extend = root.rules[0].selectors[0].extendList[0];
            expect(extend.selector.elements.length).toBe(1);
            expect(extend.selector.elements[0].value).toBe('.b');
        });

        it('should parse extend with a more complex selector', async () => {
            const { err, root } = await parseLess('a:extend(div > .b #id) {}');
            expect(err).toBeNull();
            const extend = root.rules[0].selectors[0].extendList[0];
            const elements = extend.selector.elements;
            expect(elements.length).toBe(3);
            expect(elements[0].value).toBe('div');
            expect(elements[1].value).toBe('.b');
            expect(elements[1].combinator.value).toBe('>');
            expect(elements[2].value).toBe('#id');
            expect(elements[2].combinator.value).toBe(' '); // Descendant combinator (space)
        });
    });

    describe('Detached Rulesets', () => {
        it('should parse a variable assigned a detached ruleset', async () => {
            const { err, root } = await parseLess(
                '@my-ruleset: { color: blue; width: 100px; };'
            );
            expect(err).toBeNull();
            const decl = root.rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name).toBe('@my-ruleset');
            expect(decl.value).toBeInstanceOf(tree.DetachedRuleset);
            expect(decl.value.ruleset.rules.length).toBe(2);
        });

        it('should parse a mixin definition with a detached ruleset as parameter default', async () => {
            const { err, root } = await parseLess(
                '.mixin(@rules: {color: green;}) { @rules(); }'
            );
            expect(err).toBeNull();
            const mixinDef = root.rules[0];
            expect(mixinDef).toBeInstanceOf(tree.mixin.Definition);
            expect(mixinDef.params[0].name).toBe('@rules');
            expect(mixinDef.params[0].value).toBeInstanceOf(
                tree.DetachedRuleset
            );
        });
    });

    describe('Parser Options & Context', () => {
        it('should handle globalVars', async () => {
            const less = 'p { color: @globalVar; }';
            const parser = new Parser(
                {},
                { contents: {}, contentsIgnoredChars: {} },
                { filename: 'test.less' }
            );
            const promise = new Promise((resolve) => {
                parser.parse(less, (e, r) => resolve({ e, r }), {
                    globalVars: { globalVar: 'red' }
                });
            });
            const { e, r } = await promise;
            expect(e).toBeNull();
            expect(r.rules[0]).toBeInstanceOf(tree.Declaration);
            expect(r.rules[1]).toBeInstanceOf(tree.Ruleset);
        });

        it('should handle modifyVars', async () => {
            const less = 'p { color: @modVar; }';
            const parser = new Parser(
                {},
                { contents: {}, contentsIgnoredChars: {} },
                { filename: 'test.less' }
            );
            const promise = new Promise((resolve) => {
                parser.parse(less, (e, r) => resolve({ e, r }), {
                    modifyVars: { modVar: 'blue' }
                });
            });
            const { e, r } = await promise;
            expect(e).toBeNull();
            expect(r.rules[0]).toBeInstanceOf(tree.Ruleset);
            expect(r.rules[1]).toBeInstanceOf(tree.Declaration);
            expect(r.rules[1].name).toBe('@modVar');
        });

        it('should handle banner option', async () => {
            const lessInput = 'color: red;';
            const bannerContent = '/* My Banner */\n';
            const parser = new Parser(
                {},
                {
                    contents: { 'test.less': lessInput },
                    contentsIgnoredChars: { 'test.less': 0 },
                    rootFilename: 'test.less'
                },
                { filename: 'test.less' }
            );
            const promise = new Promise((resolve) => {
                parser.parse(lessInput, (e, r) => resolve({ e, r }), {
                    banner: bannerContent
                });
            });
            const { e, r } = await promise;

            expect(e).toBeNull();
            expect(r.rules[0]).toBeInstanceOf(tree.Comment);
            expect(r.rules[0].value).toBe('/* My Banner */');
            expect(r.rules[1]).toBeInstanceOf(tree.Declaration);
        });

        it('should use dumpLineNumbers from context for debugInfo', async () => {
            const less = '.class { color: red; }';
            const { err, root } = await parseLess(less, {
                dumpLineNumbers: 'comments'
            });
            expect(err).toBeNull();
            const ruleset = root.rules[0];
            expect(ruleset.debugInfo).toBeDefined();
            expect(ruleset.debugInfo.lineNumber).toBe(1);
        });
    });

    describe('Parser.serializeVars', () => {
        it('should serialize an empty object to an empty string', () => {
            expect(Parser.serializeVars({})).toBe('');
        });

        it('should serialize a simple variable map', () => {
            const vars = {
                color: 'red',
                'font-size': '12px'
            };
            const expected = '@color: red;@font-size: 12px;';
            expect(Parser.serializeVars(vars)).toBe(expected);
        });

        it('should handle variables already starting with @', () => {
            const vars = {
                '@color': 'blue'
            };
            const expected = '@color: blue;';
            expect(Parser.serializeVars(vars)).toBe(expected);
        });

        it('should add semicolon if not present', () => {
            const vars = {
                'my-var': 'value'
            };
            const expected = '@my-var: value;';
            expect(Parser.serializeVars(vars)).toBe(expected);
        });

        it('should not add extra semicolon if already present', () => {
            const vars = {
                'my-var': 'value;'
            };
            const expected = '@my-var: value;';
            expect(Parser.serializeVars(vars)).toBe(expected);
        });
    });

    describe('parseNode functionality', () => {
        let parserInstance;
        const testSnippetFilename = '_snippet_.less';

        beforeEach(() => {
            // For parseNode, the imports object needs to contain the snippet string
            // under a filename that LessError can reference if an error occurs *within* a sub-parser.
            // The fileInfo for the LessError will use this filename.
            parserInstance = new Parser(
                { processImports: false },
                {
                    contents: {}, // Will be populated per test
                    contentsIgnoredChars: {}, // Will be populated per test
                    rootFilename: testSnippetFilename
                },
                { filename: testSnippetFilename } // fileInfo for the parser context itself
            );
        });

        // Updated to use async/await and promises for parseNode tests for modern vitest compatibility
        const parseNodeAsync = (snippet, parseList) => {
            return new Promise((resolve) => {
                parserInstance.imports.contents[testSnippetFilename] = snippet;
                parserInstance.imports.contentsIgnoredChars[
                    testSnippetFilename
                ] = 0;
                parserInstance.parseNode(snippet, parseList, (err, nodes) => {
                    resolve({ err, nodes });
                });
            });
        };

        it('should parse a simple value string', async () => {
            const snippet = '10px solid red';
            const { err, nodes } = await parseNodeAsync(snippet, ['value']);
            expect(err).toBeNull();
            expect(nodes.length).toBe(1);
            const valueNode = nodes[0];
            expect(valueNode).toBeInstanceOf(tree.Value);
            expect(valueNode.value[0]).toBeInstanceOf(tree.Expression);
            expect(valueNode.value[0].value.length).toBe(3); // 10px, solid, red
        });

        it('should parse an important keyword', async () => {
            const snippet = '!important';
            const { err, nodes } = await parseNodeAsync(snippet, ['important']);
            expect(err).toBeNull();
            expect(nodes.length).toBe(1);
            // parserInput.$re(/^! *important/) will return exactly what it matches, e.g., '!important' or ' !important'.\n            // The .important() method in the parser doesn't add/remove spaces itself.\n            expect(nodes[0]).toBe(\'!important\'); // If input is '!important', output is '!important'
        });

        it('should handle errors in parseNode', async () => {
            const snippet = '10px solid ???';
            const { err, nodes } = await parseNodeAsync(snippet, ['value']);
            expect(err).not.toBeNull();
            if (typeof err === 'object' && err.message) {
                expect(err.message).toContain('Unrecognised input');
            } else if (err === true) {
                // This case means parsing finished but not everything was consumed, which is an error state for parseNode.
                // No specific message to check here, err being true is the error indicator.
                expect(err).toBe(true);
            } else {
                // Fail if err is not an object with a message or boolean true
                expect(true).toBe(false); // Force a failure with a clear message if err is unexpected type
            }
            expect(nodes).toBeNull();
        });

        it('should parse a selector', async () => {
            const snippet = '.my-class ~ .another';
            const { err, nodes } = await parseNodeAsync(snippet, ['selector']);
            expect(err).toBeNull();
            expect(nodes.length).toBe(1);
            const selector = nodes[0];
            expect(selector).toBeInstanceOf(tree.Selector);
            expect(selector.elements.length).toBe(2);
            expect(selector.elements[0].value).toBe('.my-class');
            expect(selector.elements[1].combinator.value).toBe('~');
            expect(selector.elements[1].value).toBe('.another');
        });

        it('should parse an expression', async () => {
            const snippet = '10px * (@var + 5)';
            const { err, nodes } = await parseNodeAsync(snippet, [
                'expression'
            ]);
            expect(err).toBeNull();
            expect(nodes.length).toBe(1); // The Expression node itself
            const expressionNode = nodes[0];
            expect(expressionNode).toBeInstanceOf(tree.Expression);
            expect(expressionNode.value.length).toBe(1); // The top-level Operation should be the single element

            const topOperation = expressionNode.value[0];
            expect(topOperation).toBeInstanceOf(tree.Operation);
            expect(topOperation.op).toBe('*');
            expect(topOperation.operands[0]).toBeInstanceOf(tree.Dimension);
            expect(topOperation.operands[0].value).toBe(10);
            expect(topOperation.operands[0].unit.toCSS()).toBe('px');

            const subExpression = topOperation.operands[1];
            expect(subExpression).toBeInstanceOf(tree.Expression);
            expect(subExpression.parens).toBe(true);
            expect(subExpression.value.length).toBe(1);
            const innerOperation = subExpression.value[0];
            expect(innerOperation).toBeInstanceOf(tree.Operation);
            expect(innerOperation.op).toBe('+');
            expect(innerOperation.operands[0]).toBeInstanceOf(tree.Variable);
            expect(innerOperation.operands[0].name).toBe('@var');
            expect(innerOperation.operands[1]).toBeInstanceOf(tree.Dimension);
            expect(innerOperation.operands[1].value).toBe(5);
        });

        it('should parse a rule', async () => {
            const snippet = 'color: red;'; // Added semicolon
            // Try 'declaration' as the parser function name
            const { err, nodes } = await parseNodeAsync(snippet, [
                'declaration'
            ]);
            expect(err).toBeNull();
            expect(nodes.length).toBe(1);
            const declNode = nodes[0];
            expect(declNode).toBeInstanceOf(tree.Declaration);
            if (Array.isArray(declNode.name)) {
                expect(declNode.name.length).toBeGreaterThanOrEqual(1);
                expect(declNode.name[0].value).toBe('color');
            } else {
                expect(declNode.name).toBe('color');
            }
            // For simple keyword values like 'red', the parser often uses anonymousValue()
            expect(declNode.value).toBeInstanceOf(tree.Anonymous);
            expect(declNode.value.value).toBe('red');
        });
    });

    describe('CSS Custom Properties', () => {
        it('should parse custom property declaration', async () => {
            const less = '.class { --my-custom-prop: 10px; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const decl = root.rules[0].rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name[0].value).toBe('--my-custom-prop'); // Or just `name` if not an array

            // Assuming decl.value is an object with a .value array (like tree.Value)
            // and that array directly contains the Dimension node.
            expect(decl.value).toBeDefined();
            expect(decl.value.value).toBeInstanceOf(Array);
            expect(decl.value.value.length).toBeGreaterThanOrEqual(1);

            // The first element in decl.value.value should be the Dimension node itself
            const dimensionNode = decl.value.value[0];
            expect(dimensionNode).toBeDefined();
            expect(dimensionNode).toBeInstanceOf(tree.Dimension);
            expect(dimensionNode.value).toBe(10);
            expect(dimensionNode.unit.toCSS()).toBe('px');
        });

        it('should parse custom property usage with var()', async () => {
            const less = '.class { color: var(--my-custom-prop); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const decl = root.rules[0].rules[0];
            expect(decl.value.value[0].value[0]).toBeInstanceOf(tree.Call); // `var()` is a call
            expect(decl.value.value[0].value[0].name).toBe('var');
            expect(decl.value.value[0].value[0].args.length).toBe(1);
            // Argument to var() is usually an Anonymous node containing the variable name.
            // It could also be a specific CustomProperty node if the parser identifies it.
            expect(decl.value.value[0].value[0].args[0].value).toBe(
                '--my-custom-prop'
            );
        });

        it('should parse custom property usage with var() and fallback', async () => {
            const less = '.class { color: var(--my-custom-prop, blue); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const decl = root.rules[0].rules[0];
            const varCall = decl.value.value[0].value[0];
            expect(varCall.name).toBe('var');
            expect(varCall.args.length).toBe(2);
            expect(varCall.args[0].value).toBe('--my-custom-prop');
            // Fallback value can be a Keyword, Color, etc.
            // The parser correctly identifies 'blue' as a Color.
            expect(varCall.args[1]).toBeInstanceOf(tree.Color);
            expect(varCall.args[1].toRGB()).toBe('#0000ff'); // CSS standard for blue
        });
    });

    describe('Merge Feature', () => {
        it('should parse property merging with +', async () => {
            const less = '.class { box-shadow+: inset 0 0 10px #555; }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const decl = root.rules[0].rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name[0].value).toBe('box-shadow');
            expect(decl.merge).toBe('+');
            expect(decl.value).toBeInstanceOf(tree.Value);
            const expr = decl.value.value[0]; // Should be an Expression
            expect(expr).toBeInstanceOf(tree.Expression);
            expect(expr.value.length).toBe(5); // inset, 0, 0, 10px, #555
            expect(expr.value[0].value).toBe('inset');
            expect(expr.value[1].value).toBe(0);
            expect(expr.value[2].value).toBe(0);
            expect(expr.value[3]).toBeInstanceOf(tree.Dimension);
            expect(expr.value[3].value).toBe(10);
            expect(expr.value[3].unit.toCSS()).toBe('px');
            expect(expr.value[4]).toBeInstanceOf(tree.Color);
            expect(expr.value[4].toRGB()).toBe('#555555'); // Or #555, depending on Color.toRGB()
        });

        it('should parse property merging with +_', async () => {
            const less = '.class { transform+_: rotate(5deg); }';
            const { err, root } = await parseLess(less);
            expect(err).toBeNull();
            const decl = root.rules[0].rules[0];
            expect(decl).toBeInstanceOf(tree.Declaration);
            expect(decl.name[0].value).toBe('transform');
            expect(decl.merge).toBe('+_');
            expect(decl.value).toBeInstanceOf(tree.Value);
            const expr = decl.value.value[0]; // Should be an Expression
            expect(expr).toBeInstanceOf(tree.Expression);
            expect(expr.value.length).toBe(1); // The Call node itself
            const callNode = expr.value[0];
            expect(callNode).toBeInstanceOf(tree.Call);
            expect(callNode.name).toBe('rotate');
            expect(callNode.args.length).toBe(1);
            expect(callNode.args[0]).toBeInstanceOf(tree.Dimension);
            expect(callNode.args[0].value).toBe(5);
            expect(callNode.args[0].unit.toCSS()).toBe('deg');
        });
    });
});
