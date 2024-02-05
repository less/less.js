// @ts-check
import LessError from '../less-error';
import visitors from '../visitors';
import getParserInput from './parser-input';
import * as utils from '../utils';
import tree from '../tree'
import functionRegistry from '../functions/function-registry';
import { ContainerSyntaxOptions, MediaSyntaxOptions } from '../tree/atrule-syntax';

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
/**
 * 
 * @param {*} context 
 * @param {*} imports 
 * @param {*} fileInfo 
 * @param {number} currentIndex 
 */
let Parser = function Parser(context, imports, fileInfo, currentIndex) {
    currentIndex = currentIndex || 0;

    /**
     * Tree nodes - destructure during call to avoid circularity.
     */
    const {
        Node,
        Color,
        AtRule,
        DetachedRuleset,
        Operation,
        Dimension,
        Keyword,
        Variable,
        Property,
        Ruleset,
        Element,
        Attribute,
        Combinator,
        Selector,
        Quoted,
        Expression,
        Declaration,
        Call,
        URL,
        Import,
        Comment,
        Anonymous,
        Value,
        JavaScript,
        Assignment,
        Condition,
        QueryInParens,
        Paren,
        Media,
        Container,
        UnicodeDescriptor,
        Negative,
        Extend,
        VariableCall,
        NamespaceValue,
        Layer,
        mixin: {
            Call: MixinCall,
            Definition: MixinDefinition
        }
    } = tree

    let parsers = (() => {
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
        let parsePrimary = () => {
            /** @type {Array<any>} */
            let root = [];
            let node;

            while (true) {
                while (true) {
                    node = parseComment();
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

                node = parseExtendRule();
                if (node) {
                    root = root.concat(node);
                    continue;
                }

                node = mDefinition()
                    || parseDeclaration()
                    || mCall(false, false)
                    || parseRuleset()
                    || parseVariableCall()
                    || pCall()
                    || parseAtrule();

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
        }

        // comments are collected by the main parsing mechanism and then assigned to nodes
        // where the current structure allows it
        let parseComment = () => {
            if (parserInput.commentStore.length) {
                /** @type {*} */
                const comment = parserInput.commentStore.shift();
                return new(Comment)(comment.text, comment.isLineComment, comment.index + currentIndex, fileInfo);
            }
        }

        //
        // Entities are tokens which can be found inside an Expression
        // Entity parsing functions prefaced by `p`
        //
        let pMixinLookup = () => {
            return parsers.mixin.call(true, true);
        }
        /**
         * A string, which supports escaping " and '
         *
         *     "milky way" 'he\'s the one!'
         *
         * @param {boolean} [forceEscaped]
         */
        let pQuoted = (forceEscaped) => {
            /** @type {string} */
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

            str = /** @type {string} */ (parserInput.$quoted());
            if (!str) {
                parserInput.restore();
                return;
            }
            parserInput.forget();

            return new(Quoted)(str.charAt(0), str.substr(1, str.length - 2), isEscaped, index + currentIndex, fileInfo);
        }

        //
        // A catch-all word, such as:
        //
        //     black border-collapse
        //
        let pKeyword = () => {
            const k = parserInput.$char('%') || parserInput.$re(/^\[?(?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+\]?/);
            if (k) {
                return Color.fromKeyword(k) || new(Keyword)(k);
            }
        }

        //
        // A function call
        //
        //     rgb(255, 0, 255)
        //
        // The arguments are parsed with the `entities.arguments` parser.
        //
        let pCall = () => {
            let name;
            let args;
            let func;
            const index = parserInput.i;

            // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
            if (parserInput.peek(/^url\(/i)) {
                return;
            }

            parserInput.save();

            name = parserInput.$re(/^([\w-]+|%|~|progid:[\w.]+)\(/);
            if (!name) {
                parserInput.forget();
                return;
            }

            name = name[1];
            func = pCustomFuncCall(name);
            if (func) {
                args = func.parse();
                if (args && func.stop) {
                    parserInput.forget();
                    return args;
                }
            }

            args = pArguments(args);

            if (!parserInput.$char(')')) {
                parserInput.restore('Could not parse call arguments or missing \')\'');
                return;
            }

            parserInput.forget();

            return new(Call)(name, args, index + currentIndex, fileInfo);
        }

        let pDeclarationCall = () => {
            let validCall;
            let args;
            const index = parserInput.i;

            parserInput.save();

            validCall = /** @type {string} */ (parserInput.$re(/^[\w]+\(/));
            if (!validCall) {
                parserInput.forget();
                return;
            }

            validCall = validCall.substring(0, validCall.length - 1);

            let rule = parseRuleProperty();
            let value;
            
            if (rule) {
                value = parseValue();
            }
            
            if (rule && value) {
                args = [new (Declaration)(rule, value, null, null, parserInput.i + currentIndex, fileInfo, true)];
            }

            if (!parserInput.$char(')')) {
                parserInput.restore('Could not parse call arguments or missing \')\'');
                return;
            }

            parserInput.forget();

            return new(Call)(validCall, args, index + currentIndex, fileInfo);
        }

        //
        // Parsing rules for functions with non-standard args, e.g.:
        //
        //     boolean(not(2 > 1))
        //
        //     This is a quick prototype, to be modified/improved when
        //     more custom-parsed funcs come (e.g. `selector(...)`)
        //

        /**
         * @param {string} name 
         */
        let pCustomFuncCall = (name) => {
            /* Ideally the table is to be moved out of here for faster perf.,
                but it's quite tricky since it relies on all these `parsers`
                and `expect` available only here */
            return {
                alpha:   f(parseIeAlpha, true),
                boolean: f(condition),
                'if':    f(condition)
            }[name.toLowerCase()];

            /**
             * 
             * @param {Function} parse 
             * @param {boolean} [stop] 
             */
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
        }

        /**
         * @param {Array<any>} [prevArgs] 
         */
        let pArguments = (prevArgs) => {
            let argsComma = prevArgs || [];
            const argsSemiColon = [];
            let isSemiColonSeparated;
            /** @type {*} */
            let value;

            parserInput.save();

            while (true) {
                if (prevArgs) {
                    prevArgs = undefined;
                } else {
                    value = parseDetachedRuleset() || pAssignment() || parseExpression();
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
                        : new Value(argsComma);
                    argsSemiColon.push(value);
                    argsComma = [];
                }
            }

            parserInput.forget();
            return isSemiColonSeparated ? argsSemiColon : argsComma;
        }

        let pLiteral = () => {
            return pDimension()
                || pColor()
                || pQuoted()
                || pUnicodeDescriptor();
        }

        // Assignments are argument entities for calls.
        // They are present in ie filter properties as shown below.
        //
        //     filter: progid:DXImageTransform.Microsoft.Alpha( *opacity=50* )
        //
        let pAssignment = () => {
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
                return new(Assignment)(key, value);
            } else {
                parserInput.restore();
            }
        }

        //
        // Parse url() tokens
        //
        // We use a specific rule for urls, because they don't really behave like
        // standard function calls. The difference is that the argument doesn't have
        // to be enclosed within a string, so it can't be parsed as an Expression.
        //
        let pUrl = () => {
            /** @type {*} */
            let value;
            const index = parserInput.i;

            parserInput.autoCommentAbsorb = false;

            if (!parserInput.$str('url(')) {
                parserInput.autoCommentAbsorb = true;
                return;
            }

            value = pQuoted() || pVariable() || pProperty() ||
                    parserInput.$re(/^(?:(?:\\[()'"])|[^()'"])+/) || '';

            parserInput.autoCommentAbsorb = true;

            expectChar(')');

            return new(URL)((value.value !== undefined ||
                value instanceof Variable ||
                value instanceof Property) ?
                value : new(Anonymous)(value, index), index + currentIndex, fileInfo);
        }

        //
        // A Variable entity, such as `@fink`, in
        //
        //     width: @fink + 2px
        //
        // We use a different parser for variable definitions,
        // see `parsers.variable`.
        //
        let pVariable = () => {
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
                return new(Variable)(name, index + currentIndex, fileInfo);
            }
            parserInput.restore();
        }

        // A variable entity using the protective {} e.g. @{var}
        let pVariableCurly = () => {
            let curly;
            const index = parserInput.i;

            if (parserInput.currentChar() === '@' && (curly = parserInput.$re(/^@\{([\w-]+)\}/))) {
                return new(Variable)(`@${curly[1]}`, index + currentIndex, fileInfo);
            }
        }
        //
        // A Property accessor, such as `$color`, in
        //
        //     background-color: $color
        //
        let pProperty = () => {
            let name;
            const index = parserInput.i;

            if (parserInput.currentChar() === '$' && (name = parserInput.$re(/^\$[\w-]+/))) {
                return new(Property)(name, index + currentIndex, fileInfo);
            }
        }

        // A property entity useing the protective {} e.g. ${prop}
        let pPropertyCurly = () => {
            let curly;
            const index = parserInput.i;

            if (parserInput.currentChar() === '$' && (curly = parserInput.$re(/^\$\{([\w-]+)\}/))) {
                return new(Property)(`$${curly[1]}`, index + currentIndex, fileInfo);
            }
        }
        //
        // A Hexadecimal color
        //
        //     #4F3C2F
        //
        // `rgb` and `hsl` colors are parsed through the `entities.call` parser.
        //
        let pColor = () => {
            let rgb;
            parserInput.save();

            if (parserInput.currentChar() === '#' && (rgb = parserInput.$re(/^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})([\w.#[])?/))) {
                if (!rgb[2]) {
                    parserInput.forget();
                    return new(Color)(rgb[1], undefined, rgb[0]);
                }
            }
            parserInput.restore();
        }

        let pColorKeyword = () => {
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
            const color = Color.fromKeyword(k);
            if (color) {
                parserInput.$str(/** @type {string} */ (k));
                return color;
            }
        }

        //
        // A Dimension, that is, a number and a unit
        //
        //     0.5em 95%
        //
        let pDimension = () => {
            if (parserInput.peekNotNumeric()) {
                return;
            }

            const value = parserInput.$re(/^([+-]?\d*\.?\d+)(%|[a-z_]+)?/i);
            if (value) {
                return new(Dimension)(value[1], value[2]);
            }
        }

        //
        // A unicode descriptor, as is used in unicode-range
        //
        // U+0??  or U+00A1-00A9
        //
        let pUnicodeDescriptor = () => {
            let ud;

            ud = parserInput.$re(/^U\+[0-9a-fA-F?]+(-[0-9a-fA-F?]+)?/);
            if (ud) {
                return new(UnicodeDescriptor)(ud[0]);
            }
        }

        //
        // JavaScript code to be evaluated
        //
        //     `window.location.href`
        //
        let pJavascript = () => {
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
                return new(JavaScript)(js.substr(0, js.length - 1), Boolean(escape), index + currentIndex, fileInfo);
            }
            parserInput.restore('invalid javascript definition');
        }
    

        //
        // The variable part of a variable definition. Used in the `rule` parser
        //
        //     @fink:
        //
        let parseVariable = () => {
            let name;

            if (parserInput.currentChar() === '@' && (name = parserInput.$re(/^(@[\w-]+)\s*:/))) { return name[1]; }
        }

        //
        // Call a variable value to retrieve a detached ruleset
        // or a value from a detached ruleset's rules.
        //
        //     @fink();
        //     @fink;
        //     color: @fink[@color];
        //
        /**
         * @param {string} [parsedName]
         */
        let parseVariableCall = (parsedName) => {
            let lookups;
            const i = parserInput.i;
            const inValue = !!parsedName;
            /** @type {string | null | undefined} */
            let name = parsedName;

            parserInput.save();

            if (name || (parserInput.currentChar() === '@'
                && (name = parserInput.$re(/^(@[\w-]+)(\(\s*\))?/)))) {

                lookups = mRuleLookups();

                if (!lookups && ((inValue && parserInput.$str('()') !== '()') || (name[2] !== '()'))) {
                    parserInput.restore('Missing \'[...]\' lookup in variable call');
                    return;
                }

                if (!inValue) {
                    name = name[1];
                }

                const call = new VariableCall(name, i, fileInfo);
                if (!inValue && parsers.end()) {
                    parserInput.forget();
                    return call;
                }
                else {
                    parserInput.forget();
                    return new NamespaceValue(call, lookups, i, fileInfo);
                }
            }

            parserInput.restore();
        }

        //
        // extend syntax - used to extend selectors
        //
        /**
         * @param {boolean} [isRule] 
         * 
         * @returns {Array<InstanceType<typeof Extend>> | undefined}
         */
        let parseExtend = (isRule) => {
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
                    e = parseElement();
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
                extend = new(Extend)(new(Selector)(elements), option, index + currentIndex, fileInfo);
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
        }

        //
        // extendRule - used in a rule to extend all the parent selectors
        //
        let parseExtendRule = () => parseExtend(true);

        //
        // Mixins
        // Mixin parsing functions prefaced with `m`
        //
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
        /**
         * 
         * @param {boolean} [inValue] 
         * @param {boolean} [getLookup] 
         */
        let mCall = (inValue, getLookup) => {
            const s = parserInput.currentChar();
            let important = false;
            let lookups;
            const index = parserInput.i;
            let elements;
            let args;
            let hasParens;

            if (s !== '.' && s !== '#') { return; }

            parserInput.save(); // stop us absorbing part of an invalid selector

            elements = mElements();

            if (elements) {
                if (parserInput.$char('(')) {
                    args = mArgs(true).args;
                    expectChar(')');
                    hasParens = true;
                }

                if (getLookup !== false) {
                    lookups = mRuleLookups();
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
                    let mixin = new MixinCall(elements, args, index + currentIndex, fileInfo, !lookups && important);
                    if (lookups) {
                        return new NamespaceValue(mixin, lookups);
                    }
                    else {
                        return mixin;
                    }
                }
            }

            parserInput.restore();
        }
        /**
         * Matching elements for mixins
         * (Start with . or # and can have > )
         */
        let mElements = () => {
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
                elem = new(Element)(c, e, false, elemIndex + currentIndex, fileInfo);
                if (elements) {
                    elements.push(elem);
                } else {
                    elements = [ elem ];
                }
                c = parserInput.$char('>');
            }
            return elements;
        }
        /**
         * @param {boolean} [isCall] 
         */
        let mArgs = (isCall) => {
            /** @type {{ args: Array<any> | null, variadic: boolean }} */
            const returner = { args: null, variadic: false }
            let expressions = [];
            /**
             * @type {Array<{
             *   name?: any
             *   value?: any
             *   expand?: boolean | undefined
             *   variadic?: boolean | undefined
             * }>}
             */
            const argsSemiColon = [];
            const argsComma = [];
            let isSemiColonSeparated;
            let expressionContainsNamed;
            let name;
            let nameLoop;
            let value;
            /** @type {any} */
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
                    arg = pVariable() || pProperty() || pLiteral() || pKeyword() || mCall(true);
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

                if (val && (val instanceof Variable || val instanceof Property)) {
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
                        nameLoop = (name = /** @type {*} */ (val).name);
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
                        name = nameLoop = /** @type {*} */ (val).name;
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
                        value = new(Value)(expressions);
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
        }
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
        let mDefinition = () => {
            let name;
            /** @type {Array<any> | null} */
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

                const argInfo = mArgs(false);
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
                    return new(MixinDefinition)(name, params, ruleset, cond, variadic);
                } else {
                    parserInput.restore();
                }
            } else {
                parserInput.restore();
            }
        }

        let mRuleLookups = () => {
            let rule;
            const lookups = [];

            if (parserInput.currentChar() !== '[') {
                return;
            }

            while (true) {
                parserInput.save();
                rule = mLookupValue();
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
        }

        let mLookupValue = () => {
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
        
        //
        // Entities are the smallest recognized token,
        // and can be found inside a rule's value.
        //
        let parseEntity = () => {
            return parseComment()
                || pLiteral()
                || pVariable()
                || pUrl()
                || pProperty()
                || pCall()
                || pKeyword()
                || mCall(true)
                || pJavascript();
        }

        //
        // A Declaration terminator. Note that we use `peek()` to check for '}',
        // because the `block` rule will be expecting it, but we still need to make sure
        // it's there, if ';' was omitted.
        //
        let parseEnd = () => parserInput.$char(';') || parserInput.peek('}');

        //
        // IE's alpha function
        //
        //     alpha(opacity=88)
        //
        let parseIeAlpha = () => {
            let value;

            // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
            if (!parserInput.$re(/^opacity=/i)) { return; }
            value = parserInput.$re(/^\d+/);
            if (!value) {
                value = expect(parsers.entities.variable, 'Could not parse alpha');
                value = `@{${value.name.slice(1)}}`;
            }
            expectChar(')');
            return new Quoted('', `alpha(opacity=${value})`);
        }

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
        /**
         * @returns {InstanceType<typeof Element> | undefined}
         */
        let parseElement = () => {
            let e;
            let c;
            let v;
            const index = parserInput.i;

            c = parseCombinator();

            e = parserInput.$re(/^(?:\d+\.\d+|\d+)%/) ||
                // eslint-disable-next-line no-control-regex
                parserInput.$re(/^(?:[.#]?|:*)(?:[\w-]|[^\x00-\x9f]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/) ||
                parserInput.$char('*') || parserInput.$char('&') || parseAttribute() ||
                parserInput.$re(/^\([^&()@]+\)/) ||  parserInput.$re(/^[.#:](?=@)/) ||
                pVariableCurly();

            if (!e) {
                parserInput.save();
                if (parserInput.$char('(')) {
                    if ((v = parseSelector(false)) && parserInput.$char(')')) {
                        e = new(Paren)(v);
                        parserInput.forget();
                    } else {
                        parserInput.restore('Missing closing \')\'');
                    }
                } else {
                    parserInput.forget();
                }
            }

            if (e) { return new(Element)(c, e, e instanceof Variable, index + currentIndex, fileInfo); }
        }

        //
        // Combinators combine elements together, in a Selector.
        //
        // Because our parser isn't white-space sensitive, special care
        // has to be taken, when parsing the descendant combinator, ` `,
        // as it's an empty space. We have to check the previous character
        // in the input, to see if it's a ` ` character. More info on how
        // we deal with this in *combinator.js*.
        //
        let parseCombinator = () => {
            let c = parserInput.currentChar();

            if (c === '/') {
                parserInput.save();
                const slashedCombinator = parserInput.$re(/^\/[a-z]+\//i);
                if (slashedCombinator) {
                    parserInput.forget();
                    return new(Combinator)(slashedCombinator);
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
                return new(Combinator)(c);
            } else if (parserInput.isWhitespace(-1)) {
                return new(Combinator)(' ');
            } else {
                return new(Combinator)(null);
            }
        }
        //
        // A CSS Selector
        // with less extensions e.g. the ability to extend and guard
        //
        //     .class > div + h1
        //     li a:hover
        //
        // Selectors are made out of one or more Elements, see above.
        //
        /**
         * 
         * @param {boolean} [isLess]
         */
        let parseSelector = (isLess) => {
            const index = parserInput.i;
            let elements;
            let extendList;
            let c;
            let e;
            let allExtends;
            let when;
            let condition;
            isLess = isLess !== false;
            while ((isLess && (extendList = parseExtend())) || (isLess && (when = parserInput.$str('when'))) || (e = parseElement())) {
                if (when) {
                    condition = expect(parseConditions, 'expected condition');
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

            if (elements) { return new(Selector)(elements, allExtends, condition, index + currentIndex, fileInfo); }
            if (allExtends) { error('Extend must be used to extend a selector, it cannot be used on its own'); }
        }
        let parseSelectors = () => {
            let s;
            let selectors;
            while (true) {
                s = parseSelector();
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
                    error('Guards are only currently allowed on a single selector.');
                }
                if (!parserInput.$char(',')) { break; }
                if (s.condition) {
                    error('Guards are only currently allowed on a single selector.');
                }
                parserInput.commentStore.length = 0;
            }
            return selectors;
        }
        let parseAttribute = () => {
            if (!parserInput.$char('[')) { return; }

            let key;
            let val;
            let op;
            //
            // case-insensitive flag
            // e.g. [attr operator value i]
            //
            let cif;

            if (!(key = pVariableCurly())) {
                key = expect(/^(?:[_A-Za-z0-9-*]*\|)?(?:[_A-Za-z0-9-]|\\.)+/);
            }

            op = parserInput.$re(/^[|~*$^]?=/);
            if (op) {
                val = pQuoted() || parserInput.$re(/^[0-9]+%/) || parserInput.$re(/^[\w-]+/) || pVariableCurly();
                if (val) {
                    cif = parserInput.$re(/^[iIsS]/);
                }
            }

            expectChar(']');

            return new(Attribute)(key, op, val, cif);
        }

        //
        // The `block` rule is used by `ruleset` and `mixin.definition`.
        // It's a wrapper around the `primary` rule, with added `{}`.
        //
        let parseBlock = () => {
            let content;
            if (parserInput.$char('{') && (content = parsePrimary()) && parserInput.$char('}')) {
                return content;
            }
        }

        /**
         * @returns {InstanceType<typeof Ruleset> | undefined}
         */
        let parseBlockRuleset = () => {
            /** @type {any} */
            let block = parseBlock();

            if (block) {
                block = new Ruleset(null, block);
            }
            return block;
        }

        let parseDetachedRuleset = () => {
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
                argInfo = mArgs(false);
                params = argInfo.args;
                variadic = argInfo.variadic;
                if (!parserInput.$char(')')) {
                    parserInput.restore();
                    return;
                }
            }
            const blockRuleset = parseBlockRuleset();
            if (blockRuleset) {
                parserInput.forget();
                if (params) {
                    return new MixinDefinition(null, params, blockRuleset, null, variadic);
                }
                return new DetachedRuleset(blockRuleset);
            }
            parserInput.restore();
        }

        //
        // div, .class, body > p {...}
        //
        let parseRuleset = () => {
            let selectors;
            let rules;
            let debugInfo;

            parserInput.save();

            if (context.dumpLineNumbers) {
                debugInfo = getDebugInfo(parserInput.i);
            }

            selectors = parseSelectors();

            if (selectors && (rules = parseBlock())) {
                parserInput.forget();
                const ruleset = new(Ruleset)(selectors, rules, context.strictImports);
                if (context.dumpLineNumbers) {
                    /** @type {*} */ (ruleset).debugInfo = debugInfo;
                }
                return ruleset;
            } else {
                parserInput.restore();
            }
        }
        let parseDeclaration = () => {
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

            name = parseVariable() || parseRuleProperty();
            if (name) {
                isVariable = typeof name === 'string';

                if (isVariable) {
                    value = parseDetachedRuleset();
                    if (value) {
                        hasDR = true;
                    }
                }

                parserInput.commentStore.length = 0;
                if (!value) {
                    // a name returned by this.ruleProperty() is always an array of the form:
                    // [string-1, ..., string-n, ""] or [string-1, ..., string-n, "+"]
                    // where each item is a Keyword or Variable
                    merge = !isVariable && name.length > 1 && /** @type {any[]} */ (name).pop().value;

                    // Custom property values get permissive parsing
                    if (name[0].value && name[0].value.slice(0, 2) === '--') {
                        value = parsePermissiveValue(/[;}]/);
                    }
                    // Try to store values as anonymous
                    // If we need the value later we'll re-parse it in ruleset.parseValue
                    else {
                        value = parseAnonymousValue();
                    }
                    if (value) {
                        parserInput.forget();
                        // anonymous values absorb the end ';' which is required for them to work
                        return new(Declaration)(name, value, false, merge, index + currentIndex, fileInfo);
                    }

                    if (!value) {
                        value = parseValue();
                    }

                    if (value) {
                        important = parseImportant();
                    } else if (isVariable) {
                        // As a last resort, try permissiveValue
                        value = parsePermissiveValue();
                    }
                }

                if (value && (parseEnd() || hasDR)) {
                    parserInput.forget();
                    return new(Declaration)(name, value, important, merge, index + currentIndex, fileInfo);
                }
                else {
                    parserInput.restore();
                }
            } else {
                parserInput.restore();
            }
        }
        let parseAnonymousValue = () => {
            const index = parserInput.i;
            let match = parserInput.$re(/^([^.#@$+/'"*`(;{}-]*);/);
            if (match) {
                return new(Anonymous)(match[1], index + currentIndex);
            }
        }
        /**
         * Used for custom properties, at-rules, and variables (as fallback)
         * Parses almost anything inside of {} [] () "" blocks
         * until it reaches outer-most tokens.
         *
         * First, it will try to parse comments and entities to reach
         * the end. This is mostly like the Expression parser except no
         * math is allowed.
         * 
         * @param {RegExp | string} [untilTokens]
         */
        let parsePermissiveValue = (untilTokens) => {
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
                e = parseComment();
                if (e) {
                    value.push(e);
                    continue;
                }
                e = parseEntity();
                if (e) {
                    value.push(e);
                }
                if (parserInput.peek(',')) {
                    value.push(new (Anonymous)(',', parserInput.i));
                    parserInput.$char(',');
                }
            } while (e);

            done = testCurrentChar();

            if (value.length > 0) {
                value = new(Expression)(value);
                if (done) {
                    return value;
                }
                else {
                    result.push(value);
                }
                // Preserve space before $parseUntil as it will not
                if (parserInput.prevChar() === ' ') {
                    result.push(new Anonymous(' ', index));
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
                    return new Anonymous('', index);
                }
                let item;
                for (i = 0; i < value.length; i++) {
                    item = value[i];
                    if (Array.isArray(item)) {
                        // Treat actual quotes as normal quoted values
                        result.push(new Quoted(item[0], item[1], true, index, fileInfo));
                    }
                    else {
                        if (i === value.length - 1) {
                            item = item.trim();
                        }
                        // Treat like quoted values, but replace vars like unquoted expressions
                        const quote = new Quoted('\'', item, true, index, fileInfo);
                        quote.variableRegex = /@([\w-]+)/g;
                        quote.propRegex = /\$([\w-]+)/g;
                        result.push(quote);
                    }
                }
                parserInput.forget();
                return new Expression(result, true);
            }
            parserInput.restore();
        }

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
        let parseImport = () => {
            let path;
            let features;
            const index = parserInput.i;

            const dir = parserInput.$re(/^@import\s+/);

            if (dir) {
                const options = (dir ? parseImportOptions() : null) || {};

                if ((path = pQuoted() || pUrl())) {
                    features = parseMediaFeatures({});

                    if (!parserInput.$char(';')) {
                        parserInput.i = index;
                        error('missing semi-colon or unrecognised media features on import');
                    }
                    features = features && new(Value)(features);
                    return new(Import)(path, features, options, index + currentIndex, fileInfo);
                }
                else {
                    parserInput.i = index;
                    error('malformed import statement');
                }
            }
        }

        let parseImportOptions = () => {
            let o;
            /** @type {Record<string, any>} */
            const options = {};
            let optionName;
            let value;

            // list of options, surrounded by parens
            if (!parserInput.$char('(')) { return null; }
            do {
                o = parseImportOption();
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
        }

        let parseImportOption = () => {
            const opt = parserInput.$re(/^(less|css|multiple|once|inline|reference|optional)/);
            if (opt) {
                return opt[1];
            }
        }

        /**
         * @param {Record<string, any>} syntaxOptions 
         */
        let parseMediaFeature = (syntaxOptions) => {
            const nodes = [];
            let e;
            /** @type {*} */
            let p;
            let rangeP;
            parserInput.save();
            do {
                e = pDeclarationCall() || pKeyword() || pVariable() || pMixinLookup()
                if (e) {
                    nodes.push(e);
                } else if (parserInput.$char('(')) {
                    p = parseProperty();
                    parserInput.save();
                    if (!p && syntaxOptions.queryInParens && parserInput.$re(/^[0-9a-z-]*\s*([<>]=|<=|>=|[<>]|=)/)) {
                        parserInput.restore();
                        p = parseCondition();

                        parserInput.save();
                        rangeP = parseAtomicCondition(null, p.rvalue);
                        if (!rangeP) {
                            parserInput.restore();
                        }
                    } else {
                        parserInput.restore();
                        e = parseValue();
                    }
                    if (parserInput.$char(')')) {
                        if (p && !e) {
                            nodes.push(new (Paren)(new (QueryInParens)(p.op, p.lvalue, p.rvalue, rangeP ? rangeP.op : null, rangeP ? rangeP.rvalue : null, p._index)));				 
                            e = p;
                        } else if (p && e) {
                            nodes.push(new (Paren)(new (Declaration)(p, e, null, null, parserInput.i + currentIndex, fileInfo, true)));
                        } else if (e) {
                            nodes.push(new(Paren)(e));
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
                return new(Expression)(nodes);
            }
        }

        /**
         * @param {Record<string, any>} syntaxOptions 
         */
        let parseMediaFeatures = (syntaxOptions) => {
            const features = [];
            let e;
            do {
                e = parseMediaFeature(syntaxOptions);
                if (e) {
                    features.push(e);
                    if (!parserInput.$char(',')) { break; }
                } else {
                    e = pVariable() || pMixinLookup();
                    if (e) {
                        features.push(e);
                        if (!parserInput.$char(',')) { break; }
                    }
                }
            } while (e);

            return features.length > 0 ? features : null;
        }

        /**
         * 
         * @param {new (...args: any[]) => Record<string, any>} treeType 
         * @param {number} index 
         * @param {Record<string, any> | undefined} debugInfo 
         * @param {Record<string, any>} syntaxOptions 
         */
        let prepareAndGetNestableAtRule = (treeType, index, debugInfo, syntaxOptions) => {
            const features = parseMediaFeatures(syntaxOptions);

            const rules = parseBlock();

            if (!rules) {
                error('nested at-rules require block statements after any features');
            }

            parserInput.forget();

            const atRule = new (treeType)(rules, features, index + currentIndex, fileInfo);
            if (context.dumpLineNumbers) {
                atRule.debugInfo = debugInfo;
            }

            return atRule;
        }

        let parseNestableAtRule = () => {
            let debugInfo;
            const index = parserInput.i;

            if (context.dumpLineNumbers) {
                debugInfo = getDebugInfo(index);
            }
            parserInput.save();

            if (parserInput.$peekChar('@')) {
                if (parserInput.$str('@media')) {
                    return prepareAndGetNestableAtRule(Media, index, debugInfo, MediaSyntaxOptions);
                }
                
                if (parserInput.$str('@container')) {
                    return prepareAndGetNestableAtRule(Container, index, debugInfo, ContainerSyntaxOptions);
                }

                if (parserInput.$re(/^@layer/)) {
                    const keyword = pKeyword();
                    const rules = parseBlock();
                    const atRule = new Layer(rules, keyword, index + currentIndex, fileInfo);
                    if (context.dumpLineNumbers) {
                        /** @type {*} */ (atRule).debugInfo = debugInfo;
                    }

                    return atRule;
                }
            }
            
            parserInput.restore();
        }

        //

        // A @plugin directive, used to import plugins dynamically.
        //
        //     @plugin (args) "lib";
        //
        let parsePlugin = () => {
            let path;
            let args;
            let options;
            const index = parserInput.i;
            const dir   = parserInput.$re(/^@plugin\s+/);

            if (dir) {
                args = parsePluginArgs();

                if (args) {
                    options = {
                        pluginArgs: args,
                        isPlugin: true
                    };
                }
                else {
                    options = { isPlugin: true };
                }

                if ((path = pQuoted() || pUrl())) {

                    if (!parserInput.$char(';')) {
                        parserInput.i = index;
                        error('missing semi-colon on @plugin');
                    }
                    return new(Import)(path, null, options, index + currentIndex, fileInfo);
                }
                else {
                    parserInput.i = index;
                    error('malformed @plugin statement');
                }
            }
        }

        let parsePluginArgs = () => {
            // list of options, surrounded by parens
            parserInput.save();
            if (!parserInput.$char('(')) {
                parserInput.restore();
                return null;
            }
            const args = parserInput.$re(/^\s*([^);]+)\)\s*/);
            if (args?.[1]) {
                parserInput.forget();
                return args[1].trim();
            }
            else {
                parserInput.restore();
                return null;
            }
        }

        //
        // A CSS AtRule
        //
        //     @charset "utf-8";
        //
        let parseAtrule = () => {
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

            value = parseImport() || parsePlugin() || parseNestableAtRule();
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
                value = parseEntity();
                if (!value) {
                    error(`expected ${name} identifier`);
                }
            } else if (hasExpression) {
                value = parseExpression();
                if (!value) {
                    error(`expected ${name} expression`);
                }
            } else if (hasUnknown) {
                value = parsePermissiveValue(/^[{;]/);
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
                rules = parseBlockRuleset();
            }

            if (rules || (!hasBlock && value && parserInput.$char(';'))) {
                parserInput.forget();
                return new(AtRule)(name, value, rules, index + currentIndex, fileInfo,
                    context.dumpLineNumbers ? getDebugInfo(index) : null,
                    isRooted
                );
            }

            parserInput.restore('at-rule options not recognised');
        }

        //
        // A Value is a comma-delimited list of Expressions
        //
        //     font-family: Baskerville, Georgia, serif;
        //
        // In a Rule, a Value represents everything after the `:`,
        // and before the `;`.
        //
        let parseValue = () => {
            let e;
            const expressions = [];

            do {
                e = parseExpression();
                if (e) {
                    expressions.push(e);
                    if (!parserInput.$char(',')) { break; }
                }
            } while (e);

            if (expressions.length > 0) {
                return new(Value)(expressions);
            }
        }
        let parseImportant = () => {
            if (parserInput.currentChar() === '!') {
                return parserInput.$re(/^! *important/);
            }
        }
        let parseSub = () => {
            let a;
            let e;

            parserInput.save();
            if (parserInput.$char('(')) {
                a = parseAddition();
                if (a && parserInput.$char(')')) {
                    parserInput.forget();
                    e = new(Expression)([a]);
                    e.parens = true;
                    return e;
                }
                parserInput.restore('Expected \')\'');
                return;
            }
            parserInput.restore();
        }
        let parseMultiplication = () => {
            let m;
            let a;
            let op;
            let operation;
            let isSpaced;
            m = parseOperand();
            if (m) {
                isSpaced = parserInput.isWhitespace(-1);
                while (true) {
                    if (parserInput.peek(/^\/[*/]/)) {
                        break;
                    }

                    parserInput.save();

                    op = parserInput.$char('/') || parserInput.$char('*') || parserInput.$str('./');

                    if (!op) { parserInput.forget(); break; }

                    a = parseOperand();

                    if (!a) { parserInput.restore(); break; }
                    parserInput.forget();

                    m.parensInOp = true;
                    a.parensInOp = true;
                    operation = new(Operation)(op, [operation || m, a], isSpaced);
                    isSpaced = parserInput.isWhitespace(-1);
                }
                return operation || m;
            }
        }
        let parseAddition = () => {
            let m;
            let a;
            let op;
            let operation;
            let isSpaced;
            m = parseMultiplication();
            if (m) {
                isSpaced = parserInput.isWhitespace(-1);
                while (true) {
                    op = parserInput.$re(/^[-+]\s+/) || (!isSpaced && (parserInput.$char('+') || parserInput.$char('-')));
                    if (!op) {
                        break;
                    }
                    a = parseMultiplication();
                    if (!a) {
                        break;
                    }

                    m.parensInOp = true;
                    a.parensInOp = true;
                    operation = new(Operation)(op, [operation || m, a], isSpaced);
                    isSpaced = parserInput.isWhitespace(-1);
                }
                return operation || m;
            }
        }
        let parseConditions = () => {
            let a;
            let b;
            const index = parserInput.i;
            let condition;

            a = parseCondition(true);
            if (a) {
                while (true) {
                    if (!parserInput.peek(/^,\s*(not\s*)?\(/) || !parserInput.$char(',')) {
                        break;
                    }
                    b = parseCondition(true);
                    if (!b) {
                        break;
                    }
                    condition = new(Condition)('or', condition || a, b, index + currentIndex);
                }
                return condition || a;
            }
        }
        /**
         * @param {boolean} [needsParens]
         * 
         * @returns {InstanceType<typeof Condition> | undefined}
         */
        let parseCondition = (needsParens) => {
            let result;
            let logical;
            let next;
            function or() {
                return parserInput.$str('or');
            }

            result = parseConditionAnd(needsParens);
            if (!result) {
                return ;
            }
            logical = or();
            if (logical) {
                next = parseCondition(needsParens);
                if (next) {
                    result = new(Condition)(logical, result, next);
                } else {
                    return ;
                }
            }
            return result;
        }
        /**
         * @param {boolean} [needsParens] 
         * 
         * @returns {InstanceType<typeof Condition> | undefined}
         */
        let parseConditionAnd = (needsParens) => {
            let result;
            let logical;
            let next;
            function insideCondition() {
                const cond = parseNegatedCondition(needsParens) || parseParenthesisCondition(needsParens);
                if (!cond && !needsParens) {
                    return parseAtomicCondition(needsParens);
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
                next = parseConditionAnd(needsParens);
                if (next) {
                    result = new(Condition)(logical, result, next);
                } else {
                    return ;
                }
            }
            return result;
        }
        /**
         * @param {boolean} [needsParens] 
         */
        let parseNegatedCondition = (needsParens) => {
            if (parserInput.$str('not')) {
                const result = parseParenthesisCondition(needsParens);
                if (result) {
                    result.negate = !result.negate;
                }
                return result;
            }
        }
        /**
         * @param {boolean} [needsParens] 
         */
        let parseParenthesisCondition = (needsParens) => {
            function tryConditionFollowedByParenthesis() {
                let body;
                parserInput.save();
                body = parseCondition(needsParens);
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
            body = tryConditionFollowedByParenthesis();
            if (body) {
                parserInput.forget();
                return body;
            }

            body = parseAtomicCondition(needsParens);
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
        }
        /**
         * @param {boolean | null} [needsParens]
         * @param {boolean} [preparsedCond]
         */
        let parseAtomicCondition = (needsParens, preparsedCond) => {
            const index = parserInput.i;
            let a;
            let b;
            let c;
            let op;

            const cond = () => parseAddition()
                || pKeyword()
                || pQuoted()
                || pMixinLookup();

            if (preparsedCond) {
                a = preparsedCond;
            } else {
                a = cond();
            }

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
                        c = new(Condition)(op, a, b, index + currentIndex, false);
                    } else {
                        error('expected expression');
                    }
                } else if (!preparsedCond) {
                    c = new(Condition)('=', a, new(Keyword)('true'), index + currentIndex, false);
                }
                return c;
            }
        }

        //
        // An operand is anything that can be part of an operation,
        // such as a Color, or a Variable
        //
        let parseOperand = () => {
            let negate;

            if (parserInput.peek(/^-[@$(]/)) {
                negate = parserInput.$char('-');
            }

            /** @type {*} */
            let o = parseSub()
                || pDimension()
                || pColor()
                || pVariable()
                || pProperty()
                || pCall()
                || pQuoted(true)
                || pColorKeyword()
                || pMixinLookup();

            if (negate) {
                o.parensInOp = true;
                o = new(Negative)(o);
            }

            return o;
        }

        //
        // Expressions either represent mathematical operations,
        // or white-space delimited Entities.
        //
        //     1px solid black
        //     @var * 2
        //
        let parseExpression = () => {
            const entities = [];
            let e;
            let delim;
            const index = parserInput.i;

            do {
                e = parseComment();
                if (e) {
                    entities.push(e);
                    continue;
                }
                e = parseAddition() || parseEntity();

                if (e instanceof Comment) {
                    e = null;
                }

                if (e) {
                    entities.push(e);
                    // operations do not allow keyword "/" dimension (e.g. small/20px) so we support that here
                    if (!parserInput.peek(/^\/[/*]/)) {
                        delim = parserInput.$char('/');
                        if (delim) {
                            entities.push(new(Anonymous)(delim, index + currentIndex));
                        }
                    }
                }
            } while (e);
            if (entities.length > 0) {
                return new(Expression)(entities);
            }
        }
        let parseProperty = () => {
            const name = parserInput.$re(/^(\*?-?[_a-zA-Z0-9-]+)\s*:/);
            if (name) {
                return name[1];
            }
        }
        let parseRuleProperty = () => {
            /** @type {Array<any>} */
            let name = [];
            /** @type {Array<any>} */
            const index = [];
            let s;
            let k;

            parserInput.save();

            const simpleProperty = parserInput.$re(/^([_a-zA-Z0-9-]+)\s*:/);
            if (simpleProperty) {
                name = [new(Keyword)(simpleProperty[1])];
                parserInput.forget();
                return name;
            }

            /**
             * @param {RegExp} re
             */
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
                if (!match(/^((?:[\w-]+)|(?:[@$]\{[\w-]+\}))/)) {
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
                        new(Keyword)(s) :
                        (s.charAt(0) === '@' ?
                            new(Variable)(`@${s.slice(2, -1)}`, index[k] + currentIndex, fileInfo) :
                            new(Property)(`$${s.slice(2, -1)}`, index[k] + currentIndex, fileInfo));
                }
                return name;
            }
            parserInput.restore();
        }


        /**
         * @overload
         * @param {'plugin'} fnName
         * @param {typeof parsePlugin} newFn
         * @return {void}
         */

        /**
         * 
         * @param {string} fnName 
         * @param {(...args: any) => any} newFn
         * @return {void}
         */
        function override(fnName, newFn) {
            switch (fnName) {
                case 'plugin':
                    parsePlugin = newFn
                    break;
                default:
                    error('Cannot override ' + fnName);
            }
        }

        return {
            override,
            entities: {
                arguments: pArguments,
                assignment: pAssignment,
                call: pCall,
                color: pColor,
                colorKeyword: pColorKeyword,
                customFuncCall: pCustomFuncCall,
                declarationCall: pDeclarationCall,
                dimension: pDimension,
                javascript: pJavascript,
                keyword: pKeyword,
                literal: pLiteral,
                mixinLookup: pMixinLookup,
                property: pProperty,
                propertyCurly: pPropertyCurly,
                quoted: pQuoted,
                unicodeDescriptor: pUnicodeDescriptor,
                url: pUrl,
                variable: pVariable,
                variableCurly: pVariableCurly
            },
            addition: parseAddition,
            anonymousValue: parseAnonymousValue,
            atrule: parseAtrule,
            atomicCondition: parseAtomicCondition,
            attribute: parseAttribute,
            block: parseBlock,
            blockRuleset: parseBlockRuleset,
            combinator: parseCombinator,
            comment: parseComment,
            condition: parseCondition,
            conditionAnd: parseConditionAnd,
            conditions: parseConditions,
            declaration: parseDeclaration,
            detachedRuleset: parseDetachedRuleset,
            element: parseElement,
            expression: parseExpression,
            end: parseEnd,
            extend: parseExtend,
            entity: parseEntity,
            extendRule: parseExtendRule,
            ieAlpha: parseIeAlpha,
            'import': parseImport,
            importOption: parseImportOption,
            importOptions: parseImportOptions,
            important: parseImportant,
            mediaFeature: parseMediaFeature,
            mediaFeatures: parseMediaFeatures,
            mixin: {
                args: mArgs,
                call: mCall,
                definition: mDefinition,
                elements: mElements,
                lookupValue: mLookupValue,
                ruleLookups: mRuleLookups
            },
            multiplication: parseMultiplication,
            negatedCondition: parseNegatedCondition,
            nestableAtRule: parseNestableAtRule,
            operand: parseOperand,
            parenthesisCondition: parseParenthesisCondition,
            permissiveValue: parsePermissiveValue,
            plugin: parsePlugin,
            pluginArgs: parsePluginArgs,
            primary: parsePrimary,
            property: parseProperty,
            ruleset: parseRuleset,
            selector: parseSelector,
            selectors: parseSelectors,
            sub: parseSub,
            value: parseValue,
            variable: parseVariable,
            variableCall: parseVariableCall
        }
        
    })()

    let parserInput = getParserInput();

    /**
     * 
     * @param {string} msg 
     * @param {string} [type] 
     */
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

    /**
     * 
     * @param {RegExp | Function} arg 
     * @param {string} [msg] 
     */
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

    /**
     * Specialization of expect()
     * 
     * @param {string} arg
     * @param {string} [msg]
     */
    function expectChar(arg, msg) {
        if (parserInput.$char(arg)) {
            return arg;
        }
        error(msg || `expected '${arg}' got '${parserInput.currentChar()}'`);
    }

    /**
     * @param {number} index 
     */
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
     *  @param {Array<any>} parseList    - array of parsers to run input through e.g. ["value", "important"]
     *  @param {Function} callback
     */
    function parseNode(str, parseList, callback) {
        let result;
        const returnNodes = [];
        let parser = parserInput;

        try {
            parser.start(str, false,
                /**
                 * 
                 * @param {string} msg 
                 * @param {number} index 
                 */
                function fail(msg, index) {
                    callback({
                        message: msg,
                        index: index + currentIndex
                    });
                });
            for (let x = 0, p; (p = parseList[x]); x++) {
                result = /** @type {*} */ (parsers)[p]();
                returnNodes.push(result || null);
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
        /**
         * Parse an input string into an abstract syntax tree,
         * @param {string} str A string containing 'less' markup
         * @param {Function} callback call `callback` when done.
         * @param {*} [additionalData] An optional map which can contains vars - a map (key, value) of variables to apply
         */
        parse: function (str, callback, additionalData) {
            /** @type {any} */
            let root;
            /** @type {null} */
            let err = null;
            let globalVars;
            let modifyVars;
            let ignored;
            let preText = '';

            // Optionally disable @plugin parsing
            if (additionalData && additionalData.disablePluginRule) {
                parsers.override('plugin', function() {
                    var dir = parserInput.$re(/^@plugin?\s+/);
                    if (dir) {
                        error('@plugin statements are not allowed when disablePluginRule is set to true');
                    }
                    return undefined
                })
            }

            globalVars = (additionalData && additionalData.globalVars) ? `${Parser.serializeVars(additionalData.globalVars)}\n` : '';
            modifyVars = (additionalData && additionalData.modifyVars) ? `\n${Parser.serializeVars(additionalData.modifyVars)}` : '';

            if (context.pluginManager) {
                let preProcessors = context.pluginManager.getPreProcessors();
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

                /** @type {*} */ (Node.prototype).parse = this;
                root = new Ruleset(null, this.parsers.primary());
                /** @type {*} */ (Node.prototype).rootNode = root;
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

                err = new LessError({
                    type: 'Parse',
                    message,
                    index: endInfo.furthest,
                    filename: fileInfo.filename
                }, imports);
            }

            /**
             * @param {Error | LessError} [e] 
             */
            const finish = e => {
                e = err || e || imports.error;

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
        parsers
    };
};
/**
 * @param {Record<string, any>} vars 
 */
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