var mess, tree;

if (typeof(window) === 'undefined') {
    mess = exports,
    tree = require('mess/tree');
} else {
    if (typeof(window.mess) === 'undefined') { window.mess = {} }
    mess = window.mess,
    tree = window.mess.tree = {};
}
//
// mess.js - parser
//
//    A relatively straight-forward predictive parser.
//    There is no tokenization/lexing stage, the input is parsed
//    in one sweep.
//
//    To make the parser fast enough to run in the browser, several
//    optimization had to be made:
//
//    - Matching and slicing on a huge input is often cause of slowdowns.
//      The solution is to chunkify the input into smaller strings.
//      The chunks are stored in the `chunks` var,
//      `j` holds the current chunk index, and `current` holds
//      the index of the current chunk in relation to `input`.
//      This gives us an almost 4x speed-up.
//
//    - In many cases, we don't need to match individual tokens;
//      for example, if a value doesn't hold any variables, operations
//      or dynamic references, the parser can effectively 'skip' it,
//      treating it as a literal.
//      An example would be '1px solid #000' - which evaluates to itself,
//      we don't need to know what the individual components are.
//      The drawback, of course is that you don't get the benefits of
//      syntax-checking on the CSS. This gives us a 50% speed-up in the parser,
//      and a smaller speed-up in the code-gen.
//
//
//    Token matching is done with the `$` function, which either takes
//    a terminal string or regexp, or a non-terminal function to call.
//    It also takes care of moving all the indices forwards.
//
//
mess.Parser = function Parser(env) {
    var input,       // LeSS input string
        i,           // current index in `input`
        j,           // current chunk
        temp,        // temporarily holds a chunk's state, for backtracking
        memo,        // temporarily holds `i`, when backtracking
        furthest,    // furthest index the parser has gone to
        chunks,      // chunkified input
        current,     // index of current chunk, in `input`
        parser;

    var that = this;

    // This function is called after all files
    // have been imported through `@import`.
    var finish = function() {};

    var imports = this.imports = {
        paths: env && env.paths || [],  // Search paths, when importing
        queue: [],                      // Files which haven't been imported yet
        files: {},                      // Holds the imported parse trees
        mime: env && env.mime,         // MIME type of .mess files
        push: function(path, callback) {
            var that = this;
            this.queue.push(path);

            //
            // Import a file asynchronously
            //
            mess.Parser.importer(path, this.paths, function(root) {
                that.queue.splice(that.queue.indexOf(path), 1); // Remove the path from the queue
                that.files[path] = root;                        // Store the root

                callback(root);

                if (that.queue.length === 0) { finish() }       // Call `finish` if we're done importing
            }, env);
        }
    };

    function save()    { temp = chunks[j], memo = i, current = i }
    function restore() { chunks[j] = temp, i = memo, current = i }

    function sync() {
        if (i > current) {
            chunks[j] = chunks[j].slice(i - current);
            current = i;
        }
    }
    //
    // Parse from a token, regexp or string, and move forward if match
    //
    function $(tok) {
        var match, args, length, c, index, endIndex, k;

        //
        // Non-terminal
        //
        if (tok instanceof Function) {
            return tok.call(parser.parsers);
        //
        // Terminal
        //
        //     Either match a single character in the input,
        //     or match a regexp in the current chunk (chunk[j]).
        //
        } else if (typeof(tok) === 'string') {
            match = input.charAt(i) === tok ? tok : null;
            length = 1;
            sync();
        } else {
            sync();

            if (match = tok.exec(chunks[j])) {
                length = match[0].length;
            } else {
                return null;
            }
        }

        // The match is confirmed, add the match length to `i`,
        // and consume any extra white-space characters (' ' || '\n')
        // which come after that. The reason for this is that LeSS's
        // grammar is mostly white-space insensitive.
        //
        if (match) {
            mem = i += length;
            endIndex = i + chunks[j].length - length;

            while (i < endIndex) {
                c = input.charCodeAt(i);
                if (! (c === 32 || c === 10 || c === 9)) { break }
                i++;
            }
            chunks[j] = chunks[j].slice(length + (i - mem));
            current = i;

            if (chunks[j].length === 0 && j < chunks.length - 1) { j++ }

            if (typeof(match) === 'string') {
                return match;
            } else {
                return match.length === 1 ? match[0] : match;
            }
        }
    }

    // Same as $(), but don't change the state of the parser,
    // just return the match.
    function peek(tok) {
        if (typeof(tok) === 'string') {
            return input.charAt(i) === tok;
        } else {
            if (tok.test(chunks[j])) {
                return true;
            } else {
                return false;
            }
        }
    }

    function errorMessage(message, i) {
        if (typeof i === 'undefined') i = furthest;
        lines = input.split('\n');
        line = (input.slice(0, i).match(/\n/g) || '').length + 1;

        for (var n = i, column = -1; n >= 0 && input.charAt(n) !== '\n'; n--) { column++ }

        return {
            name: 'ParseError',
            message: (message || 'Syntax Error') + ' on line ' + line,
            filename: env.filename,
            line: line,
            index: i,
            column: column,
            extract: [
                lines[line - 2],
                lines[line - 1],
                lines[line]
            ]
        };
    }

    this.env = env = env || {};

    // The optimization level dictates the thoroughness of the parser,
    // the lower the number, the mess nodes it will create in the tree.
    // This could matter for debugging, or if you want to access
    // the individual nodes in the tree.
    this.optimization = ('optimization' in this.env) ? this.env.optimization : 1;

    this.env.filename = this.env.filename || null;

    //
    // The Parser
    //
    return parser = {

        imports: imports,
        //
        // Parse an input string into an abstract syntax tree,
        // call `callback` when done.
        //
        parse: function(str, callback) {
            var root, start, end, zone, line, lines, buff = [], c, error = null;

            i = j = current = furthest = 0;
            chunks = [];
            input = str.replace(/\r\n/g, '\n');

            // Split the input into chunks.
            chunks = (function(chunks) {
                var j = 0,
                    skip = /[^"'`\{\}\/]+/g,
                    comment = /\/\*(?:[^*]|\*+[^\/*])*(?:\*+\/\n?|\**$)|\/\/.*/g,
                    level = 0,
                    match,
                    chunk = chunks[0],
                    inString;

                for (var i = 0, c, cc; i < input.length; i++) {
                    skip.lastIndex = i;
                    if (match = skip.exec(input)) {
                        if (match.index === i) {
                            i += match[0].length;
                            chunk.push(match[0]);
                        }
                    }
                    c = input.charAt(i);
                    comment.lastIndex = i;

                    if (!inString && c === '/') {
                        cc = input.charAt(i + 1);
                        if (cc === '/' || cc === '*') {
                            if (match = comment.exec(input)) {
                                if (match.index === i) {
                                    i += match[0].length;
                                    chunk.push(match[0]);
                                    c = input.charAt(i);
                                }
                            }
                        }
                    }

                    if (c === '{' && !inString) { level++;
                        chunk.push(c);
                    } else if (c === '}' && !inString) { level--;
                        chunk.push(c);
                        chunks[++j] = chunk = [];
                    } else {
                        if (c === '"' || c === "'" || c === '`') {
                            if (! inString) {
                                inString = c;
                            } else {
                                inString = inString === c ? false : inString;
                            }
                        }
                        chunk.push(c);
                    }
                }
                if (level > 0) {
                    throw errorMessage('Missing closing `}`', i);
                }

                return chunks.map(function(c) { return c.join('') });
            })([[]]);

            // Start with the primary rule.
            // The whole syntax tree is held under a Ruleset node,
            // with the `root` property set to true, so no `{}` are
            // output. The callback is called when the input is parsed.
            root = new tree.Ruleset([], $(this.parsers.primary));
            root.root = true;

            /**
             * Get an array of Ruleset objects, flattened
             * and sorted according to specificitySort
             */
            root.toList = (function() {
                var line, lines, column;

                return function(options, variables) {
                    options = options || {};
                    options.compress = 'compress' in options ?
                        options.compress : (env.compress || false);

                    try {
                        var definitions = this.flatten([]);
                        definitions.sort(specificitySort);
                        return definitions;
                    }
                    catch (e) {
                        lines = input.split('\n');
                        line = getLine(e.index);

                        for (var n = e.index, column = -1;
                                 n >= 0 && input.charAt(n) !== '\n';
                                 n--) { column++ }

                        throw {
                            type: e.type,
                            message: e.message,
                            filename: env.filename,
                            index: e.index,
                            line: typeof(line) === 'number' ? line + 1 : null,
                            callLine: e.call && (getLine(e.call) + 1),
                            callExtract: lines[getLine(e.call)],
                            stack: e.stack,
                            column: column,
                            extract: [
                                lines[line - 1],
                                lines[line],
                                lines[line + 1]
                            ]
                        }
                    }

                    function getLine(index) {
                        return index ? (input.slice(0, index).match(/\n/g) || '').length : null;
                    }
                };
            })();

            /**
             * Sort rules by specificity: this function expects selectors to be
             * split already.
             *
             * Written to be used as a .sort(Function);
             * argument.
             *
             * [1, 0, 0, 467] > [0, 0, 1, 520]
             */
            var specificitySort = function(a, b) {
                var as = a.selector.specificity();
                var bs = b.selector.specificity();

                for (var i = 0; i < as.length; i++) {
                    if (as[i] < bs[i]) return true;
                    if (as[i] > bs[i]) break;
                }
            };

            // If `i` is smaller than the `input.length - 1`,
            // it means the parser wasn't able to parse the whole
            // string, so we've got a parsing error.
            //
            // We try to extract a \n delimited string,
            // showing the line where the parse error occured.
            // We split it up into two parts (the part which parsed,
            // and the part which didn't), so we can color them differently.
            if (i < input.length - 1) {
                error = errorMessage('Parse error', i);
            }

            if (this.imports.queue.length > 0) {
                finish = function() { callback(error, root) };
            } else {
                callback(error, root);
            }
        },

        //
        // Here in, the parsing rules/functions
        //
        // The basic structure of the syntax tree generated is as follows:
        //
        //   Ruleset ->  Rule -> Value -> Expression -> Entity
        //
        // Here's some LESS code:
        //
        //    .class {
        //      color: #fff;
        //      border: 1px solid #000;
        //      width: @w + 4px;
        //      > .child {...}
        //    }
        //
        // And here's what the parse tree might look like:
        //
        //     Ruleset (Selector '.class', [
        //         Rule ("color",  Value ([Expression [Color #fff]]))
        //         Rule ("border", Value ([Expression [Dimension 1px][Keyword "solid"][Color #000]]))
        //         Rule ("width",  Value ([Expression [Operation "+" [Variable "@w"][Dimension 4px]]]))
        //         Ruleset (Selector [Element '>', '.child'], [...])
        //     ])
        //
        //  In general, most rules will try to parse a token with the `$()` function, and if the return
        //  value is truly, will return a new node, of the relevant type. Sometimes, we need to check
        //  first, before parsing, that's when we use `peek()`.
        //
        parsers: {
            //
            // The `primary` rule is the *entry* and *exit* point of the parser.
            // The rules here can appear at any level of the parse tree.
            //
            // The recursive nature of the grammar is an interplay between the `block`
            // rule, which represents `{ ... }`, the `ruleset` rule, and this `primary` rule,
            // as represented by this simplified grammar:
            //
            //     primary  →  (ruleset | rule)+
            //     ruleset  →  selector+ block
            //     block    →  '{' primary '}'
            //
            // Only at one point is the primary rule not called from the
            // block rule: at the root level.
            //
            primary: function() {
                var node, root = [];

                while ((node = $(this.mixin.definition) || $(this.rule) || $(this.ruleset) ||
                               $(this.mixin.call) || $(this.comment))
                               || $(/^[\s\n]+/)) {
                    node && root.push(node);
                }
                return root;
            },

            // We create a Comment node for CSS comments `/* */`,
            // but keep the LeSS comments `//` silent, by just skipping
            // over them.
            comment: function() {
                var comment;

                if (input.charAt(i) !== '/') return;

                if (input.charAt(i + 1) === '/') {
                    return new tree.Comment($(/^\/\/.*/), true);
                } else if (comment = $(/^\/\*(?:[^*]|\*+[^\/*])*(?:\*+\/\n?|\**$)/)) {
                    return new tree.Comment(comment);
                }
            },

            //
            // Entities are tokens which can be found inside an Expression
            //
            entities: {
                //
                // A string, which supports escaping " and '
                //
                //     "milky way" 'he\'s the one!'
                //
                quoted: function() {
                    var str;
                    if (input.charAt(i) !== '"' && input.charAt(i) !== "'") return;

                    if (str = $(/^"((?:[^"\\\r\n]|\\.)*)"|'((?:[^'\\\r\n]|\\.)*)'/)) {
                        return new tree.Quoted(str[0], str[1] || str[2]);
                    }
                },

                comparison: function() {
                    var str;
                    // todo: <=
                    if (str = $(/^=|!=|<=|>=|<|>/)) {
                        return new tree.Comparison(str);
                    }
                },

                //
                // A catch-all word, such as:
                //
                //     black border-collapse
                //
                keyword: function() {
                    var k;
                    if (k = $(/^[A-Za-z-]+/)) { return new tree.Keyword(k) }
                },

                //
                // A function call
                //
                //     rgb(255, 0, 255)
                //
                // The arguments are parsed with the `entities.arguments` parser.
                //
                call: function() {
                    var name, args;

                    if (! (name = /^([\w-]+|%)\(/.exec(chunks[j]))) return;

                    name = name[1].toLowerCase();

                    if (name === 'url') { return null }
                    else { i += name.length + 1 }

                    args = $(this.entities.arguments);

                    if (! $(')')) return;

                    if (name) { return new tree.Call(name, args) }
                },
                arguments: function() {
                    var args = [], arg;

                    while (arg = $(this.expression)) {
                        args.push(arg);
                        if (! $(',')) { break }
                    }
                    return args;
                },
                literal: function() {
                    return $(this.entities.dimension) ||
                           $(this.entities.color) ||
                           $(this.entities.quoted);
                },

                //
                // Parse url() tokens
                //
                // We use a specific rule for urls, because they don't really behave like
                // standard function calls. The difference is that the argument doesn't have
                // to be enclosed within a string, so it can't be parsed as an Expression.
                //
                url: function() {
                    var value;

                    if (input.charAt(i) !== 'u' || !$(/^url\(/)) return;
                    value = $(this.entities.quoted) || $(this.entities.variable) ||
                            $(/^[-\w%@$\/.&=:;#+?]+/) || '';
                    if (! $(')')) throw new Error('missing closing ) for url()');

                    return new tree.URL((value.value || value.data || value instanceof tree.Variable)
                                        ? value : new tree.Anonymous(value), imports.paths);
                },

                //
                // A Variable entity, such as `@fink`, in
                //
                //     width: @fink + 2px
                //
                // We use a different parser for variable definitions,
                // see `parsers.variable`.
                //
                variable: function() {
                    var name, index = i;

                    if (input.charAt(i) === '@' && (name = $(/^@[\w-]+/))) {
                        return new tree.Variable(name, index);
                    }
                },

                //
                // A Hexadecimal color
                //
                //     #4F3C2F
                //
                // `rgb` and `hsl` colors are parsed through the `entities.call` parser.
                //
                color: function() {
                    var rgb;

                    if (input.charAt(i) === '#' && (rgb = $(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/))) {
                        return new tree.Color(rgb[1]);
                    }
                },

                //
                // A Dimension, that is, a number and a unit
                //
                //     0.5em 95%
                //
                dimension: function() {
                    var value, c = input.charCodeAt(i);
                    if ((c > 57 || c < 45) || c === 47) return;

                    if (value = $(/^(-?\d*\.?\d+)(px|%|em|pc|ex|in|deg|s|ms|pt|cm|mm|rad|grad|turn)?/)) {
                        return new tree.Dimension(value[1], value[2]);
                    }
                },

                //
                // JavaScript code to be evaluated
                //
                //     `window.location.href`
                //
                javascript: function() {
                    var str;

                    if (input.charAt(i) !== '`') { return }

                    if (str = $(/^`([^`]*)`/)) {
                        return new tree.JavaScript(str[1], i);
                    }
                }
            },

            //
            // The variable part of a variable definition. Used in the `rule` parser
            //
            //     @fink:
            //
            variable: function() {
                var name;

                if (input.charAt(i) === '@' && (name = $(/^(@[\w-]+)\s*:/))) { return name[1] }
            },

            //
            // Mixins
            //
            mixin: {
                //
                // A Mixin call, with an optional argument list
                //
                //     #mixins > .square(#fff);
                //     .rounded(4px, black);
                //     .button;
                //
                // The `while` loop is there because mixins can be
                // namespaced, but we only support the child and descendant
                // selector for now.
                //
                call: function() {
                    var elements = [], e, c, args, index = i, s = input.charAt(i);

                    if (s !== '.' && s !== '#') { return }

                    while (e = $(/^[#.](?:[\w-]|\\(?:[a-fA-F0-9]{1,6} ?|[^a-fA-F0-9]))+/)) {
                        elements.push(new tree.Element(c, e));
                        c = $('>');
                    }
                    $('(') && (args = $(this.entities.arguments)) && $(')');

                    if (elements.length > 0 && ($(';') || peek('}'))) {
                        throw 'Calls are not yet supported';
                        return new tree.mixin.Call(elements, args, index);
                    }
                },

                //
                // A Mixin definition, with a list of parameters
                //
                //     .rounded (@radius: 2px, @color) {
                //        ...
                //     }
                //
                // Until we have a finer grained state-machine, we have to
                // do a look-ahead, to make sure we don't have a mixin call.
                // See the `rule` function for more information.
                //
                // We start by matching `.rounded (`, and then proceed on to
                // the argument list, which has optional default values.
                // We store the parameters in `params`, with a `value` key,
                // if there is a value, such as in the case of `@radius`.
                //
                // Once we've got our params list, and a closing `)`, we parse
                // the `{...}` block.
                //
                definition: function() {
                    var name, params = [], match, ruleset, param, value;

                    if ((input.charAt(i) !== '.' && input.charAt(i) !== '#') ||
                        peek(/^[^{]*(;|})/)) return;

                    if (match = $(/^([#.](?:[\w-]|\\(?:[a-fA-F0-9]{1,6} ?|[^a-fA-F0-9]))+)\s*\(/)) {
                        name = match[1];

                        while (param = $(this.entities.variable) || $(this.entities.literal)
                                                                 || $(this.entities.keyword)) {
                            // Variable
                            if (param instanceof tree.Variable) {
                                if ($(':')) {
                                    if (value = $(this.expression)) {
                                        params.push({ name: param.name, value: value });
                                    } else {
                                        throw new Error('Expected value');
                                    }
                                } else {
                                    params.push({ name: param.name });
                                }
                            } else {
                                params.push({ value: param });
                            }
                            if (! $(',')) { break }
                        }
                        if (! $(')')) throw new Error('Expected )');

                        ruleset = $(this.block);

                        if (ruleset) {
                            throw 'Definitions should not exist here';
                            return new tree.mixin.Definition(name, params, ruleset);
                        }
                    }
                }
            },

            //
            // Entities are the smallest recognized token,
            // and can be found inside a rule's value.
            //
            entity: function() {
                return $(this.entities.literal) || $(this.entities.variable) || $(this.entities.url) ||
                       $(this.entities.call) || $(this.entities.keyword) || $(this.entities.javascript);
            },

            //
            // A Rule terminator. Note that we use `peek()` to check for '}',
            // because the `block` rule will be expecting it, but we still need to make sure
            // it's there, if ';' was ommitted.
            //
            end: function() {
                return $(';') || peek('}');
            },

            //
            // A Selector Element
            //
            //     div
            //     .classname
            //     #socks
            //     input[type="text"]
            //
            // Elements are the building blocks for Selectors. They consist of
            // an element name, such as a tag a class, or `*`.
            //
            element: function() {
                var e;
                if (e = $(/^(?:[.#]?[\w-]+|\*)/)) {
                    return new tree.Element(e);
                }
            },

            //
            // Attachments allow adding multiple lines, polygons etc. to an
            // object. There can only be one attachment per selector.
            //
            attachment: function() {
                var s;
                if (s = $(/^::([\w-]+)/)) {
                    // There's no object for attachment names.
                    return s[1];
                }
            },

            //
            // A CSS Selector
            //
            //     .class > div + h1
            //     li a:hover
            //
            // Selectors are made out of one or more Elements, see above.
            //
            selector: function() {
                var a, attachment = null;
                var e, elements = [];
                var f, filters = [];

                while (
                        (e = $(this.element)) ||
                        (f = $(this.filter)) ||
                        (a = $(this.attachment))
                    ) {
                    if (e) {
                        elements.push(e);
                    } else if (f) {
                        filters.push(f);
                    } else if (attachment !== null) {
                        throw errorMessage('Encountered second attachment name', i - 1);
                    } else {
                        attachment = a;
                    }

                    var c = input.charAt(i);
                    if (c === '{' || c === '}' || c === ';' || c === ',') { break }
                }

                if (elements.length > 0 || filters.length > 0 || attachment !== null) {
                    return new tree.Selector(elements, filters, attachment, memo);
                }
            },

            filter: function() {
                save();
                if (! $('[')) return;
                if (key = $(/^[a-zA-Z0-9-_]+/) || $(this.entities.quoted)) {
                    if ((op = $(this.entities.comparison)) &&
                        (val = $(this.entities.quoted) || $(/^[\w-]+/))) {
                        if (! $(']')) return;
                        if (key == 'zoom') {
                            return new tree.ZoomFilter(op, val, memo);
                        } else {
                            return new tree.Filter(key, op, val, memo);
                        }
                    }
                }
            },

            //
            // The `block` rule is used by `ruleset` and `mixin.definition`.
            // It's a wrapper around the `primary` rule, with added `{}`.
            //
            block: function() {
                var content;

                if ($('{') && (content = $(this.primary)) && $('}')) {
                    return content;
                }
            },

            //
            // div, .class, body > p {...}
            //
            ruleset: function() {
                var selectors = [], s, f, l, rules, filters = [];
                save();

                while (s = $(this.selector)) {
                    selectors.push(s);
                    if (! $(',')) { break }
                }
                if (s) $(this.comment);

                if (selectors.length > 0 && (rules = $(this.block))) {
                    if (selectors.length === 1 &&
                        selectors[0].elements.length &&
                        selectors[0].elements[0].value === 'Map') {
                        var rs = new tree.Ruleset(selectors, rules);
                        rs.isMap = true;
                        return rs;
                    }
                    return new tree.Ruleset(selectors, rules);
                } else {
                    // Backtrack
                    restore();
                }
            },
            rule: function() {
                var name, value, c = input.charAt(i), important;
                save();

                if (c === '.' || c === '#' || c === '&') { return }

                if (name = $(this.variable) || $(this.property)) {
                    value = $(this.value);
                    important = $(this.important);

                    if (value && $(this.end)) {
                        return new tree.Rule(name, value, important, memo);
                    } else {
                        furthest = i;
                        restore();
                    }
                }
            },

            font: function() {
                var value = [], expression = [], weight, shorthand, font, e;

                while (e = $(this.shorthand) || $(this.entity)) {
                    expression.push(e);
                }
                value.push(new tree.Expression(expression));

                if ($(',')) {
                    while (e = $(this.expression)) {
                        value.push(e);
                        if (! $(',')) { break }
                    }
                }
                return new tree.Value(value);
            },

            //
            // A Value is a comma-delimited list of Expressions
            //
            //     font-family: Baskerville, Georgia, serif;
            //
            // In a Rule, a Value represents everything after the `:`,
            // and before the `;`.
            //
            value: function() {
                var e, expressions = [], important;

                while (e = $(this.expression)) {
                    expressions.push(e);
                    if (! $(',')) { break }
                }

                if (expressions.length > 0) {
                    return new tree.Value(expressions);
                }
            },
            important: function() {
                if (input.charAt(i) === '!') {
                    return $(/^! *important/);
                }
            },
            sub: function() {
                var e;

                if ($('(') && (e = $(this.expression)) && $(')')) {
                    return e;
                }
            },
            multiplication: function() {
                var m, a, op, operation;
                if (m = $(this.operand)) {
                    while ((op = ($('/') || $('*'))) && (a = $(this.operand))) {
                        operation = new tree.Operation(op, [operation || m, a]);
                    }
                    return operation || m;
                }
            },
            addition: function() {
                var m, a, op, operation;
                if (m = $(this.multiplication)) {
                    while ((op = $(/^[-+]\s+/) || (input.charAt(i - 1) != ' ' && ($('+') || $('-')))) &&
                           (a = $(this.multiplication))) {
                        operation = new tree.Operation(op, [operation || m, a]);
                    }
                    return operation || m;
                }
            },

            //
            // An operand is anything that can be part of an operation,
            // such as a Color, or a Variable
            //
            operand: function() {
                return $(this.sub) || $(this.entities.dimension) ||
                       $(this.entities.color) || $(this.entities.variable) ||
                       $(this.entities.call);
            },

            //
            // Expressions either represent mathematical operations,
            // or white-space delimited Entities.
            //
            //     1px solid black
            //     @var * 2
            //
            expression: function() {
                var e, delim, entities = [], d;

                while (e = $(this.addition) || $(this.entity)) {
                    entities.push(e);
                }
                if (entities.length > 0) {
                    return new tree.Expression(entities);
                }
            },
            property: function() {
                var name;

                if (name = $(/^(\*?-?[-a-z_0-9]+)\s*:/)) {
                    return name[1];
                }
            }
        }
    };
};

if (typeof(window) !== 'undefined') {
    //
    // Used by `@import` directives
    //
    mess.Parser.importer = function(path, paths, callback, env) {
        if (path.charAt(0) !== '/' && paths.length > 0) {
            path = paths[0] + path;
        }
        // We pass `true` as 3rd argument, to force the reload of the import.
        // This is so we can get the syntax tree as opposed to just the CSS output,
        // as we need this to evaluate the current stylesheet.
        loadStyleSheet({ href: path, title: path, type: env.mime }, callback, true);
    };
}
