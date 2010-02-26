var less = exports || {};
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
    chunks = [], // chunkified input
    current,     // index of current chunk, in `input`
    inputLength;

function peek(regex) {
    var match;
    regex.lastIndex = i;

    if ((match = regex.exec(input)) &&
        (regex.lastIndex - match[0].length === i)) {
        return match;
    }
}

//
// Parse from a token, regexp or string, and move forward if match
//
function $(tok, root) {
    var match, args, length, c, index, endIndex;

    //
    // Non-terminal
    //
    if (tok instanceof Function) {
        return tok.call(less.parser.parsers, root);
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
    //
    // Parse an input string into an abstract syntax tree
    //
    parse: function (str) {
        var tree, start, end, zone, line;

        i = j = current = 0;
        input = str;
        inputLength = input.length;

        // Split the input into chunks,
        // delmited by /\n\n/ (see rationale above)
        // We use a lookahead, because we want to
        // preserve the '\n's in the input.
        chunks = input.split(/^(?=\n)/mg);

        // Start with the primary rule
        tree = new(node.Ruleset)([], $(this.parsers.primary, []));
        tree.root = true;

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
                   stylize(input.slice(i, end), 'yellow');

            throw { name: "ParseError", message: "Parse Error on line " + line + ":\n" + zone };
        }
        return tree;
    },
    parsers: {
        primary: function primary(root) {
            var node;

            while (node = $(this.ruleset, []) || $(this.rule) || $(this.mixin.definition, []) ||
                          $(this.mixin.call)  || $(/\/\*(?:[^*]|\*+[^\/*])*\*+\//g) || $(/\/\/.*/g) ||
                          $(/[\n\s]+/g)       || $(this.directive, [])) {
                root.push(node);
            }
            return root;
        },
        entities: {
            string: function string() {
                var str;
                if (input[i] !== '"' && input[i] !== "'") return;

                if (str = $(/"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/g)) {
                    return new(node.Quoted)(str);
                }
            },
            keyword: function keyword() {
                var k;
                if (k = $(/[A-Za-z-]+/g)) { return new(node.Keyword)(k) }
            },
            call: function call() {
                var name, args;

                if (! (name = $(/([a-zA-Z0-9_-]+)\(/g))) return;

                if (name[1] === 'alpha') { return $(this.alpha) }

                args = $(this.entities.arguments);

                if (! $(')')) return;

                if (name) { return new(node.Call)(name[1], args) }
            },
            arguments: function arguments() {
                var args = [], arg;

                while (arg = $(this.expression)) {
                    args.push(arg);
                    if (! $(',')) { break }
                }
                return args;
            },
            accessor: function accessor() {
            },
            literal: function literal() {
                return $(this.entities.dimension) ||
                       $(this.entities.color) ||
                       $(this.entities.string);
            },
            url: function url() {
                var value;

                if (! $(/url\(/g)) return;
                value = $(this.entities.string) || $(/[-a-zA-Z0-9_%@$\/.&=:;#+?]+/g);
                if (! $(')')) throw new(Error)("missing closing ) for url()");

                return new(node.URL)(value);
            },
            font: function font() {
            },
            variable: function variable(def) {
                var name;

                if (input[i] !== '@') return;

                if (def && (name = $(/(@[a-zA-Z0-9_-]+)\s*:/g))) { return name[1] }
                else if (!def && (name = $(/@[a-zA-Z0-9_-]+/g))) { return new(node.Variable)(name) }
            },
            color: function color() {
                var rgb;

                if (input[i] !== '#') return;
                if (rgb = $(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/g)) {
                    return new(node.Color)(rgb[1]);
                }
            },
            dimension: function dimension() {
                var number, unit;

                number = $(/-?[0-9]*\.?[0-9]+/g);
                unit = $(/(?:px|%|em|pc|ex|in|deg|s|ms|pt|cm|mm)/g);

                if (number) { return new(node.Dimension)(number, unit) }
            }
        },
        mixin: {
            call: function mixinCall() {
                var prefix, mixin;

                if (input[i] !== '.') return;
                i++;
                mixin = $(this.entities.call);

                if (mixin && $(';')) {
                    return ['MIXIN-CALL', mixin];
                }
            },
            definition: function mixinDefinition(root) {
                var name, params = [], match, ruleset, param, value;

                if (input[i] !== '.' || peek(/[^{]*(;|})/g)) return;

                if (match = $(/([#.][a-zA-Z0-9_-]+)\s*\(/g)) {
                    name = match[1];
                    while (param = $(this.entities.variable)) {
                        value = null;
                        if ($(':')) {
                            if (value = $(this.expression)) {
                                params.push([param, value]);
                            } else {
                                throw new(Error)("Expected value");
                            }
                        } else {
                            params.push([param, null]);
                        }
                        if (! $(',')) { break }
                    }
                    if (! $(')')) throw new(Error)("Expected )");

                    ruleset = $(this.block, root);

                    if (ruleset) {
                        return ['MIXIN-DEF', name, params, ruleset];
                    }
                }
            }
        },
        entity: function entity() {
            var entities = [
                "url", "variable", "call", "accessor",
                "keyword",  "literal", "font"
            ], e;

            for (var i = 0; i < entities.length; i++) {
                if (e = $(this.entities[entities[i]])) {
                    return e;
                }
            }
        },
        alpha: function alpha() {
            var value;

            if (! $(/opacity=/g)) return;
            if (value = $(/[0-9]+/g) || $(this.entities.variable)) {
                if (! $(')')) throw new(Error)("missing closing ) for alpha()");
                return new(node.Alpha)(value);
            }
        },
        combinator: function combinator() {
            var match;
            if (match = $(/[+>~]/g) || $('&') || $(/::/g)) {
                return new(node.Combinator)(match);
            }
        },
        selector: function selector() {
            var sel, e, elements = [], match;

            while (e = $(this.element)) { elements.push(e) }

            if (elements.length > 0) { return new(node.Selector)(elements) }
        },
        element: function element() {
            var e, t;

            c = $(this.combinator);
            e = $(/[.#:]?[a-zA-Z0-9_-]+/g) || $('*') || $(this.attribute) || $(/\([^)]*\)/g);

            if (e) { return new(node.Element)(c, e) }
        },
        tag: function tag() {
            return $(/[a-zA-Z][a-zA-Z-]*[0-9]?/g) || $('*');
        },
        attribute: function attribute() {
            var attr = '', key, val, op;

            if (! $('[')) return;

            if (key = $(/[a-z]+/g) || $(this.entities.string)) {
                if ((op = $(/[|~*$^]?=/g)) &&
                    (val = $(this.entities.string) || $(/[\w-]+/g))) {
                    attr = [key, op, val].join('');
                } else { attr = key }
            }

            if (! $(']')) return;

            if (attr) { return "[" + attr + "]" }
        },
        block: function block(node) {
            var content;

            if ($('{') && (content = $(this.primary, node)) && $('}')) {
                return content;
            }
        },
        ruleset: function ruleset(root) {
            var selectors = [], s, rules, match;

            if (peek(/[^{]+[;}]/g)) return;

            if (match = peek(/([a-z.#: _-]+)[\s\n]*\{/g)) {
                i += match[0].length - 1;
                selectors = [new(node.Selector)([match[1]])];
            } else {
                while (s = $(this.selector)) {
                    selectors.push(s);
                    if (! $(',')) { break }
                }
            }

            rules = $(this.block, root);

            if (selectors.length > 0 && rules) {
                return new(node.Ruleset)(selectors, rules);
            }
        },
        rule: function rule() {
            var name, value, match;

            if (name = $(this.property) || $(this.entities.variable, true)) {
                if ((name[0] != '@') && (match =
                        peek(/((?:[\s\w."']|-[a-z])+|[^@+\/*(-;}]+)[;}][\s\n]*/g))) {
                    i += match[0].length;
                    return new(node.Rule)(name, match[1]);
                }

                if ((value = $(this.value)) && $(';')) {
                    return new(node.Rule)(name, value);
                }
            }
        },
        directive: function directive(root) {
            var name, value, rules, types;

            if (input[i] !== '@') return;

            if (name = $(/@media|@page/g)) {
                types = $(/[a-z:, ]+/g);
                if (rules = $(this.block, root)) {
                    return new(node.Directive)(name + " " + types, rules);
                }
            } else if (name = $(/@[-a-z]+/g)) {
                if (name === '@font-face') {
                    if (rules = $(this.block, root)) {
                        return new(node.Directive)(name, rules);
                    }
                } else if ((value = $(this.entity)) && $(';')) {
                    return new(node.Directive)(name, value);
                }
            }
        },
        value: function value() {
            var e, expressions = [], important;

            while (e = $(this.expression)) {
                expressions.push(e);
                if (! $(',')) { break }
            }
            important = $(/!\s*important/g);

            if (expressions.length > 0) {
                return new(node.Value)(expressions, important);
            }
        },
        sub: function sub() {
            var e;

            if ($('(') && (e = $(this.expression)) && $(')')) {
                return e;
            }
        },
        multiplication: function () {
            var m, a, op;
            if (m = $(this.operand)) {
                if ((op = $(/[\/*]/g)) && (a = $(this.multiplication))) {
                    return new(node.Operation)(op, [m, a]);
                } else {
                    return m;
                }
            }
        },
        addition: function () {
            var m, a, op;
            if (m = $(this.multiplication)) {
                if ((op = $(/[-+]\s+/g)) && (a = $(this.addition))) {
                    return new(node.Operation)(op, [m, a]);
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
        expression: function expression() {
            var e, delim, entities = [], d;

            while (e = $(this.addition) || $(this.entity)) {
                entities.push(e);
            }
            if (entities.length > 0) {
                return new(node.Expression)(entities);
            }
        },
        property: function property() {
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
        'underline' : [4,  24],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
}

