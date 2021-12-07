import LessError from '../less-error';
import tree from '../tree';
import visitors from '../visitors';
import getParserInput from './parser-input';
import * as utils from '../utils';
import functionRegistry from '../functions/function-registry';

//
// less.js - parser
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
//      `j` holds the current chunk index, and `currentPos` holds
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

const Parser = function Parser(context, imports, fileInfo) {
    let parsers;
    const parserInput = getParserInput();

    function error(msg, type) {
        throw new LessError(
            {
                index: parserInput.i,
                filename: fileInfo.filename,
                type: type || 'Syntax',
                message: msg
            },
            imports
        );
    }

    function expect(arg, msg) {
        // some older browsers return typeof 'function' for RegExp
        const result = (arg instanceof Function) ? arg.call(parsers) : parserInput.$re(arg);
        if (result) {
            return result;
        }
        
        error(msg || (typeof arg === 'string'
            ? `expected '${arg}' got '${parserInput.currentChar()}'`
            : 'unexpected token'));
    }

    // Specialization of expect()
    function expectChar(arg, msg) {
        if (parserInput.$char(arg)) {
            return arg;
        }
        error(msg || `expected '${arg}' got '${parserInput.currentChar()}'`);
    }

    function getDebugInfo(index) {
        const filename = fileInfo.filename;

        return {
            lineNumber: utils.getLocation(index, parserInput.getInput()).line + 1,
            fileName: filename
        };
    }

    /**
     *  Used after initial parsing to create nodes on the fly
     * 
     *  @param {String} str          - string to parse 
     *  @param {Array}  parseList    - array of parsers to run input through e.g. ["value", "important"]
     *  @param {Number} currentIndex - start number to begin indexing
     *  @param {Object} fileInfo     - fileInfo to attach to created nodes
     */
    function parseNode(str, parseList, currentIndex, fileInfo, callback) {
        let result;
        const returnNodes = [];
        const parser = parserInput;

        try {
            parser.start(str, false, function fail(msg, index) {
                callback({
                    message: msg,
                    index: index + currentIndex
                });
            });
            for (let x = 0, p, i; (p = parseList[x]); x++) {
                i = parser.i;
                result = parsers[p]();
                if (result) {
                    try {
                        result._index = i + currentIndex;
                        result._fileInfo = fileInfo;
                    } catch (e) {}
                    returnNodes.push(result);
                }
                else {
                    returnNodes.push(null);
                }
            }

            const endInfo = parser.end();
            if (endInfo.isFinished) {
                callback(null, returnNodes);
            }
            else {
                callback(true, null);
            }
        } catch (e) {
            throw new LessError({
                index: e.index + currentIndex,
                message: e.message
            }, imports, fileInfo.filename);
        }
    }

    //
    // The Parser
    //
    return {
        parserInput,
        imports,
        fileInfo,
        parseNode,
        //
        // Parse an input string into an abstract syntax tree,
        // @param str A string containing 'less' markup
        // @param callback call `callback` when done.
        // @param [additionalData] An optional map which can contains vars - a map (key, value) of variables to apply
        //
        parse: function (str, callback, additionalData) {
            let root;
            let error = null;
            let globalVars;
            let modifyVars;
            let ignored;
            let preText = '';

            globalVars = (additionalData && additionalData.globalVars) ? `${Parser.serializeVars(additionalData.globalVars)}\n` : '';
            modifyVars = (additionalData && additionalData.modifyVars) ? `\n${Parser.serializeVars(additionalData.modifyVars)}` : '';

            if (context.pluginManager) {
                const preProcessors = context.pluginManager.getPreProcessors();
                for (let i = 0; i < preProcessors.length; i++) {
                    str = preProcessors[i].process(str, { context, imports, fileInfo });
                }
            }

            if (globalVars || (additionalData && additionalData.banner)) {
                preText = ((additionalData && additionalData.banner) ? additionalData.banner : '') + globalVars;
                ignored = imports.contentsIgnoredChars;
                ignored[fileInfo.filename] = ignored[fileInfo.filename] || 0;
                ignored[fileInfo.filename] += preText.length;
            }

            str = str.replace(/\r\n?/g, '\n');
            // Remove potential UTF Byte Order Mark
            str = preText + str.replace(/^\uFEFF/, '') + modifyVars;
            imports.contents[fileInfo.filename] = str;

            // Start with the primary rule.
            // The whole syntax tree is held under a Ruleset node,
            // with the `root` property set to true, so no `{}` are
            // output. The callback is called when the input is parsed.
            try {
                parserInput.start(str, context.chunkInput, function fail(msg, index) {
                    throw new LessError({
                        index,
                        type: 'Parse',
                        message: msg,
                        filename: fileInfo.filename
                    }, imports);
                });

                tree.Node.prototype.parse = this;
                root = new tree.Ruleset(null, this.parsers.primary());
                tree.Node.prototype.rootNode = root;
                root.root = true;
                root.firstRoot = true;
                root.functionRegistry = functionRegistry.inherit();
                
            } catch (e) {
                return callback(new LessError(e, imports, fileInfo.filename));
            }

            // If `i` is smaller than the `input.length - 1`,
            // it means the parser wasn't able to parse the whole
            // string, so we've got a parsing error.
            //
            // We try to extract a \n delimited string,
            // showing the line where the parse error occurred.
            // We split it up into two parts (the part which parsed,
            // and the part which didn't), so we can color them differently.
            const endInfo = parserInput.end();
            if (!endInfo.isFinished) {

                let message = endInfo.furthestPossibleErrorMessage;

                if (!message) {
                    message = 'Unrecognised input';
                    if (endInfo.furthestChar === '}') {
                        message += '. Possibly missing opening \'{\'';
                    } else if (endInfo.furthestChar === ')') {
                        message += '. Possibly missing opening \'(\'';
                    } else if (endInfo.furthestReachedEnd) {
                        message += '. Possibly missing something';
                    }
                }

                error = new LessError({
                    type: 'Parse',
                    message,
                    index: endInfo.furthest,
                    filename: fileInfo.filename
                }, imports);
            }

            const finish = e => {
                e = error || e || imports.error;

                if (e) {
                    if (!(e instanceof LessError)) {
                        e = new LessError(e, imports, fileInfo.filename);
                    }

                    return callback(e);
                }
                else {
                    return callback(null, root);
                }
            };

            if (context.processImports !== false) {
                new visitors.ImportVisitor(imports, finish)
                    .run(root);
            } else {
                return finish();
            }
        },

        //
        // Here in, the parsing rules/functions
        //
        // The basic structure of the syntax tree generated is as follows:
        //
        //   Ruleset ->  Declaration -> Value -> Expression -> Entity
        //
        // Here's some Less code:
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
        //         Declaration ("color",  Value ([Expression [Color #fff]]))
        //         Declaration ("border", Value ([Expression [Dimension 1px][Keyword "solid"][Color #000]]))
        //         Declaration ("width",  Value ([Expression [Operation " + " [Variable "@w"][Dimension 4px]]]))
        //         Ruleset (Selector [Element '>', '.child'], [...])
        //     ])
        //
        //  In general, most rules will try to parse a token with the `$re()` function, and if the return
        //  value is truly, will return a new node, of the relevant type. Sometimes, we need to check
        //  first, before parsing, that's when we use `peek()`.
        //
        parsers: parsers = {
            //
            // The `primary` rule is the *entry* and *exit* point of the parser.
            // The rules here can appear at any level of the parse tree.
            //
            // The recursive nature of the grammar is an interplay between the `block`
            // rule, which represents `{ ... }`, the `ruleset` rule, and this `primary` rule,
            // as represented by this simplified grammar:
            //
            //     primary  →  (ruleset | declaration)+
            //     ruleset  →  selector+ block
            //     block    →  '{' primary '}'
            //
            // Only at one point is the primary rule not called from the
            // block rule: at the root level.
            //
            primary: function () {
                const mixin = this.mixin;
                let root = [];
                let node;

                while (true) {
                    while (true) {
                        node = this.comment();
                        if (!node) { break; }
                        root.push(node);
                    }
                    // always process comments before deciding if finished
                    if (parserInput.finished) {
                        break;
                    }
                    if (parserInput.peek('}')) {
                        break;
                    }

                    node = this.extendRule();
                    if (node) {
                        root = root.concat(node);
                        continue;
                    }

                    node = mixin.definition() || this.declaration() || mixin.call(false, false) || 
                        this.ruleset() || this.variableCall() || this.entities.call() || this.atrule();
                    if (node) {
                        root.push(node);
                    } else {
                        let foundSemiColon = false;
                        while (parserInput.$char(';')) {
                            foundSemiColon = true;
                        }
                        if (!foundSemiColon) {
                            break;
                        }
                    }
                }

                return root;
            },

            // comments are collected by the main parsing mechanism and then assigned to nodes
            // where the current structure allows it
            comment: function () {
                if (parserInput.commentStore.length) {
                    const comment = parserInput.commentStore.shift();
                    return new(tree.Comment)(comment.text, comment.isLineComment, comment.index, fileInfo);
                }
            },

            //
            // Entities are tokens which can be found inside an Expression
            //
            entities: {
                mixinLookup: function() {
                    return parsers.mixin.call(true, true);
                },
                //
                // A string, which supports escaping " and '
                //
                //     "milky way" 'he\'s the one!'
                //
                quoted: function (forceEscaped) {
                    let str;
                    const index = parserInput.i;
                    let isEscaped = false;

                    parserInput.save();
                    if (parserInput.$char('~')) {
                        isEscaped = true;
                    } else if (forceEscaped) {
                        parserInput.restore();
                        return;
                    }

                    str = parserInput.$quoted();
                    if (!str) {
                        parserInput.restore();
                        return;
                    }
                    parserInput.forget();

                    return new(tree.Quoted)(str.charAt(0), str.substr(1, str.length - 2), isEscaped, index, fileInfo);
                },

                //
                // A catch-all word, such as:
                //
                //     black border-collapse
                //
                keyword: function () {
                    const k = parserInput.$char('%') || parserInput.$re(/^\[?(?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+\]?/);
                    if (k) {
                        return tree.Color.fromKeyword(k) || new(tree.Keyword)(k);
                    }
                },

                //
                // A function call
                //
                //     rgb(255, 0, 255)
                //
                // The arguments are parsed with the `entities.arguments` parser.
                //
                call: function () {
                    let name;
                    let args;
                    let func;
                    const index = parserInput.i;

                    // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
                    if (parserInput.peek(/^url\(/i)) {
                        return;
                    }

                    parserInput.save();

                    name = parserInput.$re(/^([\w-]+|%|~|progid:[\w\.]+)\(/);
                    if (!name) {
                        parserInput.forget(); 
                        return;
                    }

                    name = name[1];
                    func = this.customFuncCall(name);
                    if (func) {
                        args = func.parse();
                        if (args && func.stop) {
                            parserInput.forget();
                            return args;
                        }
                    }

                    args = this.arguments(args);

                    if (!parserInput.$char(')')) {
                        parserInput.restore('Could not parse call arguments or missing \')\'');
                        return;
                    }

                    parserInput.forget();

                    return new(tree.Call)(name, args, index, fileInfo);
                },
                
                //
                // Parsing rules for functions with non-standard args, e.g.:
                //
                //     boolean(not(2 > 1))
                //
                //     This is a quick prototype, to be modified/improved when
                //     more custom-parsed funcs come (e.g. `selector(...)`)
                //

                customFuncCall: function (name) {
                    /* Ideally the table is to be moved out of here for faster perf.,
                       but it's quite tricky since it relies on all these `parsers`
                       and `expect` available only here */
                    return {
                        alpha:   f(parsers.ieAlpha, true),
                        boolean: f(condition),
                        'if':    f(condition)
                    }[name.toLowerCase()];

                    function f(parse, stop) {
                        return {
                            parse, // parsing function
                            stop   // when true - stop after parse() and return its result, 
                            // otherwise continue for plain args
                        };
                    }
                
                    function condition() {
                        return [expect(parsers.condition, 'expected condition')];
                    }
                },

                arguments: function (prevArgs) {
                    let argsComma = prevArgs || [];
                    const argsSemiColon = [];
                    let isSemiColonSeparated;
                    let value;

                    parserInput.save();

                    while (true) {
                        if (prevArgs) {
                            prevArgs = false;
                        } else {
                            value = parsers.detachedRuleset() || this.assignment() || parsers.expression();
                            if (!value) {
                                break;
                            }

                            if (value.value && value.value.length == 1) {
                                value = value.value[0];
                            }

                            argsComma.push(value);
                        }

                        if (parserInput.$char(',')) {
                            continue;
                        }

                        if (parserInput.$char(';') || isSemiColonSeparated) {
                            isSemiColonSeparated = true;
                            value = (argsComma.length < 1) ? argsComma[0]
                                : new tree.Value(argsComma);
                            argsSemiColon.push(value);
                            argsComma = [];
                        }
                    }

                    parserInput.forget();
                    return isSemiColonSeparated ? argsSemiColon : argsComma;
                },
                literal: function () {
                    return this.dimension() ||
                           this.color() ||
                           this.quoted() ||
                           this.unicodeDescriptor();
                },

                // Assignments are argument entities for calls.
                // They are present in ie filter properties as shown below.
                //
                //     filter: progid:DXImageTransform.Microsoft.Alpha( *opacity=50* )
                //

                assignment: function () {
                    let key;
                    let value;
                    parserInput.save();
                    key = parserInput.$re(/^\w+(?=\s?=)/i);
                    if (!key) {
                        parserInput.restore();
                        return;
                    }
                    if (!parserInput.$char('=')) {
                        parserInput.restore();
                        return;
                    }
                    value = parsers.entity();
                    if (value) {
                        parserInput.forget();
                        return new(tree.Assignment)(key, value);
                    } else {
                        parserInput.restore();
                    }
                },

                //
                // Parse url() tokens
                //
                // We use a specific rule for urls, because they don't really behave like
                // standard function calls. The difference is that the argument doesn't have
                // to be enclosed within a string, so it can't be parsed as an Expression.
                //
                url: function () {
                    let value;
                    const index = parserInput.i;

                    parserInput.autoCommentAbsorb = false;

                    if (!parserInput.$str('url(')) {
                        parserInput.autoCommentAbsorb = true;
                        return;
                    }

                    value = this.quoted() || this.variable() || this.property() ||
                            parserInput.$re(/^(?:(?:\\[\(\)'"])|[^\(\)'"])+/) || '';

                    parserInput.autoCommentAbsorb = true;

                    expectChar(')');

                    return new(tree.URL)((value.value != null || 
                        value instanceof tree.Variable || 
                        value instanceof tree.Property) ?
                        value : new(tree.Anonymous)(value, index), index, fileInfo);
                },

                //
                // A Variable entity, such as `@fink`, in
                //
                //     width: @fink + 2px
                //
                // We use a different parser for variable definitions,
                // see `parsers.variable`.
                //
                variable: function () {
                    let ch;
                    let name;
                    const index = parserInput.i;

                    parserInput.save();
                    if (parserInput.currentChar() === '@' && (name = parserInput.$re(/^@@?[\w-]+/))) {
                        ch = parserInput.currentChar();
                        if (ch === '(' || ch === '[' && !parserInput.prevChar().match(/^\s/)) {
                            // this may be a VariableCall lookup
                            const result = parsers.variableCall(name);
                            if (result) {
                                parserInput.forget();
                                return result;
                            }
                        }
                        parserInput.forget();
                        return new(tree.Variable)(name, index, fileInfo);
                    }
                    parserInput.restore();
                },

                // A variable entity using the protective {} e.g. @{var}
                variableCurly: function () {
                    let curly;
                    const index = parserInput.i;

                    if (parserInput.currentChar() === '@' && (curly = parserInput.$re(/^@\{([\w-]+)\}/))) {
                        return new(tree.Variable)(`@${curly[1]}`, index, fileInfo);
                    }
                },
                //
                // A Property accessor, such as `$color`, in
                //
                //     background-color: $color
                //
                property: function () {
                    let name;
                    const index = parserInput.i;

                    if (parserInput.currentChar() === '$' && (name = parserInput.$re(/^\$[\w-]+/))) {
                        return new(tree.Property)(name, index, fileInfo);
                    }
                },

                // A property entity useing the protective {} e.g. ${prop}
                propertyCurly: function () {
                    let curly;
                    const index = parserInput.i;

                    if (parserInput.currentChar() === '$' && (curly = parserInput.$re(/^\$\{([\w-]+)\}/))) {
                        return new(tree.Property)(`$${curly[1]}`, index, fileInfo);
                    }
                },
                //
                // A Hexadecimal color
                //
                //     #4F3C2F
                //
                // `rgb` and `hsl` colors are parsed through the `entities.call` parser.
                //
                color: function () {
                    let rgb;
                    parserInput.save();

                    if (parserInput.currentChar() === '#' && (rgb = parserInput.$re(/^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})([\w.#\[])?/))) {
                        if (!rgb[2]) {
                            parserInput.forget();
                            return new(tree.Color)(rgb[1], undefined, rgb[0]);
                        } 
                    }
                    parserInput.restore();
                },

                colorKeyword: function () {
                    parserInput.save();
                    const autoCommentAbsorb = parserInput.autoCommentAbsorb;
                    parserInput.autoCommentAbsorb = false;
                    const k = parserInput.$re(/^[_A-Za-z-][_A-Za-z0-9-]+/);
                    parserInput.autoCommentAbsorb = autoCommentAbsorb;
                    if (!k) {
                        parserInput.forget();
                        return;
                    }
                    parserInput.restore();
                    const color = tree.Color.fromKeyword(k);
                    if (color) {
                        parserInput.$str(k);
                        return color;
                    }
                },

                //
                // A Dimension, that is, a number and a unit
                //
                //     0.5em 95%
                //
                dimension: function () {
                    if (parserInput.peekNotNumeric()) {
                        return;
                    }

                    const value = parserInput.$re(/^([+-]?\d*\.?\d+)(%|[a-z_]+)?/i);
                    if (value) {
                        return new(tree.Dimension)(value[1], value[2]);
                    }
                },

                //
                // A unicode descriptor, as is used in unicode-range
                //
                // U+0??  or U+00A1-00A9
                //
                unicodeDescriptor: function () {
                    let ud;

                    ud = parserInput.$re(/^U\+[0-9a-fA-F?]+(\-[0-9a-fA-F?]+)?/);
                    if (ud) {
                        return new(tree.UnicodeDescriptor)(ud[0]);
                    }
                },

                //
                // JavaScript code to be evaluated
                //
                //     `window.location.href`
                //
                javascript: function () {
                    let js;
                    const index = parserInput.i;

                    parserInput.save();

                    const escape = parserInput.$char('~');
                    const jsQuote = parserInput.$char('`');

                    if (!jsQuote) {
                        parserInput.restore();
                        return;
                    }

                    js = parserInput.$re(/^[^`]*`/);
                    if (js) {
                        parserInput.forget();
                        return new(tree.JavaScript)(js.substr(0, js.length - 1), Boolean(escape), index, fileInfo);
                    }
                    parserInput.restore('invalid javascript definition');
                }
            },

            //
            // The variable part of a variable definition. Used in the `rule` parser
            //
            //     @fink:
            //
            variable: function () {
                let name;

                if (parserInput.currentChar() === '@' && (name = parserInput.$re(/^(@[\w-]+)\s*:/))) { return name[1]; }
            },

            //
            // Call a variable value to retrieve a detached ruleset
            // or a value from a detached ruleset's rules.
            //
            //     @fink();
            //     @fink;
            //     color: @fink[@color];
            //
            variableCall: function (parsedName) {
                let lookups;
                const i = parserInput.i;
                const inValue = !!parsedName;
                let name = parsedName;

                parserInput.save();

                if (name || (parserInput.currentChar() === '@'
                    && (name = parserInput.$re(/^(@[\w-]+)(\(\s*\))?/)))) {

                    lookups = this.mixin.ruleLookups();

                    if (!lookups && ((inValue && parserInput.$str('()') !== '()') || (name[2] !== '()'))) {
                        parserInput.restore('Missing \'[...]\' lookup in variable call');
                        return;
                    }

                    if (!inValue) {
                        name = name[1];
                    }

                    const call = new tree.VariableCall(name, i, fileInfo);
                    if (!inValue && parsers.end()) {
                        parserInput.forget();
                        return call;
                    }
                    else {
                        parserInput.forget();
                        return new tree.NamespaceValue(call, lookups, i, fileInfo);
                    }
                }

                parserInput.restore();
            },

            //
            // extend syntax - used to extend selectors
            //
            extend: function(isRule) {
                let elements;
                let e;
                const index = parserInput.i;
                let option;
                let extendList;
                let extend;

                if (!parserInput.$str(isRule ? '&:extend(' : ':extend(')) {
                    return;
                }

                do {
                    option = null;
                    elements = null;
                    while (!(option = parserInput.$re(/^(all)(?=\s*(\)|,))/))) {
                        e = this.element();
                        if (!e) {
                            break;
                        }
                        if (elements) {
                            elements.push(e);
                        } else {
                            elements = [ e ];
                        }
                    }

                    option = option && option[1];
                    if (!elements) {
                        error('Missing target selector for :extend().');
                    }
                    extend = new(tree.Extend)(new(tree.Selector)(elements), option, index, fileInfo);
                    if (extendList) {
                        extendList.push(extend);
                    } else {
                        extendList = [ extend ];
                    }
                } while (parserInput.$char(','));

                expect(/^\)/);

                if (isRule) {
                    expect(/^;/);
                }

                return extendList;
            },

            //
            // extendRule - used in a rule to extend all the parent selectors
            //
            extendRule: function() {
                return this.extend(true);
            },

            //
            // Mixins
            //
            mixin: {
                //
                // A Mixin call, with an optional argument list
                //
                //     #mixins > .square(#fff);
                //     #mixins.square(#fff);
                //     .rounded(4px, black);
                //     .button;
                //
                // We can lookup / return a value using the lookup syntax:
                //
                //     color: #mixin.square(#fff)[@color];
                //
                // The `while` loop is there because mixins can be
                // namespaced, but we only support the child and descendant
                // selector for now.
                //
                call: function (inValue, getLookup) {
                    const s = parserInput.currentChar();
                    let important = false;
                    let lookups;
                    const index = parserInput.i;
                    let elements;
                    let args;
                    let hasParens;

                    if (s !== '.' && s !== '#') { return; }

                    parserInput.save(); // stop us absorbing part of an invalid selector

                    elements = this.elements();

                    if (elements) {
                        if (parserInput.$char('(')) {
                            args = this.args(true).args;
                            expectChar(')');
                            hasParens = true;
                        }

                        if (getLookup !== false) {
                            lookups = this.ruleLookups();
                        }
                        if (getLookup === true && !lookups) {
                            parserInput.restore();
                            return;
                        }

                        if (inValue && !lookups && !hasParens) {
                            // This isn't a valid in-value mixin call
                            parserInput.restore();
                            return;
                        }

                        if (!inValue && parsers.important()) {
                            important = true;
                        }

                        if (inValue || parsers.end()) {
                            parserInput.forget();
                            const mixin = new(tree.mixin.Call)(elements, args, index, fileInfo, !lookups && important);
                            if (lookups) {
                                return new tree.NamespaceValue(mixin, lookups);
                            }
                            else {
                                return mixin;
                            }
                        }
                    }

                    parserInput.restore();
                },
                /**
                 * Matching elements for mixins
                 * (Start with . or # and can have > )
                 */
                elements: function() {
                    let elements;
                    let e;
                    let c;
                    let elem;
                    let elemIndex;
                    const re = /^[#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/;
                    while (true) {
                        elemIndex = parserInput.i;
                        e = parserInput.$re(re);
                        
                        if (!e) {
                            break;
                        }
                        elem = new(tree.Element)(c, e, false, elemIndex, fileInfo);
                        if (elements) {
                            elements.push(elem);
                        } else {
                            elements = [ elem ];
                        }
                        c = parserInput.$char('>');
                    }
                    return elements;
                },
                args: function (isCall) {
                    const entities = parsers.entities;
                    const returner = { args:null, variadic: false };
                    let expressions = [];
                    const argsSemiColon = [];
                    const argsComma = [];
                    let isSemiColonSeparated;
                    let expressionContainsNamed;
                    let name;
                    let nameLoop;
                    let value;
                    let arg;
                    let expand;
                    let hasSep = true;

                    parserInput.save();

                    while (true) {
                        if (isCall) {
                            arg = parsers.detachedRuleset() || parsers.expression();
                        } else {
                            parserInput.commentStore.length = 0;
                            if (parserInput.$str('...')) {
                                returner.variadic = true;
                                if (parserInput.$char(';') && !isSemiColonSeparated) {
                                    isSemiColonSeparated = true;
                                }
                                (isSemiColonSeparated ? argsSemiColon : argsComma)
                                    .push({ variadic: true });
                                break;
                            }
                            arg = entities.variable() || entities.property() || entities.literal() || entities.keyword() || this.call(true);
                        }

                        if (!arg || !hasSep) {
                            break;
                        }

                        nameLoop = null;
                        if (arg.throwAwayComments) {
                            arg.throwAwayComments();
                        }
                        value = arg;
                        let val = null;

                        if (isCall) {
                            // Variable
                            if (arg.value && arg.value.length == 1) {
                                val = arg.value[0];
                            }
                        } else {
                            val = arg;
                        }

                        if (val && (val instanceof tree.Variable || val instanceof tree.Property)) {
                            if (parserInput.$char(':')) {
                                if (expressions.length > 0) {
                                    if (isSemiColonSeparated) {
                                        error('Cannot mix ; and , as delimiter types');
                                    }
                                    expressionContainsNamed = true;
                                }

                                value = parsers.detachedRuleset() || parsers.expression();

                                if (!value) {
                                    if (isCall) {
                                        error('could not understand value for named argument');
                                    } else {
                                        parserInput.restore();
                                        returner.args = [];
                                        return returner;
                                    }
                                }
                                nameLoop = (name = val.name);
                            } else if (parserInput.$str('...')) {
                                if (!isCall) {
                                    returner.variadic = true;
                                    if (parserInput.$char(';') && !isSemiColonSeparated) {
                                        isSemiColonSeparated = true;
                                    }
                                    (isSemiColonSeparated ? argsSemiColon : argsComma)
                                        .push({ name: arg.name, variadic: true });
                                    break;
                                } else {
                                    expand = true;
                                }
                            } else if (!isCall) {
                                name = nameLoop = val.name;
                                value = null;
                            }
                        }

                        if (value) {
                            expressions.push(value);
                        }

                        argsComma.push({ name:nameLoop, value, expand });

                        if (parserInput.$char(',')) {
                            hasSep = true;
                            continue;
                        }
                        hasSep = parserInput.$char(';') === ';';

                        if (hasSep || isSemiColonSeparated) {

                            if (expressionContainsNamed) {
                                error('Cannot mix ; and , as delimiter types');
                            }

                            isSemiColonSeparated = true;

                            if (expressions.length > 1) {
                                value = new(tree.Value)(expressions);
                            }
                            argsSemiColon.push({ name, value, expand });

                            name = null;
                            expressions = [];
                            expressionContainsNamed = false;
                        }
                    }

                    parserInput.forget();
                    returner.args = isSemiColonSeparated ? argsSemiColon : argsComma;
                    return returner;
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
                definition: function () {
                    let name;
                    let params = [];
                    let match;
                    let ruleset;
                    let cond;
                    let variadic = false;
                    if ((parserInput.currentChar() !== '.' && parserInput.currentChar() !== '#') ||
                        parserInput.peek(/^[^{]*\}/)) {
                        return;
                    }

                    parserInput.save();

                    match = parserInput.$re(/^([#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+)\s*\(/);
                    if (match) {
                        name = match[1];

                        const argInfo = this.args(false);
                        params = argInfo.args;
                        variadic = argInfo.variadic;

                        // .mixincall("@{a}");
                        // looks a bit like a mixin definition..
                        // also
                        // .mixincall(@a: {rule: set;});
                        // so we have to be nice and restore
                        if (!parserInput.$char(')')) {
                            parserInput.restore('Missing closing \')\'');
                            return;
                        }

                        parserInput.commentStore.length = 0;

                        if (parserInput.$str('when')) { // Guard
                            cond = expect(parsers.conditions, 'expected condition');
                        }

                        ruleset = parsers.block();

                        if (ruleset) {
                            parserInput.forget();
                            return new(tree.mixin.Definition)(name, params, ruleset, cond, variadic);
                        } else {
                            parserInput.restore();
                        }
                    } else {
                        parserInput.restore();
                    }
                },
            
                ruleLookups: function() {
                    let rule;
                    let args;
                    const lookups = [];

                    if (parserInput.currentChar() !== '[') { 
                        return;
                    }

                    while (true) {
                        parserInput.save();
                        args = null;
                        rule = this.lookupValue();
                        if (!rule && rule !== '') {
                            parserInput.restore();
                            break;
                        }
                        lookups.push(rule);
                        parserInput.forget();
                    }
                    if (lookups.length > 0) {
                        return lookups;
                    }
                },
    
                lookupValue: function() {
                    parserInput.save();
    
                    if (!parserInput.$char('[')) { 
                        parserInput.restore();
                        return;
                    }
    
                    const name = parserInput.$re(/^(?:[@$]{0,2})[_a-zA-Z0-9-]*/);
    
                    if (!parserInput.$char(']')) {
                        parserInput.restore();
                        return;
                    } 

                    if (name || name === '') {
                        parserInput.forget();
                        return name;
                    }
    
                    parserInput.restore();
                }
            },
            //
            // Entities are the smallest recognized token,
            // and can be found inside a rule's value.
            //
            entity: function () {
                const entities = this.entities;

                return this.comment() || entities.literal() || entities.variable() || entities.url() ||
                    entities.property() || entities.call() || entities.keyword() || this.mixin.call(true) ||
                    entities.javascript();
            },

            //
            // A Declaration terminator. Note that we use `peek()` to check for '}',
            // because the `block` rule will be expecting it, but we still need to make sure
            // it's there, if ';' was omitted.
            //
            end: function () {
                return parserInput.$char(';') || parserInput.peek('}');
            },

            //
            // IE's alpha function
            //
            //     alpha(opacity=88)
            //
            ieAlpha: function () {
                let value;

                // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
                if (!parserInput.$re(/^opacity=/i)) { return; }
                value = parserInput.$re(/^\d+/);
                if (!value) {
                    value = expect(parsers.entities.variable, 'Could not parse alpha');
                    value = `@{${value.name.slice(1)}}`;
                }
                expectChar(')');
                return new tree.Quoted('', `alpha(opacity=${value})`);
            },

            //
            // A Selector Element
            //
            //     div
            //     + h1
            //     #socks
            //     input[type="text"]
            //
            // Elements are the building blocks for Selectors,
            // they are made out of a `Combinator` (see combinator rule),
            // and an element name, such as a tag a class, or `*`.
            //
            element: function () {
                let e;
                let c;
                let v;
                const index = parserInput.i;

                c = this.combinator();

                e = parserInput.$re(/^(?:\d+\.\d+|\d+)%/) ||
                    parserInput.$re(/^(?:[.#]?|:*)(?:[\w-]|[^\x00-\x9f]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/) ||
                    parserInput.$char('*') || parserInput.$char('&') || this.attribute() ||
                    parserInput.$re(/^\([^&()@]+\)/) ||  parserInput.$re(/^[\.#:](?=@)/) ||
                    this.entities.variableCurly();

                if (!e) {
                    parserInput.save();
                    if (parserInput.$char('(')) {
                        if ((v = this.selector(false)) && parserInput.$char(')')) {
                            e = new(tree.Paren)(v);
                            parserInput.forget();
                        } else {
                            parserInput.restore('Missing closing \')\'');
                        }
                    } else {
                        parserInput.forget();
                    }
                }

                if (e) { return new(tree.Element)(c, e, e instanceof tree.Variable, index, fileInfo); }
            },

            //
            // Combinators combine elements together, in a Selector.
            //
            // Because our parser isn't white-space sensitive, special care
            // has to be taken, when parsing the descendant combinator, ` `,
            // as it's an empty space. We have to check the previous character
            // in the input, to see if it's a ` ` character. More info on how
            // we deal with this in *combinator.js*.
            //
            combinator: function () {
                let c = parserInput.currentChar();

                if (c === '/') {
                    parserInput.save();
                    const slashedCombinator = parserInput.$re(/^\/[a-z]+\//i);
                    if (slashedCombinator) {
                        parserInput.forget();
                        return new(tree.Combinator)(slashedCombinator);
                    }
                    parserInput.restore();
                }

                if (c === '>' || c === '+' || c === '~' || c === '|' || c === '^') {
                    parserInput.i++;
                    if (c === '^' && parserInput.currentChar() === '^') {
                        c = '^^';
                        parserInput.i++;
                    }
                    while (parserInput.isWhitespace()) { parserInput.i++; }
                    return new(tree.Combinator)(c);
                } else if (parserInput.isWhitespace(-1)) {
                    return new(tree.Combinator)(' ');
                } else {
                    return new(tree.Combinator)(null);
                }
            },
            //
            // A CSS Selector
            // with less extensions e.g. the ability to extend and guard
            //
            //     .class > div + h1
            //     li a:hover
            //
            // Selectors are made out of one or more Elements, see above.
            //
            selector: function (isLess) {
                const index = parserInput.i;
                let elements;
                let extendList;
                let c;
                let e;
                let allExtends;
                let when;
                let condition;
                isLess = isLess !== false;
                while ((isLess && (extendList = this.extend())) || (isLess && (when = parserInput.$str('when'))) || (e = this.element())) {
                    if (when) {
                        condition = expect(this.conditions, 'expected condition');
                    } else if (condition) {
                        error('CSS guard can only be used at the end of selector');
                    } else if (extendList) {
                        if (allExtends) {
                            allExtends = allExtends.concat(extendList);
                        } else {
                            allExtends = extendList;
                        }
                    } else {
                        if (allExtends) { error('Extend can only be used at the end of selector'); }
                        c = parserInput.currentChar();
                        if (elements) {
                            elements.push(e);
                        } else {
                            elements = [ e ];
                        }
                        e = null;
                    }
                    if (c === '{' || c === '}' || c === ';' || c === ',' || c === ')') {
                        break;
                    }
                }

                if (elements) { return new(tree.Selector)(elements, allExtends, condition, index, fileInfo); }
                if (allExtends) { error('Extend must be used to extend a selector, it cannot be used on its own'); }
            },
            selectors: function () {
                let s;
                let selectors;
                while (true) {
                    s = this.selector();
                    if (!s) {
                        break;
                    }
                    if (selectors) {
                        selectors.push(s);
                    } else {
                        selectors = [ s ];
                    }
                    parserInput.commentStore.length = 0;
                    if (s.condition && selectors.length > 1) {
                        error("Guards are only currently allowed on a single selector.");
                    }
                    if (!parserInput.$char(',')) { break; }
                    if (s.condition) {
                        error("Guards are only currently allowed on a single selector.");
                    }
                    parserInput.commentStore.length = 0;
                }
                return selectors;
            },
            attribute: function () {
                if (!parserInput.$char('[')) { return; }

                const entities = this.entities;
                let key;
                let val;
                let op;
                //
                // case-insensitive flag
                // e.g. [attr operator value i]
                //
                let cif;

                if (!(key = entities.variableCurly())) {
                    key = expect(/^(?:[_A-Za-z0-9-\*]*\|)?(?:[_A-Za-z0-9-]|\\.)+/);
                }

                op = parserInput.$re(/^[|~*$^]?=/);
                if (op) {
                    val = entities.quoted() || parserInput.$re(/^[0-9]+%/) || parserInput.$re(/^[\w-]+/) || entities.variableCurly();
                    if (val) {
                        cif = parserInput.$re(/^[iIsS]/);
                    }
                }

                expectChar(']');

                return new(tree.Attribute)(key, op, val, cif);
            },

            //
            // The `block` rule is used by `ruleset` and `mixin.definition`.
            // It's a wrapper around the `primary` rule, with added `{}`.
            //
            block: function () {
                let content;
                if (parserInput.$char('{') && (content = this.primary()) && parserInput.$char('}')) {
                    return content;
                }
            },

            blockRuleset: function() {
                let block = this.block();

                if (block) {
                    block = new tree.Ruleset(null, block);
                }
                return block;
            },

            detachedRuleset: function() {
                let argInfo;
                let params;
                let variadic;

                parserInput.save();
                if (parserInput.$re(/^[.#]\(/)) {
                    /**
                     * DR args currently only implemented for each() function, and not 
                     * yet settable as `@dr: #(@arg) {}`
                     * This should be done when DRs are merged with mixins.
                     * See: https://github.com/less/less-meta/issues/16
                     */
                    argInfo = this.mixin.args(false);
                    params = argInfo.args;
                    variadic = argInfo.variadic;
                    if (!parserInput.$char(')')) {
                        parserInput.restore();
                        return;
                    }
                }
                const blockRuleset = this.blockRuleset();
                if (blockRuleset) {
                    parserInput.forget();
                    if (params) {
                        return new tree.mixin.Definition(null, params, blockRuleset, null, variadic);
                    }
                    return new tree.DetachedRuleset(blockRuleset);
                }
                parserInput.restore();
            },

            //
            // div, .class, body > p {...}
            //
            ruleset: function () {
                let selectors;
                let rules;
                let debugInfo;

                parserInput.save();

                if (context.dumpLineNumbers) {
                    debugInfo = getDebugInfo(parserInput.i);
                }

                selectors = this.selectors();

                if (selectors && (rules = this.block())) {
                    parserInput.forget();
                    const ruleset = new(tree.Ruleset)(selectors, rules, context.strictImports);
                    if (context.dumpLineNumbers) {
                        ruleset.debugInfo = debugInfo;
                    }
                    return ruleset;
                } else {
                    parserInput.restore();
                }
            },
            declaration: function () {
                let name;
                let value;
                const index = parserInput.i;
                let hasDR;
                const c = parserInput.currentChar();
                let important;
                let merge;
                let isVariable;

                if (c === '.' || c === '#' || c === '&' || c === ':') { return; }

                parserInput.save();

                name = this.variable() || this.ruleProperty();
                if (name) {
                    isVariable = typeof name === 'string';

                    if (isVariable) {
                        value = this.detachedRuleset();
                        if (value) {
                            hasDR = true;
                        }
                    }

                    parserInput.commentStore.length = 0;
                    if (!value) {
                        // a name returned by this.ruleProperty() is always an array of the form:
                        // [string-1, ..., string-n, ""] or [string-1, ..., string-n, "+"]
                        // where each item is a tree.Keyword or tree.Variable
                        merge = !isVariable && name.length > 1 && name.pop().value;

                        // Custom property values get permissive parsing
                        if (name[0].value && name[0].value.slice(0, 2) === '--') {
                            value = this.permissiveValue();
                        }
                        // Try to store values as anonymous
                        // If we need the value later we'll re-parse it in ruleset.parseValue
                        else {
                            value = this.anonymousValue();
                        }
                        if (value) {
                            parserInput.forget();
                            // anonymous values absorb the end ';' which is required for them to work
                            return new(tree.Declaration)(name, value, false, merge, index, fileInfo);
                        }

                        if (!value) {
                            value = this.value();
                        }

                        if (value) {
                            important = this.important();
                        } else if (isVariable) {
                            // As a last resort, try permissiveValue
                            value = this.permissiveValue();
                        }
                    }

                    if (value && (this.end() || hasDR)) {
                        parserInput.forget();
                        return new(tree.Declaration)(name, value, important, merge, index, fileInfo);
                    }
                    else {
                        parserInput.restore();
                    }
                } else {
                    parserInput.restore();
                }
            },
            anonymousValue: function () {
                const index = parserInput.i;
                const match = parserInput.$re(/^([^.#@\$+\/'"*`(;{}-]*);/);
                if (match) {
                    return new(tree.Anonymous)(match[1], index);
                }
            },
            /**
             * Used for custom properties, at-rules, and variables (as fallback)
             * Parses almost anything inside of {} [] () "" blocks
             * until it reaches outer-most tokens.
             * 
             * First, it will try to parse comments and entities to reach
             * the end. This is mostly like the Expression parser except no
             * math is allowed.
             */
            permissiveValue: function (untilTokens) {
                let i;
                let e;
                let done;
                let value;
                const tok = untilTokens || ';';
                const index = parserInput.i;
                const result = [];

                function testCurrentChar() {
                    const char = parserInput.currentChar();
                    if (typeof tok === 'string') {
                        return char === tok;
                    } else {
                        return tok.test(char);
                    }
                }
                if (testCurrentChar()) {
                    return;
                }
                value = [];
                do {
                    e = this.comment();
                    if (e) {
                        value.push(e);
                        continue;
                    }
                    e = this.entity();
                    if (e) {
                        value.push(e);
                    }
                } while (e);

                done = testCurrentChar();

                if (value.length > 0) {
                    value = new(tree.Expression)(value);
                    if (done) {
                        return value;
                    }
                    else {
                        result.push(value);
                    }
                    // Preserve space before $parseUntil as it will not
                    if (parserInput.prevChar() === ' ') {
                        result.push(new tree.Anonymous(' ', index));
                    }
                }
                parserInput.save();

                value = parserInput.$parseUntil(tok);

                if (value) {
                    if (typeof value === 'string') {
                        error(`Expected '${value}'`, 'Parse');
                    }
                    if (value.length === 1 && value[0] === ' ') {
                        parserInput.forget();
                        return new tree.Anonymous('', index);
                    }
                    let item;
                    for (i = 0; i < value.length; i++) {
                        item = value[i];
                        if (Array.isArray(item)) {
                            // Treat actual quotes as normal quoted values
                            result.push(new tree.Quoted(item[0], item[1], true, index, fileInfo));
                        }
                        else {
                            if (i === value.length - 1) {
                                item = item.trim();
                            }
                            // Treat like quoted values, but replace vars like unquoted expressions
                            const quote = new tree.Quoted('\'', item, true, index, fileInfo);
                            quote.variableRegex = /@([\w-]+)/g;
                            quote.propRegex = /\$([\w-]+)/g;
                            result.push(quote);
                        }
                    }
                    parserInput.forget();
                    return new tree.Expression(result, true);
                }
                parserInput.restore();
            },

            //
            // An @import atrule
            //
            //     @import "lib";
            //
            // Depending on our environment, importing is done differently:
            // In the browser, it's an XHR request, in Node, it would be a
            // file-system operation. The function used for importing is
            // stored in `import`, which we pass to the Import constructor.
            //
            'import': function () {
                let path;
                let features;
                const index = parserInput.i;

                const dir = parserInput.$re(/^@import\s+/);

                if (dir) {
                    const options = (dir ? this.importOptions() : null) || {};

                    if ((path = this.entities.quoted() || this.entities.url())) {
                        features = this.mediaFeatures();

                        if (!parserInput.$char(';')) {
                            parserInput.i = index;
                            error('missing semi-colon or unrecognised media features on import');
                        }
                        features = features && new(tree.Value)(features);
                        return new(tree.Import)(path, features, options, index, fileInfo);
                    }
                    else {
                        parserInput.i = index;
                        error('malformed import statement');
                    }
                }
            },

            importOptions: function() {
                let o;
                const options = {};
                let optionName;
                let value;

                // list of options, surrounded by parens
                if (!parserInput.$char('(')) { return null; }
                do {
                    o = this.importOption();
                    if (o) {
                        optionName = o;
                        value = true;
                        switch (optionName) {
                            case 'css':
                                optionName = 'less';
                                value = false;
                                break;
                            case 'once':
                                optionName = 'multiple';
                                value = false;
                                break;
                        }
                        options[optionName] = value;
                        if (!parserInput.$char(',')) { break; }
                    }
                } while (o);
                expectChar(')');
                return options;
            },

            importOption: function() {
                const opt = parserInput.$re(/^(less|css|multiple|once|inline|reference|optional)/);
                if (opt) {
                    return opt[1];
                }
            },

            mediaFeature: function () {
                const entities = this.entities;
                const nodes = [];
                let e;
                let p;
                parserInput.save();
                do {
                    e = entities.keyword() || entities.variable() || entities.mixinLookup();
                    if (e) {
                        nodes.push(e);
                    } else if (parserInput.$char('(')) {
                        p = this.property();
                        e = this.value();
                        if (parserInput.$char(')')) {
                            if (p && e) {
                                nodes.push(new(tree.Paren)(new(tree.Declaration)(p, e, null, null, parserInput.i, fileInfo, true)));
                            } else if (e) {
                                nodes.push(new(tree.Paren)(e));
                            } else {
                                error('badly formed media feature definition');
                            }
                        } else {
                            error('Missing closing \')\'', 'Parse');
                        }
                    }
                } while (e);

                parserInput.forget();
                if (nodes.length > 0) {
                    return new(tree.Expression)(nodes);
                }
            },

            mediaFeatures: function () {
                const entities = this.entities;
                const features = [];
                let e;
                do {
                    e = this.mediaFeature();
                    if (e) {
                        features.push(e);
                        if (!parserInput.$char(',')) { break; }
                    } else {
                        e = entities.variable() || entities.mixinLookup();
                        if (e) {
                            features.push(e);
                            if (!parserInput.$char(',')) { break; }
                        }
                    }
                } while (e);

                return features.length > 0 ? features : null;
            },

            media: function () {
                let features;
                let rules;
                let media;
                let debugInfo;
                const index = parserInput.i;

                if (context.dumpLineNumbers) {
                    debugInfo = getDebugInfo(index);
                }

                parserInput.save();

                if (parserInput.$str('@media')) {
                    features = this.mediaFeatures();

                    rules = this.block();

                    if (!rules) {
                        error('media definitions require block statements after any features');
                    }

                    parserInput.forget();

                    media = new(tree.Media)(rules, features, index, fileInfo);
                    if (context.dumpLineNumbers) {
                        media.debugInfo = debugInfo;
                    }

                    return media;
                }

                parserInput.restore();
            },

            //

            // A @plugin directive, used to import plugins dynamically.
            //
            //     @plugin (args) "lib";
            //
            plugin: function () {
                let path;
                let args;
                let options;
                const index = parserInput.i;
                const dir   = parserInput.$re(/^@plugin\s+/);

                if (dir) {
                    args = this.pluginArgs();

                    if (args) {
                        options = {
                            pluginArgs: args,
                            isPlugin: true
                        };
                    }
                    else {
                        options = { isPlugin: true };
                    }

                    if ((path = this.entities.quoted() || this.entities.url())) {

                        if (!parserInput.$char(';')) {
                            parserInput.i = index;
                            error('missing semi-colon on @plugin');
                        }
                        return new(tree.Import)(path, null, options, index, fileInfo);
                    }
                    else {
                        parserInput.i = index;
                        error('malformed @plugin statement');
                    }
                }
            },

            pluginArgs: function() {
                // list of options, surrounded by parens
                parserInput.save();
                if (!parserInput.$char('(')) {
                    parserInput.restore();
                    return null;
                }
                const args = parserInput.$re(/^\s*([^\);]+)\)\s*/);
                if (args[1]) {
                    parserInput.forget();
                    return args[1].trim();
                }
                else { 
                    parserInput.restore();
                    return null;
                }
            },

            //
            // A CSS AtRule
            //
            //     @charset "utf-8";
            //
            atrule: function () {
                const index = parserInput.i;
                let name;
                let value;
                let rules;
                let nonVendorSpecificName;
                let hasIdentifier;
                let hasExpression;
                let hasUnknown;
                let hasBlock = true;
                let isRooted = true;

                if (parserInput.currentChar() !== '@') { return; }

                value = this['import']() || this.plugin() || this.media();
                if (value) {
                    return value;
                }

                parserInput.save();

                name = parserInput.$re(/^@[a-z-]+/);

                if (!name) { return; }

                nonVendorSpecificName = name;
                if (name.charAt(1) == '-' && name.indexOf('-', 2) > 0) {
                    nonVendorSpecificName = `@${name.slice(name.indexOf('-', 2) + 1)}`;
                }

                switch (nonVendorSpecificName) {
                    case '@charset':
                        hasIdentifier = true;
                        hasBlock = false;
                        break;
                    case '@namespace':
                        hasExpression = true;
                        hasBlock = false;
                        break;
                    case '@keyframes':
                    case '@counter-style':
                        hasIdentifier = true;
                        break;
                    case '@document':
                    case '@supports':
                        hasUnknown = true;
                        isRooted = false;
                        break;
                    default:
                        hasUnknown = true;
                        break;
                }

                parserInput.commentStore.length = 0;

                if (hasIdentifier) {
                    value = this.entity();
                    if (!value) {
                        error(`expected ${name} identifier`);
                    }
                } else if (hasExpression) {
                    value = this.expression();
                    if (!value) {
                        error(`expected ${name} expression`);
                    }
                } else if (hasUnknown) {
                    value = this.permissiveValue(/^[{;]/);
                    hasBlock = (parserInput.currentChar() === '{');
                    if (!value) {
                        if (!hasBlock && parserInput.currentChar() !== ';') {
                            error(`${name} rule is missing block or ending semi-colon`);
                        }
                    }
                    else if (!value.value) {
                        value = null;
                    }
                }

                if (hasBlock) {
                    rules = this.blockRuleset();
                }

                if (rules || (!hasBlock && value && parserInput.$char(';'))) {
                    parserInput.forget();
                    return new(tree.AtRule)(name, value, rules, index, fileInfo,
                        context.dumpLineNumbers ? getDebugInfo(index) : null,
                        isRooted
                    );
                }

                parserInput.restore('at-rule options not recognised');
            },

            //
            // A Value is a comma-delimited list of Expressions
            //
            //     font-family: Baskerville, Georgia, serif;
            //
            // In a Rule, a Value represents everything after the `:`,
            // and before the `;`.
            //
            value: function () {
                let e;
                const expressions = [];
                const index = parserInput.i;

                do {
                    e = this.expression();
                    if (e) {
                        expressions.push(e);
                        if (!parserInput.$char(',')) { break; }
                    }
                } while (e);

                if (expressions.length > 0) {
                    return new(tree.Value)(expressions, index);
                }
            },
            important: function () {
                if (parserInput.currentChar() === '!') {
                    return parserInput.$re(/^! *important/);
                }
            },
            sub: function () {
                let a;
                let e;

                parserInput.save();
                if (parserInput.$char('(')) {
                    a = this.addition();
                    if (a && parserInput.$char(')')) {
                        parserInput.forget();
                        e = new(tree.Expression)([a]);
                        e.parens = true;
                        return e;
                    }
                    parserInput.restore('Expected \')\'');
                    return;
                }
                parserInput.restore();
            },
            multiplication: function () {
                let m;
                let a;
                let op;
                let operation;
                let isSpaced;
                m = this.operand();
                if (m) {
                    isSpaced = parserInput.isWhitespace(-1);
                    while (true) {
                        if (parserInput.peek(/^\/[*\/]/)) {
                            break;
                        }

                        parserInput.save();

                        op = parserInput.$char('/') || parserInput.$char('*') || parserInput.$str('./');

                        if (!op) { parserInput.forget(); break; }

                        a = this.operand();

                        if (!a) { parserInput.restore(); break; }
                        parserInput.forget();

                        m.parensInOp = true;
                        a.parensInOp = true;
                        operation = new(tree.Operation)(op, [operation || m, a], isSpaced);
                        isSpaced = parserInput.isWhitespace(-1);
                    }
                    return operation || m;
                }
            },
            addition: function () {
                let m;
                let a;
                let op;
                let operation;
                let isSpaced;
                m = this.multiplication();
                if (m) {
                    isSpaced = parserInput.isWhitespace(-1);
                    while (true) {
                        op = parserInput.$re(/^[-+]\s+/) || (!isSpaced && (parserInput.$char('+') || parserInput.$char('-')));
                        if (!op) {
                            break;
                        }
                        a = this.multiplication();
                        if (!a) {
                            break;
                        }

                        m.parensInOp = true;
                        a.parensInOp = true;
                        operation = new(tree.Operation)(op, [operation || m, a], isSpaced);
                        isSpaced = parserInput.isWhitespace(-1);
                    }
                    return operation || m;
                }
            },
            conditions: function () {
                let a;
                let b;
                const index = parserInput.i;
                let condition;

                a = this.condition(true);
                if (a) {
                    while (true) {
                        if (!parserInput.peek(/^,\s*(not\s*)?\(/) || !parserInput.$char(',')) {
                            break;
                        }
                        b = this.condition(true);
                        if (!b) {
                            break;
                        }
                        condition = new(tree.Condition)('or', condition || a, b, index);
                    }
                    return condition || a;
                }
            },
            condition: function (needsParens) {
                let result;
                let logical;
                let next;
                function or() {
                    return parserInput.$str('or');
                }

                result = this.conditionAnd(needsParens);
                if (!result) {
                    return ;
                }
                logical = or();
                if (logical) {
                    next = this.condition(needsParens);
                    if (next) {
                        result = new(tree.Condition)(logical, result, next);
                    } else {
                        return ;
                    }
                }
                return result;
            },
            conditionAnd: function (needsParens) {
                let result;
                let logical;
                let next;
                const self = this;
                function insideCondition() {
                    const cond = self.negatedCondition(needsParens) || self.parenthesisCondition(needsParens);
                    if (!cond && !needsParens) {
                        return self.atomicCondition(needsParens);
                    }
                    return cond;
                }
                function and() {
                    return parserInput.$str('and');
                }

                result = insideCondition();
                if (!result) {
                    return ;
                }
                logical = and();
                if (logical) {
                    next = this.conditionAnd(needsParens);
                    if (next) {
                        result = new(tree.Condition)(logical, result, next);
                    } else {
                        return ;
                    }
                }
                return result;
            },
            negatedCondition: function (needsParens) {
                if (parserInput.$str('not')) {
                    const result = this.parenthesisCondition(needsParens);
                    if (result) {
                        result.negate = !result.negate;
                    }
                    return result;
                }
            },
            parenthesisCondition: function (needsParens) {
                function tryConditionFollowedByParenthesis(me) {
                    let body;
                    parserInput.save();
                    body = me.condition(needsParens);
                    if (!body) {
                        parserInput.restore();
                        return ;
                    }
                    if (!parserInput.$char(')')) {
                        parserInput.restore();
                        return ;
                    }
                    parserInput.forget();
                    return body;
                }

                let body;
                parserInput.save();
                if (!parserInput.$str('(')) {
                    parserInput.restore();
                    return ;
                }
                body = tryConditionFollowedByParenthesis(this);
                if (body) {
                    parserInput.forget();
                    return body;
                }

                body = this.atomicCondition(needsParens);
                if (!body) {
                    parserInput.restore();
                    return ;
                }
                if (!parserInput.$char(')')) {
                    parserInput.restore(`expected ')' got '${parserInput.currentChar()}'`);
                    return ;
                }
                parserInput.forget();
                return body;
            },
            atomicCondition: function (needsParens) {
                const entities = this.entities;
                const index = parserInput.i;
                let a;
                let b;
                let c;
                let op;

                function cond() {
                    return this.addition() || entities.keyword() || entities.quoted() || entities.mixinLookup();
                }
                cond = cond.bind(this);

                a = cond();
                if (a) {
                    if (parserInput.$char('>')) {
                        if (parserInput.$char('=')) {
                            op = '>=';
                        } else {
                            op = '>';
                        }
                    } else
                    if (parserInput.$char('<')) {
                        if (parserInput.$char('=')) {
                            op = '<=';
                        } else {
                            op = '<';
                        }
                    } else
                    if (parserInput.$char('=')) {
                        if (parserInput.$char('>')) {
                            op = '=>';
                        } else if (parserInput.$char('<')) {
                            op = '=<';
                        } else {
                            op = '=';
                        }
                    }
                    if (op) {
                        b = cond();
                        if (b) {
                            c = new(tree.Condition)(op, a, b, index, false);
                        } else {
                            error('expected expression');
                        }
                    } else {
                        c = new(tree.Condition)('=', a, new(tree.Keyword)('true'), index, false);
                    }
                    return c;
                }
            },

            //
            // An operand is anything that can be part of an operation,
            // such as a Color, or a Variable
            //
            operand: function () {
                const entities = this.entities;
                let negate;

                if (parserInput.peek(/^-[@\$\(]/)) {
                    negate = parserInput.$char('-');
                }

                let o = this.sub() || entities.dimension() ||
                        entities.color() || entities.variable() ||
                        entities.property() || entities.call() ||
                        entities.quoted(true) || entities.colorKeyword() ||
                        entities.mixinLookup();

                if (negate) {
                    o.parensInOp = true;
                    o = new(tree.Negative)(o);
                }

                return o;
            },

            //
            // Expressions either represent mathematical operations,
            // or white-space delimited Entities.
            //
            //     1px solid black
            //     @var * 2
            //
            expression: function () {
                const entities = [];
                let e;
                let delim;
                const index = parserInput.i;

                do {
                    e = this.comment();
                    if (e) {
                        entities.push(e);
                        continue;
                    }
                    e = this.addition() || this.entity();

                    if (e instanceof tree.Comment) {
                        e = null;
                    }

                    if (e) {
                        entities.push(e);
                        // operations do not allow keyword "/" dimension (e.g. small/20px) so we support that here
                        if (!parserInput.peek(/^\/[\/*]/)) {
                            delim = parserInput.$char('/');
                            if (delim) {
                                entities.push(new(tree.Anonymous)(delim, index));
                            }
                        }
                    }
                } while (e);
                if (entities.length > 0) {
                    return new(tree.Expression)(entities);
                }
            },
            property: function () {
                const name = parserInput.$re(/^(\*?-?[_a-zA-Z0-9-]+)\s*:/);
                if (name) {
                    return name[1];
                }
            },
            ruleProperty: function () {
                let name = [];
                const index = [];
                let s;
                let k;

                parserInput.save();

                const simpleProperty = parserInput.$re(/^([_a-zA-Z0-9-]+)\s*:/);
                if (simpleProperty) {
                    name = [new(tree.Keyword)(simpleProperty[1])];
                    parserInput.forget();
                    return name;
                }

                function match(re) {
                    const i = parserInput.i;
                    const chunk = parserInput.$re(re);
                    if (chunk) {
                        index.push(i);
                        return name.push(chunk[1]);
                    }
                }

                match(/^(\*?)/);
                while (true) {
                    if (!match(/^((?:[\w-]+)|(?:[@\$]\{[\w-]+\}))/)) {
                        break;
                    }
                }

                if ((name.length > 1) && match(/^((?:\+_|\+)?)\s*:/)) {
                    parserInput.forget();

                    // at last, we have the complete match now. move forward,
                    // convert name particles to tree objects and return:
                    if (name[0] === '') {
                        name.shift();
                        index.shift();
                    }
                    for (k = 0; k < name.length; k++) {
                        s = name[k];
                        name[k] = (s.charAt(0) !== '@' && s.charAt(0) !== '$') ?
                            new(tree.Keyword)(s) :
                            (s.charAt(0) === '@' ?
                                new(tree.Variable)(`@${s.slice(2, -1)}`, index[k], fileInfo) :
                                new(tree.Property)(`$${s.slice(2, -1)}`, index[k], fileInfo));
                    }
                    return name;
                }
                parserInput.restore();
            }
        }
    };
};
Parser.serializeVars = vars => {
    let s = '';

    for (const name in vars) {
        if (Object.hasOwnProperty.call(vars, name)) {
            const value = vars[name];
            s += `${((name[0] === '@') ? '' : '@') + name}: ${value}${(String(value).slice(-1) === ';') ? '' : ';'}`;
        }
    }

    return s;
};

export default Parser;
