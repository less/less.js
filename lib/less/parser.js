if (typeof(window) === 'undefined') {
    var less = exports || {};
    var tree = require(require('path').join(__dirname, '..', 'less', 'tree'));
}
//
// less.js - parser
//
//      A relatively straight-forward recursive-descent parser.
//      There is no tokenization/lexing stage, the input is parsed
//      in one sweep.
//
//      To make the parser fast enough to run in the browser, several
//      optimization had to be made:
//
//          - Instead of the more commonly used technique of slicing the
//          input string on every match, we use global regexps (/g),
//          and move the `lastIndex` pointer on match, foregoing `slice()`
//          completely. This gives us a 3x speed-up.
//
//          - Matching on a huge input is often cause of slowdowns,
//          especially with the /g flag. The solution to that is to
//          chunkify the input: we split it by /\n\n/, just to be on
//          the safe side. The chunks are stored in the `chunks` var,
//          `j` holds the current chunk index, and `current` holds
//          the index of the current chunk in relation to `input`.
//          This gives us an almost 4x speed-up.
//
//          - In many cases, we don't need to match individual tokens;
//          for example, if a value doesn't hold any variables, operations
//          or dynamic references, the parser can effectively 'skip' it,
//          treating it as a literal.
//          An example would be '1px solid #000' - which evaluates to itself,
//          we don't need to know what the individual components are.
//          The drawback, of course is that you don't get the benefits of
//          syntax-checking on the CSS. This gives us a 50% speed-up in the parser,
//          and a smaller speed-up in the code-gen.
//
//
//      Token matching is done with the `$` function, which either takes
//      a terminal string or regexp, or a non-terminal function to call.
//      It also takes care of moving all the indices forwards.
//
//
var input,       // LeSS input string
    i,           // current index in `input`
    j,           // current chunk
    chunks,      // chunkified input
    current,     // index of current chunk, in `input`
    inputLength;

function peek(tok) {
    var match;

    if (typeof(tok) === 'string') {
        return input[i] === tok;
    } else {
        tok.lastIndex = i;

        if ((match = tok.exec(input)) &&
           (tok.lastIndex - match[0].length === i)) {
            return match;
        }
    }
}

//
// Parse from a token, regexp or string, and move forward if match
//
function $(tok) {
    var match, args, length, c, index, endIndex;

    //
    // Non-terminal
    //
    if (tok instanceof Function) {
        return tok.call(less.parser.parsers);
    //
    // Terminal
    //
    //     Either match a single character in the input,
    //     or match a regexp in the current chunk (chunk[j]).
    //
    } else if (typeof(tok) === 'string') {
        match = input[i] === tok ? tok : null;
        length = 1;

    //  1. We move to the next chunk, if necessary.
    //  2. Set the `lastIndex` to be relative
    //     to the current chunk, and try to match in it.
    //  3. Make sure we matched at `index`. Because we use
    //     the /g flag, the match could be anywhere in the
    //     chunk. We have to make sure it's at our previous
    //     index, which we stored in [2].
    //
    } else {
        if (i >= current + chunks[j].length &&
            j < chunks.length - 1) { // 1.
            current += chunks[j++].length;
        }
        tok.lastIndex = index =  i - current; // 2.
        match = tok.exec(chunks[j]);

        if (match) {
            length = match[0].length;
            if (tok.lastIndex - length !== index) { return } // 3.
        }
    }

    // The match is confirmed, add the match length to `i`,
    // and consume any extra white-space characters (' ' || '\n')
    // which come after that. The reason for this is that LeSS's
    // grammar is mostly white-space insensitive.
    //
    if (match) {
        i += length;
        endIndex = current + chunks[j].length;

        while (i <= endIndex) {
            c = input.charCodeAt(i);
            if (! (c === 32 || c === 10 || c === 9)) { break }
            i++;
        }
        return match.length === 1 ? match[0] : match;
    }
}

less.parser = {
    optimization: 2,
    //
    // Parse an input string into an abstract syntax tree
    //
    parse: function (str) {
        var root, start, end, zone, line, buff = [], c;

        i = j = current = 0;
        chunks = [];
        input = str.replace(/\r\n/g, '\n');
        inputLength = input.length;
        this.error = null;

        // Split the input into chunks,
        // Either delimited by /\n\n/ or
        // delmited by '\n}' (see rationale above),
        // depending on the level of optimization.
        if (this.optimization > 0) {
            if (this.optimization > 2) {
                input = input.replace(/\/\*(?:[^*]|\*+[^\/*])*\*+\//g, '');
                chunks = input.split(/^(?=\n)/mg);
            } else {
                for (var k = 0; k < input.length; k++) {
                    if ((c = input.charAt(k)) === '}' && input.charCodeAt(k - 1) === 10) {
                        chunks.push(buff.concat('}').join(''));
                        buff = [];
                    } else {
                        buff.push(c);
                    }
                }
                chunks.push(buff.join(''));
            }
        } else {
            chunks = [input];
        }

        // Start with the primary rule
        root = new(tree.Ruleset)([], $(this.parsers.primary));
        root.root = true;

        // If `i` is smaller than the input length - 1,
        // it means the parser wasn't able to parse the whole
        // string, so we've got a parsing error.
        if (i < input.length - 1) {
            start = (function () {
                for (var n = i; n > 0; n--) {
                    if (input[n] === '\n') { break }
                }
                return n;
            })() + 1;
            line = (input.slice(0, i).match(/\n/g) || "").length + 1;
            end = input.slice(i).indexOf('\n') + i;
            zone = stylize(input.slice(start, i), 'green') +
                   stylize(stylize(input[i], 'inverse') +
                   input.slice(i + 1, end),'yellow') + '\033[0m\n';

            this.error = { name: "ParseError", message: "Parse Error on line " + line + ":\n" + zone };
        }
        return root;
    },
    parsers: {
        primary: function () {
            var node, root = [];

            while (node = $(this.mixin.definition) || $(this.ruleset) || $(this.rule) ||
                          $(this.mixin.call)       || $(this.comment) ||
                          $(/[\n\s]+/g)            || $(this.directive)) {
                root.push(node);
            }
            return root;
        },
        comment: function () {
            var comment;

            if (input[i] !== '/') return;

            if (comment = $(/\/\*(?:[^*]|\*+[^\/*])*\*+\/\n?/g)) {
                return new(tree.Comment)(comment);
            } else {
                return $(/\/\/.*/g);
            }
        },
        entities: {
            quoted: function () {
                var str;
                if (input[i] !== '"' && input[i] !== "'") return;

                if (str = $(/"((?:[^"\\\r\n]|\\.)*)"|'((?:[^'\\\r\n]|\\.)*)'/g)) {
                    return new(tree.Quoted)(str[0], str[1] || str[2]);
                }
            },
            keyword: function () {
                var k;
                if (k = $(/[A-Za-z-]+/g)) { return new(tree.Keyword)(k) }
            },
            call: function () {
                var name, args;

                if (! (name = $(/([a-zA-Z0-9_-]+)\(/g))) return;

                if (name[1].toLowerCase() === 'alpha') { return $(this.alpha) }

                args = $(this.entities.arguments);

                if (! $(')')) return;

                if (name) { return new(tree.Call)(name[1], args) }
            },
            arguments: function () {
                var args = [], arg;

                while (arg = $(this.expression)) {
                    args.push(arg);
                    if (! $(',')) { break }
                }
                return args;
            },
            accessor: function () {
            },
            literal: function () {
                return $(this.entities.dimension) ||
                       $(this.entities.color) ||
                       $(this.entities.quoted);
            },
            url: function () {
                var value;

                if (input[i] !== 'u' || !$(/url\(/g)) return;
                value = $(this.entities.quoted) || $(/[-a-zA-Z0-9_%@$\/.&=:;#+?]+/g);
                if (! $(')')) throw new(Error)("missing closing ) for url()");

                return new(tree.URL)(value);
            },
            font: function () {
            },
            variable: function () {
                var name;

                if (input[i] === '@' && (name = $(/@[a-zA-Z0-9_-]+/g))) {
                    return new(tree.Variable)(name);
                }
            },
            color: function () {
                var rgb;

                if (input[i] === '#' && (rgb = $(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/g))) {
                    return new(tree.Color)(rgb[1]);
                }
            },
            dimension: function () {
                var value, c = input.charCodeAt(i);
                if ((c > 57 || c < 45) || c === 47) return;

                if (value = $(/(-?[0-9]*\.?[0-9]+)(px|%|em|pc|ex|in|deg|s|ms|pt|cm|mm)?/g)) {
                    return new(tree.Dimension)(value[1], value[2]);
                }
            }
        },
        variable: function () {
            var name;

            if (input[i] === '@' && (name = $(/(@[a-zA-Z0-9_-]+)\s*:/g))) { return name[1] }
        },
        mixin: {
            call: function () {
                var elements = [], e, c, args;

                while (e = $(/[#.]?[a-zA-Z0-9_-]+/g)) {
                    elements.push(new(tree.Element)(c, e));
                    c = $('>');
                }
                $('(') && (args = $(this.entities.arguments)) && $(')');

                if (elements.length > 0 && ($(';') || peek('}'))) {
                    return new(tree.mixin.Call)(elements, args);
                }
            },
            definition: function () {
                var name, params = [], match, ruleset, param, value;

                if (input[i] !== '.' || peek(/[^{]*(;|})/g)) return;

                if (match = $(/([#.][a-zA-Z0-9_-]+)\s*\(/g)) {
                    name = match[1];

                    while (param = $(/@[\w-]+/g)) {
                        if ($(':')) {
                            if (value = $(this.expression)) {
                                params.push({ name: param, value: value });
                            } else {
                                throw new(Error)("Expected value");
                            }
                        } else {
                            params.push({ name: param });
                        }
                        if (! $(',')) { break }
                    }
                    if (! $(')')) throw new(Error)("Expected )");

                    ruleset = $(this.block);

                    if (ruleset) {
                        return new(tree.mixin.Definition)(name, params, ruleset);
                    }
                }
            }
        },
        entity: function () {
            var e;

            if (e = $(this.entities.literal) || $(this.entities.variable) || $(this.entities.url) ||
                    $(this.entities.call)    || $(this.entities.keyword)) { return e }
        },
        end: function () {
            return $(';') || peek('}');
        },
        alpha: function () {
            var value;

            if (! $(/opacity=/gi)) return;
            if (value = $(/[0-9]+/g) || $(this.entities.variable)) {
                if (! $(')')) throw new(Error)("missing closing ) for alpha()");
                return new(tree.Alpha)(value);
            }
        },
        combinator: function () {
            var match;
            if (match = $(/[+>~]/g) || $('&') || $(/::/g)) {
                return new(tree.Combinator)(match);
            } else {
                return new(tree.Combinator)(input[i - 1] === " " ? " " : null);
            }
        },
        selector: function () {
            var sel, e, elements = [], match;

            while (e = $(this.element)) { elements.push(e) }

            if (elements.length > 0) { return new(tree.Selector)(elements) }
        },
        element: function () {
            var e, t;

            c = $(this.combinator);
            e = $(/[.#:]?[a-zA-Z0-9_-]+/g) || $('*') || $(this.attribute) || $(/\([^)@]+\)/g);

            if (e) { return new(tree.Element)(c, e) }
        },
        tag: function () {
            return $(/[a-zA-Z][a-zA-Z-]*[0-9]?/g) || $('*');
        },
        attribute: function () {
            var attr = '', key, val, op;

            if (! $('[')) return;

            if (key = $(/[a-z]+/g) || $(this.entities.quoted)) {
                if ((op = $(/[|~*$^]?=/g)) &&
                    (val = $(this.entities.quoted) || $(/[\w-]+/g))) {
                    attr = [key, op, val.toCSS ? val.toCSS() : val].join('');
                } else { attr = key }
            }

            if (! $(']')) return;

            if (attr) { return "[" + attr + "]" }
        },
        block: function () {
            var content;

            if ($('{') && (content = $(this.primary)) && $('}')) {
                return content;
            }
        },
        ruleset: function () {
            var selectors = [], s, rules, match;

            if (peek(/[^{]+[@;}]/g)) return;

            if (match = peek(/([a-z.#: _-]+)[\s\n]*\{/g)) {
                i += match[0].length - 1;
                selectors = [new(tree.Selector)([new(tree.Element)(null, match[1])])];
            } else {
                while (s = $(this.selector)) {
                    selectors.push(s);
                    if (! $(',')) { break }
                }
                if (s) $(this.comment);
            }

            rules = $(this.block);

            if (selectors.length > 0 && rules) {
                return new(tree.Ruleset)(selectors, rules);
            }
        },
        rule: function () {
            var name, value, match;

            if (name = $(this.property) || $(this.variable)) {
                if ((name[0] != '@') && (match = peek(/([^@+\/*(;{}-]*);[\s\n]*/g))) {
                    i += match[0].length;
                    return new(tree.Rule)(name, match[1]);
                } else if ((value = $(this.value)) && ($(';') || peek('}'))) {
                    return new(tree.Rule)(name, value);
                }
            }
        },
        directive: function () {
            var name, value, rules, types;

            if (input[i] !== '@') return;

            if (name = $(/@media|@page/g)) {
                types = $(/[a-z:, ]+/g);
                if (rules = $(this.block)) {
                    return new(tree.Directive)(name + " " + types, rules);
                }
            } else if (name = $(/@[-a-z]+/g)) {
                if (name === '@font-face') {
                    if (rules = $(this.block)) {
                        return new(tree.Directive)(name, rules);
                    }
                } else if ((value = $(this.entity)) && $(';')) {
                    return new(tree.Directive)(name, value);
                }
            }
        },
        value: function () {
            var e, expressions = [], important;

            while (e = $(this.expression)) {
                expressions.push(e);
                if (! $(',')) { break }
            }
            important = $(/!\s*important/g);

            if (expressions.length > 0) {
                return new(tree.Value)(expressions, important);
            }
        },
        sub: function () {
            var e;

            if ($('(') && (e = $(this.expression)) && $(')')) {
                return e;
            }
        },
        multiplication: function () {
            var m, a, op;
            if (m = $(this.operand)) {
                if ((op = $(/[\/*]/g)) && (a = $(this.multiplication))) {
                    return new(tree.Operation)(op, [m, a]);
                } else {
                    return m;
                }
            }
        },
        addition: function () {
            var m, a, op;
            if (m = $(this.multiplication)) {
                if ((op = $(/[-+]\s+/g)) && (a = $(this.addition))) {
                    return new(tree.Operation)(op, [m, a]);
                } else {
                    return m;
                }
            }
        },
        operand: function () {
            var o;
            if (o = $(this.sub) || $(this.entities.dimension) ||
                    $(this.entities.color) || $(this.entities.variable) ||
                    ($('-') && $(this.operand))) {
                return o;
            }
        },
        expression: function () {
            var e, delim, entities = [], d;

            while (e = $(this.addition) || $(this.entity)) {
                entities.push(e);
            }
            if (entities.length > 0) {
                return new(tree.Expression)(entities);
            }
        },
        property: function () {
            var name;

            if (name = $(/(\*?-?[-a-z]+)\s*:/g)) {
                return name[1];
            }
        }
    }
};

// Stylize a string
function stylize(str, style) {
    var styles = {
        'bold'      : [1,  22],
        'inverse'   : [7,  27],
        'underline' : [4,  24],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
}

