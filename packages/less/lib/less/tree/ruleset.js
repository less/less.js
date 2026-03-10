// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor, FileInfo, VisibilityInfo } from './node.js' */
/** @import { FunctionRegistry } from './nested-at-rule.js' */
import Node from './node.js';
import Declaration from './declaration.js';
import Keyword from './keyword.js';
import Comment from './comment.js';
import Paren from './paren.js';
import Selector from './selector.js';
import Element from './element.js';
import Anonymous from './anonymous.js';
import contexts from '../contexts.js';
import globalFunctionRegistry from '../functions/function-registry.js';
import defaultFunc from '../functions/default.js';
import getDebugInfo from './debug-info.js';
import * as utils from '../utils.js';
import Parser from '../parser/parser.js';

/**
 * @typedef {Node & {
 *   rules?: Node[],
 *   selectors?: Selector[],
 *   root?: boolean,
 *   firstRoot?: boolean,
 *   allowImports?: boolean,
 *   functionRegistry?: FunctionRegistry,
 *   originalRuleset?: Node,
 *   debugInfo?: { lineNumber: number, fileName: string },
 *   evalFirst?: boolean,
 *   isRuleset?: boolean,
 *   isCharset?: () => boolean,
 *   merge?: boolean | string,
 *   multiMedia?: boolean,
 *   parse?: { context: EvalContext, importManager: object },
 *   bubbleSelectors?: (selectors: Selector[]) => void
 * }} RuleNode
 */

class Ruleset extends Node {
    get type() { return 'Ruleset'; }

    /**
     * @param {Selector[] | null} selectors
     * @param {Node[] | null} rules
     * @param {boolean} [strictImports]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(selectors, rules, strictImports, visibilityInfo) {
        super();
        /** @type {Selector[] | null} */
        this.selectors = selectors;
        /** @type {Node[] | null} */
        this.rules = rules;
        /** @type {Object<string, { rule: Node, path: Node[] }[]>} */
        this._lookups = {};
        /** @type {Object<string, Declaration> | null} */
        this._variables = null;
        /** @type {Object<string, Declaration[]> | null} */
        this._properties = null;
        /** @type {boolean | undefined} */
        this.strictImports = strictImports;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        /** @type {boolean} */
        this.isRuleset = true;

        /** @type {boolean | undefined} */
        this.root = undefined;
        /** @type {boolean | undefined} */
        this.firstRoot = undefined;
        /** @type {boolean | undefined} */
        this.allowImports = undefined;
        /** @type {FunctionRegistry | undefined} */
        this.functionRegistry = undefined;
        /** @type {Node | undefined} */
        this.originalRuleset = undefined;
        /** @type {{ lineNumber: number, fileName: string } | undefined} */
        this.debugInfo = undefined;
        /** @type {Selector[][] | undefined} */
        this.paths = undefined;
        /** @type {Ruleset[] | null | undefined} */
        this._rulesets = undefined;
        /** @type {boolean | undefined} */
        this.evalFirst = undefined;
        this.setParent(this.selectors, this);
        this.setParent(this.rules, this);
    }

    isRulesetLike() { return true; }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        if (this.paths) {
            this.paths = /** @type {Selector[][]} */ (/** @type {unknown} */ (visitor.visitArray(/** @type {Node[]} */ (/** @type {unknown} */ (this.paths)), true)));
        } else if (this.selectors) {
            this.selectors = /** @type {Selector[]} */ (visitor.visitArray(this.selectors));
        }
        if (this.rules && this.rules.length) {
            this.rules = visitor.visitArray(this.rules);
        }
    }

    /** @param {EvalContext} context */
    eval(context) {
        /** @type {Selector[] | undefined} */
        let selectors;
        /** @type {number} */
        let selCnt;
        /** @type {Selector} */
        let selector;
        /** @type {number} */
        let i;
        /** @type {boolean | undefined} */
        let hasVariable;
        let hasOnePassingSelector = false;

        if (this.selectors && (selCnt = this.selectors.length)) {
            selectors = new Array(selCnt);
            defaultFunc.error({
                type: 'Syntax',
                message: 'it is currently only allowed in parametric mixin guards,'
            });

            for (i = 0; i < selCnt; i++) {
                selector = /** @type {Selector} */ (this.selectors[i].eval(context));
                for (let j = 0; j < selector.elements.length; j++) {
                    if (selector.elements[j].isVariable) {
                        hasVariable = true;
                        break;
                    }
                }
                selectors[i] = selector;
                if (selector.evaldCondition) {
                    hasOnePassingSelector = true;
                }
            }

            if (hasVariable) {
                const toParseSelectors = new Array(selCnt);
                for (i = 0; i < selCnt; i++) {
                    selector = selectors[i];
                    toParseSelectors[i] = selector.toCSS(context);
                }
                const startingIndex = selectors[0].getIndex();
                const selectorFileInfo = selectors[0].fileInfo();
                new (/** @type {new (...args: [EvalContext, object, FileInfo, number]) => { parseNode: Function }} */ (/** @type {unknown} */ (Parser)))(context, /** @type {{ context: EvalContext, importManager: object }} */ (this.parse).importManager, selectorFileInfo, startingIndex).parseNode(
                    toParseSelectors.join(','),
                    ['selectors'],
                    function(/** @type {Error | null} */ err, /** @type {Node[]} */ result) {
                        if (result) {
                            selectors = /** @type {Selector[]} */ (utils.flattenArray(result));
                        }
                    });
            }

            defaultFunc.reset();
        } else {
            hasOnePassingSelector = true;
        }

        let rules = this.rules ? utils.copyArray(this.rules) : null;
        const ruleset = new Ruleset(selectors, rules, this.strictImports, this.visibilityInfo());
        /** @type {Node} */
        let rule;
        /** @type {Node} */
        let subRule;

        ruleset.originalRuleset = this;
        ruleset.root = this.root;
        ruleset.firstRoot = this.firstRoot;
        ruleset.allowImports = this.allowImports;

        if (this.debugInfo) {
            ruleset.debugInfo = this.debugInfo;
        }

        if (!hasOnePassingSelector) {
            /** @type {Node[]} */ (rules).length = 0;
        }

        // push the current ruleset to the frames stack
        const ctxFrames = context.frames;

        // inherit a function registry from the frames stack when possible;
        // otherwise from the global registry
        /** @type {FunctionRegistry | undefined} */
        let foundRegistry;
        for (let fi = 0, fn = ctxFrames.length; fi !== fn; ++fi) {
            foundRegistry = /** @type {RuleNode} */ (ctxFrames[fi]).functionRegistry;
            if (foundRegistry) { break; }
        }
        ruleset.functionRegistry = (foundRegistry || globalFunctionRegistry).inherit();
        ctxFrames.unshift(ruleset);

        // currrent selectors
        /** @type {Selector[][] | undefined} */
        let ctxSelectors = /** @type {EvalContext & { selectors?: Selector[][] }} */ (context).selectors;
        if (!ctxSelectors) {
            /** @type {EvalContext & { selectors?: Selector[][] }} */ (context).selectors = ctxSelectors = [];
        }
        ctxSelectors.unshift(this.selectors);

        // Evaluate imports
        if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
            ruleset.evalImports(context);
        }

        // Store the frames around mixin definitions,
        // so they can be evaluated like closures when the time comes.
        const rsRules = /** @type {Node[]} */ (ruleset.rules);
        for (i = 0; (rule = rsRules[i]); i++) {
            if (/** @type {RuleNode} */ (rule).evalFirst) {
                rsRules[i] = rule.eval(context);
            }
        }

        const mediaBlockCount = (context.mediaBlocks && context.mediaBlocks.length) || 0;

        // Evaluate mixin calls.
        for (i = 0; (rule = rsRules[i]); i++) {
            if (rule.type === 'MixinCall') {
                /* jshint loopfunc:true */
                rules = /** @type {Node[]} */ (/** @type {unknown} */ (rule.eval(context))).filter(function(/** @type {Node & { variable?: boolean }} */ r) {
                    if ((r instanceof Declaration) && r.variable) {
                        // do not pollute the scope if the variable is
                        // already there. consider returning false here
                        // but we need a way to "return" variable from mixins
                        return !(ruleset.variable(/** @type {string} */ (r.name)));
                    }
                    return true;
                });
                rsRules.splice.apply(rsRules, /** @type {[number, number, ...Node[]]} */ ([i, 1].concat(rules)));
                i += rules.length - 1;
                ruleset.resetCache();
            } else if (rule.type ===  'VariableCall') {
                /* jshint loopfunc:true */
                rules = /** @type {Node[]} */ (/** @type {RuleNode} */ (rule.eval(context)).rules).filter(function(/** @type {Node & { variable?: boolean }} */ r) {
                    if ((r instanceof Declaration) && r.variable) {
                        // do not pollute the scope at all
                        return false;
                    }
                    return true;
                });
                rsRules.splice.apply(rsRules, /** @type {[number, number, ...Node[]]} */ ([i, 1].concat(rules)));
                i += rules.length - 1;
                ruleset.resetCache();
            }
        }

        // Evaluate everything else
        for (i = 0; (rule = rsRules[i]); i++) {
            if (!/** @type {RuleNode} */ (rule).evalFirst) {
                rsRules[i] = rule = rule.eval ? rule.eval(context) : rule;
            }
        }

        // Evaluate everything else
        for (i = 0; (rule = rsRules[i]); i++) {
            // for rulesets, check if it is a css guard and can be removed
            if (rule instanceof Ruleset && rule.selectors && rule.selectors.length === 1) {
                // check if it can be folded in (e.g. & where)
                if (rule.selectors[0] && rule.selectors[0].isJustParentSelector()) {
                    rsRules.splice(i--, 1);

                    for (let j = 0; (subRule = rule.rules[j]); j++) {
                        if (subRule instanceof Node) {
                            subRule.copyVisibilityInfo(rule.visibilityInfo());
                            if (!(subRule instanceof Declaration) || !subRule.variable) {
                                rsRules.splice(++i, 0, subRule);
                            }
                        }
                    }
                }
            }
        }

        // Pop the stack
        ctxFrames.shift();
        ctxSelectors.shift();

        if (context.mediaBlocks) {
            for (i = mediaBlockCount; i < context.mediaBlocks.length; i++) {
                /** @type {RuleNode} */ (context.mediaBlocks[i]).bubbleSelectors(selectors);
            }
        }

        return ruleset;
    }

    /** @param {EvalContext} context */
    evalImports(context) {
        const rules = this.rules;
        /** @type {number} */
        let i;
        /** @type {Node | Node[]} */
        let importRules;
        if (!rules) { return; }

        for (i = 0; i < rules.length; i++) {
            if (rules[i].type === 'Import') {
                importRules = rules[i].eval(context);
                if (importRules && (/** @type {Node[]} */ (/** @type {unknown} */ (importRules)).length || /** @type {Node[]} */ (/** @type {unknown} */ (importRules)).length === 0)) {
                    const importArr = /** @type {Node[]} */ (/** @type {unknown} */ (importRules));
                    rules.splice(i, 1, ...importArr);
                    i += importArr.length - 1;
                } else {
                    rules.splice(i, 1, importRules);
                }
                this.resetCache();
            }
        }
    }

    makeImportant() {
        const result = new Ruleset(this.selectors, /** @type {Node[]} */ (this.rules).map(function (/** @type {Node & { makeImportant?: () => Node }} */ r) {
            if (r.makeImportant) {
                return r.makeImportant();
            } else {
                return r;
            }
        }), this.strictImports, this.visibilityInfo());

        return result;
    }

    /** @param {Node[] | object[] | null} [args] */
    matchArgs(args) {
        return !args || args.length === 0;
    }

    /**
     * @param {Node[] | object[] | null} args
     * @param {EvalContext} context
     */
    matchCondition(args, context) {
        const lastSelector = /** @type {Selector[]} */ (this.selectors)[/** @type {Selector[]} */ (this.selectors).length - 1];
        if (!lastSelector.evaldCondition) {
            return false;
        }
        if (lastSelector.condition &&
            !lastSelector.condition.eval(
                new contexts.Eval(context,
                    context.frames))) {
            return false;
        }
        return true;
    }

    resetCache() {
        this._rulesets = null;
        this._variables = null;
        this._properties = null;
        this._lookups = {};
    }

    variables() {
        if (!this._variables) {
            this._variables = !this.rules ? {} : this.rules.reduce(function (/** @type {Object<string, Declaration>} */ hash, /** @type {Node} */ r) {
                if (r instanceof Declaration && r.variable === true) {
                    hash[/** @type {string} */ (r.name)] = r;
                }
                // when evaluating variables in an import statement, imports have not been eval'd
                // so we need to go inside import statements.
                // guard against root being a string (in the case of inlined less)
                if (r.type === 'Import' && /** @type {RuleNode} */ (r).root && /** @type {RuleNode & { root: Ruleset }} */ (r).root.variables) {
                    const vars = /** @type {RuleNode & { root: Ruleset }} */ (r).root.variables();
                    for (const name in vars) {
                        if (Object.prototype.hasOwnProperty.call(vars, name)) {
                            hash[name] = /** @type {Declaration} */ (/** @type {RuleNode & { root: Ruleset }} */ (r).root.variable(name));
                        }
                    }
                }
                return hash;
            }, {});
        }
        return this._variables;
    }

    properties() {
        if (!this._properties) {
            this._properties = !this.rules ? {} : this.rules.reduce(function (/** @type {Object<string, Declaration[]>} */ hash, /** @type {Node} */ r) {
                if (r instanceof Declaration && r.variable !== true) {
                    const name = (/** @type {Node[]} */ (r.name).length === 1) && (/** @type {Node[]} */ (r.name)[0] instanceof Keyword) ?
                        /** @type {string} */ (/** @type {Node[]} */ (r.name)[0].value) : /** @type {string} */ (r.name);
                    // Properties don't overwrite as they can merge
                    if (!hash[`$${name}`]) {
                        hash[`$${name}`] = [ r ];
                    }
                    else {
                        hash[`$${name}`].push(r);
                    }
                }
                return hash;
            }, {});
        }
        return this._properties;
    }

    /** @param {string} name */
    variable(name) {
        const decl = this.variables()[name];
        if (decl) {
            return this.parseValue(decl);
        }
    }

    /** @param {string} name */
    property(name) {
        const decl = this.properties()[name];
        if (decl) {
            return this.parseValue(decl);
        }
    }

    lastDeclaration() {
        for (let i = /** @type {Node[]} */ (this.rules).length; i > 0; i--) {
            const decl = /** @type {Node[]} */ (this.rules)[i - 1];
            if (decl instanceof Declaration) {
                return this.parseValue(decl);
            }
        }
    }

    /** @param {Declaration | Declaration[]} toParse */
    parseValue(toParse) {
        const self = this;
        /** @param {Declaration} decl */
        function transformDeclaration(decl) {
            if (decl.value instanceof Anonymous && !/** @type {Declaration & { parsed?: boolean }} */ (decl).parsed) {
                if (typeof decl.value.value === 'string') {
                    new (/** @type {new (...args: [EvalContext, object, FileInfo, number]) => { parseNode: Function }} */ (/** @type {unknown} */ (Parser)))(/** @type {{ context: EvalContext, importManager: object }} */ (/** @type {Ruleset} */ (this).parse).context, /** @type {{ context: EvalContext, importManager: object }} */ (/** @type {Ruleset} */ (this).parse).importManager, decl.fileInfo(), decl.value.getIndex()).parseNode(
                        decl.value.value,
                        ['value', 'important'],
                        function(/** @type {Error | null} */ err, /** @type {Node[]} */ result) {
                            if (err) {
                                decl.parsed = /** @type {Node} */ (/** @type {unknown} */ (true));
                            }
                            if (result) {
                                decl.value = result[0];
                                /** @type {Declaration & { important?: string }} */ (decl).important = /** @type {string} */ (/** @type {unknown} */ (result[1])) || '';
                                decl.parsed = /** @type {Node} */ (/** @type {unknown} */ (true));
                            }
                        });
                } else {
                    decl.parsed = /** @type {Node} */ (/** @type {unknown} */ (true));
                }

                return decl;
            }
            else {
                return decl;
            }
        }
        if (!Array.isArray(toParse)) {
            return transformDeclaration.call(self, toParse);
        }
        else {
            /** @type {Declaration[]} */
            const nodes = [];
            for (let ti = 0; ti < toParse.length; ti++) {
                nodes.push(transformDeclaration.call(self, toParse[ti]));
            }
            return nodes;
        }
    }

    rulesets() {
        if (!this.rules) { return []; }

        /** @type {Node[]} */
        const filtRules = [];
        const rules = this.rules;
        /** @type {number} */
        let i;
        /** @type {Node} */
        let rule;

        for (i = 0; (rule = rules[i]); i++) {
            if (/** @type {RuleNode} */ (rule).isRuleset) {
                filtRules.push(rule);
            }
        }

        return filtRules;
    }

    /** @param {Node} rule */
    prependRule(rule) {
        const rules = this.rules;
        if (rules) {
            rules.unshift(rule);
        } else {
            this.rules = [ rule ];
        }
        this.setParent(rule, this);
    }

    /**
     * @param {Selector} selector
     * @param {Ruleset | null} [self]
     * @param {((rule: Node) => boolean)} [filter]
     * @returns {{ rule: Node, path: Node[] }[]}
     */
    find(selector, self, filter) {
        self = self || this;
        /** @type {{ rule: Node, path: Node[] }[]} */
        const rules = [];
        /** @type {number | undefined} */
        let match;
        /** @type {{ rule: Node, path: Node[] }[]} */
        let foundMixins;
        const key = selector.toCSS(/** @type {EvalContext} */ ({}));

        if (key in this._lookups) { return /** @type {{ rule: Node, path: Node[] }[]} */ (this._lookups[key]); }

        this.rulesets().forEach(function (rule) {
            if (rule !== self) {
                for (let j = 0; j < /** @type {RuleNode} */ (rule).selectors.length; j++) {
                    match = selector.match(/** @type {RuleNode} */ (rule).selectors[j]);
                    if (match) {
                        if (selector.elements.length > match) {
                            if (!filter || filter(rule)) {
                                foundMixins = /** @type {Ruleset} */ (/** @type {unknown} */ (rule)).find(new Selector(selector.elements.slice(match)), self, filter);
                                for (let i = 0; i < foundMixins.length; ++i) {
                                    foundMixins[i].path.push(rule);
                                }
                                Array.prototype.push.apply(rules, foundMixins);
                            }
                        } else {
                            rules.push({ rule, path: []});
                        }
                        break;
                    }
                }
            }
        });
        this._lookups[key] = rules;
        return rules;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        /** @type {number} */
        let i;
        /** @type {number} */
        let j;
        /** @type {Node[]} */
        const charsetRuleNodes = [];
        /** @type {Node[]} */
        let ruleNodes = [];

        let // Line number debugging
            debugInfo;

        /** @type {Node} */
        let rule;
        /** @type {Selector[]} */
        let path;

        context.tabLevel = (context.tabLevel || 0);

        if (!this.root) {
            context.tabLevel++;
        }

        const tabRuleStr = context.compress ? '' : Array(context.tabLevel + 1).join('  ');
        const tabSetStr = context.compress ? '' : Array(context.tabLevel).join('  ');
        /** @type {string} */
        let sep;

        let charsetNodeIndex = 0;
        let importNodeIndex = 0;
        for (i = 0; (rule = /** @type {Node[]} */ (this.rules)[i]); i++) {
            if (rule instanceof Comment) {
                if (importNodeIndex === i) {
                    importNodeIndex++;
                }
                ruleNodes.push(rule);
            } else if (/** @type {RuleNode} */ (rule).isCharset && /** @type {RuleNode} */ (rule).isCharset()) {
                ruleNodes.splice(charsetNodeIndex, 0, rule);
                charsetNodeIndex++;
                importNodeIndex++;
            } else if (rule.type === 'Import') {
                ruleNodes.splice(importNodeIndex, 0, rule);
                importNodeIndex++;
            } else {
                ruleNodes.push(rule);
            }
        }
        ruleNodes = charsetRuleNodes.concat(ruleNodes);

        // If this is the root node, we don't render
        // a selector, or {}.
        if (!this.root) {
            debugInfo = getDebugInfo(context, /** @type {{ debugInfo: { lineNumber: number, fileName: string } }} */ (/** @type {unknown} */ (this)), tabSetStr);

            if (debugInfo) {
                output.add(debugInfo);
                output.add(tabSetStr);
            }

            const paths = /** @type {Selector[][]} */ (this.paths);
            const pathCnt = paths.length;
            /** @type {number} */
            let pathSubCnt;

            sep = context.compress ? ',' : (`,\n${tabSetStr}`);

            for (i = 0; i < pathCnt; i++) {
                path = paths[i];
                if (!(pathSubCnt = path.length)) { continue; }
                if (i > 0) { output.add(sep); }

                /** @type {EvalContext & { firstSelector?: boolean }} */ (context).firstSelector = true;
                path[0].genCSS(context, output);

                /** @type {EvalContext & { firstSelector?: boolean }} */ (context).firstSelector = false;
                for (j = 1; j < pathSubCnt; j++) {
                    path[j].genCSS(context, output);
                }
            }

            output.add((context.compress ? '{' : ' {\n') + tabRuleStr);
        }

        // Compile rules and rulesets
        for (i = 0; (rule = ruleNodes[i]); i++) {

            if (i + 1 === ruleNodes.length) {
                context.lastRule = true;
            }

            const currentLastRule = context.lastRule;
            if (rule.isRulesetLike()) {
                context.lastRule = false;
            }

            if (rule.genCSS) {
                rule.genCSS(context, output);
            } else if (rule.value) {
                output.add(/** @type {string} */ (rule.value).toString());
            }

            context.lastRule = currentLastRule;

            if (!context.lastRule && rule.isVisible()) {
                output.add(context.compress ? '' : (`\n${tabRuleStr}`));
            } else {
                context.lastRule = false;
            }
        }

        if (!this.root) {
            output.add((context.compress ? '}' : `\n${tabSetStr}}`));
            context.tabLevel--;
        }

        if (!output.isEmpty() && !context.compress && this.firstRoot) {
            output.add('\n');
        }
    }

    /**
     * @param {Selector[][]} paths
     * @param {Selector[][]} context
     * @param {Selector[]} selectors
     */
    joinSelectors(paths, context, selectors) {
        for (let s = 0; s < selectors.length; s++) {
            this.joinSelector(paths, context, selectors[s]);
        }
    }

    /**
     * @param {Selector[][]} paths
     * @param {Selector[][]} context
     * @param {Selector} selector
     */
    joinSelector(paths, context, selector) {

        /**
         * @param {Selector[]} elementsToPak
         * @param {Element} originalElement
         * @returns {Paren}
         */
        function createParenthesis(elementsToPak, originalElement) {
            /** @type {Paren} */
            let replacementParen;
            /** @type {number} */
            let j;
            if (elementsToPak.length === 0) {
                replacementParen = new Paren(elementsToPak[0]);
            } else {
                const insideParent = new Array(elementsToPak.length);
                for (j = 0; j < elementsToPak.length; j++) {
                    insideParent[j] = new Element(
                        null,
                        elementsToPak[j],
                        originalElement.isVariable,
                        originalElement._index,
                        originalElement._fileInfo
                    );
                }
                replacementParen = new Paren(new Selector(insideParent));
            }
            return replacementParen;
        }

        /**
         * @param {Paren | Selector} containedElement
         * @param {Element} originalElement
         * @returns {Selector}
         */
        function createSelector(containedElement, originalElement) {
            /** @type {Element} */
            let element;
            /** @type {Selector} */
            let selector;
            element = new Element(null, containedElement, originalElement.isVariable, originalElement._index, originalElement._fileInfo);
            selector = new Selector([element]);
            return selector;
        }

        /**
         * @param {Selector[]} beginningPath
         * @param {Selector[]} addPath
         * @param {Element} replacedElement
         * @param {Selector} originalSelector
         * @returns {Selector[]}
         */
        function addReplacementIntoPath(beginningPath, addPath, replacedElement, originalSelector) {
            /** @type {Selector[]} */
            let newSelectorPath;
            /** @type {Selector} */
            let lastSelector;
            /** @type {Selector} */
            let newJoinedSelector;
            // our new selector path
            newSelectorPath = [];

            // construct the joined selector - if & is the first thing this will be empty,
            // if not newJoinedSelector will be the last set of elements in the selector
            if (beginningPath.length > 0) {
                newSelectorPath = utils.copyArray(beginningPath);
                lastSelector = newSelectorPath.pop();
                newJoinedSelector = originalSelector.createDerived(utils.copyArray(lastSelector.elements));
            }
            else {
                newJoinedSelector = originalSelector.createDerived([]);
            }

            if (addPath.length > 0) {
                // /deep/ is a CSS4 selector - (removed, so should deprecate)
                // that is valid without anything in front of it
                // so if the & does not have a combinator that is "" or " " then
                // and there is a combinator on the parent, then grab that.
                // this also allows + a { & .b { .a & { ... though not sure why you would want to do that
                let combinator = replacedElement.combinator;

                const parentEl = addPath[0].elements[0];
                if (combinator.emptyOrWhitespace && !parentEl.combinator.emptyOrWhitespace) {
                    combinator = parentEl.combinator;
                }
                // join the elements so far with the first part of the parent
                newJoinedSelector.elements.push(new Element(
                    combinator,
                    parentEl.value,
                    replacedElement.isVariable,
                    replacedElement._index,
                    replacedElement._fileInfo
                ));
                newJoinedSelector.elements = newJoinedSelector.elements.concat(addPath[0].elements.slice(1));
            }

            // now add the joined selector - but only if it is not empty
            if (newJoinedSelector.elements.length !== 0) {
                newSelectorPath.push(newJoinedSelector);
            }

            // put together the parent selectors after the join (e.g. the rest of the parent)
            if (addPath.length > 1) {
                let restOfPath = addPath.slice(1);
                restOfPath = restOfPath.map(function (/** @type {Selector} */ selector) {
                    return selector.createDerived(selector.elements, []);
                });
                newSelectorPath = newSelectorPath.concat(restOfPath);
            }
            return newSelectorPath;
        }

        /**
         * @param {Selector[][]} beginningPath
         * @param {Selector[]} addPaths
         * @param {Element} replacedElement
         * @param {Selector} originalSelector
         * @param {Selector[][]} result
         * @returns {Selector[][]}
         */
        function addAllReplacementsIntoPath( beginningPath, addPaths, replacedElement, originalSelector, result) {
            /** @type {number} */
            let j;
            for (j = 0; j < beginningPath.length; j++) {
                const newSelectorPath = addReplacementIntoPath(beginningPath[j], addPaths, replacedElement, originalSelector);
                result.push(newSelectorPath);
            }
            return result;
        }

        /**
         * @param {Element[]} elements
         * @param {Selector[][]} selectors
         */
        function mergeElementsOnToSelectors(elements, selectors) {
            /** @type {number} */
            let i;
            /** @type {Selector[]} */
            let sel;

            if (elements.length === 0) {
                return ;
            }
            if (selectors.length === 0) {
                selectors.push([ new Selector(elements) ]);
                return;
            }

            for (i = 0; (sel = selectors[i]); i++) {
                // if the previous thing in sel is a parent this needs to join on to it
                if (sel.length > 0) {
                    sel[sel.length - 1] = sel[sel.length - 1].createDerived(sel[sel.length - 1].elements.concat(elements));
                }
                else {
                    sel.push(new Selector(elements));
                }
            }
        }

        /**
         * @param {Selector[][]} paths
         * @param {Selector[][]} context
         * @param {Selector} inSelector
         * @returns {boolean}
         */
        function replaceParentSelector(paths, context, inSelector) {
            // The paths are [[Selector]]
            // The first list is a list of comma separated selectors
            // The inner list is a list of inheritance separated selectors
            // e.g.
            // .a, .b {
            //   .c {
            //   }
            // }
            // == [[.a] [.c]] [[.b] [.c]]
            //
            /** @type {number} */
            let i;
            /** @type {number} */
            let j;
            /** @type {number} */
            let k;
            /** @type {Element[]} */
            let currentElements;
            /** @type {Selector[][]} */
            let newSelectors;
            /** @type {Selector[][]} */
            let selectorsMultiplied;
            /** @type {Selector[]} */
            let sel;
            /** @type {Element} */
            let el;
            let hadParentSelector = false;
            /** @type {number} */
            let length;
            /** @type {Selector} */
            let lastSelector;

            /**
             * @param {Element} element
             * @returns {Selector | null}
             */
            function findNestedSelector(element) {
                /** @type {Node} */
                let maybeSelector;
                if (!(element.value instanceof Paren)) {
                    return null;
                }

                maybeSelector = /** @type {Node} */ (element.value.value);
                if (!(maybeSelector instanceof Selector)) {
                    return null;
                }

                return maybeSelector;
            }

            // the elements from the current selector so far
            currentElements = [];
            // the current list of new selectors to add to the path.
            // We will build it up. We initiate it with one empty selector as we "multiply" the new selectors
            // by the parents
            newSelectors = [
                []
            ];

            for (i = 0; (el = inSelector.elements[i]); i++) {
                // non parent reference elements just get added
                if (el.value !== '&') {
                    const nestedSelector = findNestedSelector(el);
                    if (nestedSelector !== null) {
                        // merge the current list of non parent selector elements
                        // on to the current list of selectors to add
                        mergeElementsOnToSelectors(currentElements, newSelectors);

                        /** @type {Selector[][]} */
                        const nestedPaths = [];
                        /** @type {boolean | undefined} */
                        let replaced;
                        /** @type {Selector[][]} */
                        const replacedNewSelectors = [];

                        // Check if this is a comma-separated selector list inside the paren
                        // e.g. :not(&.a, &.b) produces Selector([Selector, Anonymous(','), Selector])
                        const hasSubSelectors = nestedSelector.elements.some(e => e instanceof Selector);

                        if (hasSubSelectors) {
                            // Process each sub-selector individually
                            /** @type {(Element | Selector)[]} */
                            /** @type {(Element | Selector)[]} */
                            const resolvedElements = [];
                            for (const subEl of nestedSelector.elements) {
                                if (subEl instanceof Selector) {
                                    /** @type {Selector[][]} */
                                    const subPaths = [];
                                    const subReplaced = replaceParentSelector(subPaths, context, subEl);
                                    replaced = replaced || subReplaced;
                                    if (subPaths.length > 0 && subPaths[0].length > 0) {
                                        resolvedElements.push(subPaths[0][0]);
                                    } else {
                                        resolvedElements.push(subEl);
                                    }
                                } else {
                                    resolvedElements.push(subEl);
                                }
                            }
                            hadParentSelector = hadParentSelector || /** @type {boolean} */ (replaced);
                            const resolvedNestedSelector = new Selector(resolvedElements);
                            const replacementSelector = createSelector(createParenthesis([resolvedNestedSelector], el), el);
                            addAllReplacementsIntoPath(newSelectors, [replacementSelector], el, inSelector, replacedNewSelectors);
                        } else {
                            replaced = replaceParentSelector(nestedPaths, context, nestedSelector);
                            hadParentSelector = hadParentSelector || replaced;
                            // the nestedPaths array should have only one member - replaceParentSelector does not multiply selectors
                            for (k = 0; k < nestedPaths.length; k++) {
                                const replacementSelector = createSelector(createParenthesis(nestedPaths[k], el), el);
                                addAllReplacementsIntoPath(newSelectors, [replacementSelector], el, inSelector, replacedNewSelectors);
                            }
                        }
                        newSelectors = replacedNewSelectors;
                        currentElements = [];
                    } else {
                        currentElements.push(el);
                    }

                } else {
                    hadParentSelector = true;
                    // the new list of selectors to add
                    selectorsMultiplied = [];

                    // merge the current list of non parent selector elements
                    // on to the current list of selectors to add
                    mergeElementsOnToSelectors(currentElements, newSelectors);

                    // loop through our current selectors
                    for (j = 0; j < newSelectors.length; j++) {
                        sel = newSelectors[j];
                        // if we don't have any parent paths, the & might be in a mixin so that it can be used
                        // whether there are parents or not
                        if (context.length === 0) {
                            // the combinator used on el should now be applied to the next element instead so that
                            // it is not lost
                            if (sel.length > 0) {
                                sel[0].elements.push(new Element(el.combinator, '', el.isVariable, el._index, el._fileInfo));
                            }
                            selectorsMultiplied.push(sel);
                        }
                        else {
                            // and the parent selectors
                            for (k = 0; k < context.length; k++) {
                                // We need to put the current selectors
                                // then join the last selector's elements on to the parents selectors
                                const newSelectorPath = addReplacementIntoPath(sel, context[k], el, inSelector);
                                // add that to our new set of selectors
                                selectorsMultiplied.push(newSelectorPath);
                            }
                        }
                    }

                    // our new selectors has been multiplied, so reset the state
                    newSelectors = selectorsMultiplied;
                    currentElements = [];
                }
            }

            // if we have any elements left over (e.g. .a& .b == .b)
            // add them on to all the current selectors
            mergeElementsOnToSelectors(currentElements, newSelectors);

            for (i = 0; i < newSelectors.length; i++) {
                length = newSelectors[i].length;
                if (length > 0) {
                    paths.push(newSelectors[i]);
                    lastSelector = newSelectors[i][length - 1];
                    newSelectors[i][length - 1] = lastSelector.createDerived(lastSelector.elements, inSelector.extendList);
                }
            }

            return hadParentSelector;
        }

        /**
         * @param {VisibilityInfo} visibilityInfo
         * @param {Selector} deriveFrom
         */
        function deriveSelector(visibilityInfo, deriveFrom) {
            const newSelector = deriveFrom.createDerived(deriveFrom.elements, deriveFrom.extendList, deriveFrom.evaldCondition);
            newSelector.copyVisibilityInfo(visibilityInfo);
            return newSelector;
        }

        // joinSelector code follows
        /** @type {number} */
        let i;
        /** @type {Selector[][]} */
        let newPaths;
        /** @type {boolean} */
        let hadParentSelector;

        newPaths = [];
        hadParentSelector = replaceParentSelector(newPaths, context, selector);

        if (!hadParentSelector) {
            if (context.length > 0) {
                newPaths = [];
                for (i = 0; i < context.length; i++) {

                    const concatenated = context[i].map(deriveSelector.bind(this, selector.visibilityInfo()));

                    concatenated.push(selector);
                    newPaths.push(concatenated);
                }
            }
            else {
                newPaths = [[selector]];
            }
        }

        for (i = 0; i < newPaths.length; i++) {
            paths.push(newPaths[i]);
        }

    }
}

export default Ruleset;
