// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor, FileInfo, VisibilityInfo } from './node.js' */
/** @import { FunctionRegistry } from './nested-at-rule.js' */
import Node from './node.js';
import Selector from './selector.js';
import Ruleset from './ruleset.js';
import Anonymous from './anonymous.js';
import NestableAtRulePrototype from './nested-at-rule.js';
import mergeRules from './merge-rules.js';

/**
 * @typedef {Node & {
 *   rules?: Node[],
 *   selectors?: Selector[],
 *   root?: boolean,
 *   allowImports?: boolean,
 *   functionRegistry?: FunctionRegistry,
 *   merge?: boolean,
 *   debugInfo?: { lineNumber: number, fileName: string },
 *   elements?: import('./element.js').default[]
 * }} RulesetLikeNode
 */

class AtRule extends Node {
    get type() { return 'AtRule'; }

    /**
     * @param {string} [name]
     * @param {Node | string} [value]
     * @param {Node[] | Ruleset} [rules]
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     * @param {{ lineNumber: number, fileName: string }} [debugInfo]
     * @param {boolean} [isRooted]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(
        name,
        value,
        rules,
        index,
        currentFileInfo,
        debugInfo,
        isRooted,
        visibilityInfo
    ) {
        super();
        let i;
        var selectors = (new Selector([], null, null, index, currentFileInfo)).createEmptySelectors();

        /** @type {string | undefined} */
        this.name  = name;
        this.value = (value instanceof Node) ? value : (value ? new Anonymous(value) : value);
        /** @type {boolean | undefined} */
        this.simpleBlock = undefined;
        /** @type {RulesetLikeNode[] | undefined} */
        this.declarations = undefined;
        /** @type {RulesetLikeNode[] | undefined} */
        this.rules = undefined;
        if (rules) {
            if (Array.isArray(rules)) {
                const allDeclarations = this.declarationsBlock(rules);

                let allRulesetDeclarations = true;
                rules.forEach(rule => {
                    if (rule.type === 'Ruleset' && /** @type {RulesetLikeNode} */ (rule).rules) allRulesetDeclarations = allRulesetDeclarations && this.declarationsBlock(/** @type {Node[]} */ (/** @type {RulesetLikeNode} */ (rule).rules), true);
                });

                if (allDeclarations && !isRooted) {
                    this.simpleBlock = true;
                    this.declarations = rules;
                } else if (allRulesetDeclarations && rules.length === 1 && !isRooted && !value) {
                    this.simpleBlock = true;
                    this.declarations = /** @type {RulesetLikeNode} */ (rules[0]).rules ? /** @type {RulesetLikeNode} */ (rules[0]).rules : rules;
                } else {
                    this.rules = rules;
                }
            } else {
                const allDeclarations = this.declarationsBlock(/** @type {Node[]} */ (rules.rules));

                if (allDeclarations && !isRooted && !value) {
                    this.simpleBlock = true;
                    this.declarations = rules.rules;
                } else {
                    this.rules = [rules];
                    /** @type {RulesetLikeNode} */ (this.rules[0]).selectors = (new Selector([], null, null, index, currentFileInfo)).createEmptySelectors();
                }
            }
            if (!this.simpleBlock) {
                for (i = 0; i < this.rules.length; i++) {
                    /** @type {RulesetLikeNode} */ (this.rules[i]).allowImports = true;
                }
            }
            this.setParent(selectors, /** @type {Node} */ (/** @type {unknown} */ (this)));
            this.setParent(this.rules, /** @type {Node} */ (/** @type {unknown} */ (this)));
        }
        this._index = index;
        this._fileInfo = currentFileInfo;
        /** @type {{ lineNumber: number, fileName: string } | undefined} */
        this.debugInfo = debugInfo;
        /** @type {boolean} */
        this.isRooted = isRooted || false;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
    }

    /**
     * @param {Node[]} rules
     * @param {boolean} [mergeable]
     * @returns {boolean}
     */
    declarationsBlock(rules, mergeable = false) {
        if (!mergeable) {
            return rules.filter(function (/** @type {Node & { merge?: boolean }} */ node) { return (node.type === 'Declaration' || node.type === 'Comment') && !node.merge}).length === rules.length;
        } else {
            return rules.filter(function (/** @type {Node} */ node) { return (node.type === 'Declaration' || node.type === 'Comment'); }).length === rules.length;
        }
    }

    /**
     * @param {Node[]} rules
     * @returns {boolean}
     */
    keywordList(rules) {
        if (!Array.isArray(rules)) {
            return false;
        } else {
            return rules.filter(function (/** @type {Node} */ node) { return (node.type === 'Keyword' || node.type === 'Comment'); }).length === rules.length;
        }
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        const value = this.value, rules = this.rules, declarations = this.declarations;

        if (rules) {
            this.rules = visitor.visitArray(rules);
        } else if (declarations) {
            this.declarations = visitor.visitArray(declarations);
        }
        if (value) {
            this.value = visitor.visit(/** @type {Node} */ (value));
        }
    }

    /** @override @returns {boolean} */
    isRulesetLike() {
        return /** @type {boolean} */ (/** @type {unknown} */ (this.rules || !this.isCharset()));
    }

    isCharset() {
        return '@charset' === this.name;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        const value = this.value, rules = this.rules || this.declarations;
        output.add(/** @type {string} */ (this.name), this.fileInfo(), this.getIndex());
        if (value) {
            output.add(' ');
            /** @type {Node} */ (value).genCSS(context, output);
        }
        if (this.simpleBlock) {
            this.outputRuleset(context, output, /** @type {Node[]} */ (this.declarations));
        } else if (rules) {
            this.outputRuleset(context, output, rules);
        } else {
            output.add(';');
        }
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        let mediaPathBackup, mediaBlocksBackup, value = this.value, rules = this.rules || this.declarations;

        // media stored inside other atrule should not bubble over it
        // backpup media bubbling information
        mediaPathBackup = context.mediaPath;
        mediaBlocksBackup = context.mediaBlocks;
        // deleted media bubbling information
        context.mediaPath = [];
        context.mediaBlocks = [];

        if (value) {
            value = /** @type {Node} */ (value).eval(context);
        }

        if (rules) {
            rules = this.evalRoot(context, rules);
        }
        if (Array.isArray(rules) && /** @type {RulesetLikeNode} */ (rules[0]).rules && Array.isArray(/** @type {RulesetLikeNode} */ (rules[0]).rules) && /** @type {Node[]} */ (/** @type {RulesetLikeNode} */ (rules[0]).rules).length) {
            const allMergeableDeclarations = this.declarationsBlock(/** @type {Node[]} */ (/** @type {RulesetLikeNode} */ (rules[0]).rules), true);
            if (allMergeableDeclarations && !this.isRooted && !value) {
                mergeRules(/** @type {Node[]} */ (/** @type {RulesetLikeNode} */ (rules[0]).rules));
                rules = /** @type {RulesetLikeNode[]} */ (/** @type {RulesetLikeNode} */ (rules[0]).rules);
                rules.forEach(/** @param {RulesetLikeNode} rule */ rule => { rule.merge = false; });
            }
        }
        if (this.simpleBlock && rules) {
            /** @type {RulesetLikeNode} */ (rules[0]).functionRegistry = /** @type {RulesetLikeNode} */ (context.frames[0]).functionRegistry.inherit();
            rules = rules.map(function (/** @type {Node} */ rule) { return rule.eval(context); });
        }

        // restore media bubbling information
        context.mediaPath = mediaPathBackup;
        context.mediaBlocks = mediaBlocksBackup;
        return /** @type {Node} */ (/** @type {unknown} */ (new AtRule(this.name, value, rules, this.getIndex(), this.fileInfo(), this.debugInfo, this.isRooted, this.visibilityInfo())));
    }

    /**
     * @param {EvalContext} context
     * @param {Node[]} rules
     * @returns {Node[]}
     */
    evalRoot(context, rules) {
        let ampersandCount = 0;
        let noAmpersandCount = 0;
        let noAmpersands = true;

        if (!this.simpleBlock) {
            rules = [rules[0].eval(context)];
        }

        /** @type {Selector[]} */
        let precedingSelectors = [];
        if (context.frames.length > 0) {
            for (let index = 0; index < context.frames.length; index++) {
                const frame = /** @type {RulesetLikeNode} */ (context.frames[index]);
                if (
                    frame.type === 'Ruleset' &&
                    frame.rules &&
                    frame.rules.length > 0
                ) {
                    if (frame && !frame.root && frame.selectors && frame.selectors.length > 0) {
                        precedingSelectors = precedingSelectors.concat(frame.selectors);
                    }
                }
                if (precedingSelectors.length > 0) {
                    const allAmpersandElements = precedingSelectors.every(
                        sel => sel.elements && sel.elements.length > 0 && sel.elements.every(
                            /** @param {import('./element.js').default} el */
                            el => el.value === '&'
                        )
                    );
                    if (allAmpersandElements) {
                        noAmpersands = false;
                        noAmpersandCount++;
                    } else {
                        ampersandCount++;
                    }
                }
            }
        }

        const mixedAmpersands = ampersandCount > 0 && noAmpersandCount > 0 && !noAmpersands;
        if (
            (this.isRooted && ampersandCount > 0 && noAmpersandCount === 0 && noAmpersands)
            || !mixedAmpersands
        ) {
            /** @type {RulesetLikeNode} */ (rules[0]).root = true;
        }
        return rules;
    }

    /** @param {string} name */
    variable(name) {
        if (this.rules) {
            // assuming that there is only one rule at this point - that is how parser constructs the rule
            return Ruleset.prototype.variable.call(this.rules[0], name);
        }
    }

    find() {
        if (this.rules) {
            // assuming that there is only one rule at this point - that is how parser constructs the rule
            return Ruleset.prototype.find.apply(this.rules[0], arguments);
        }
    }

    rulesets() {
        if (this.rules) {
            // assuming that there is only one rule at this point - that is how parser constructs the rule
            return Ruleset.prototype.rulesets.apply(this.rules[0]);
        }
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     * @param {Node[]} rules
     */
    outputRuleset(context, output, rules) {
        const ruleCnt = rules.length;
        let i;
        context.tabLevel = (context.tabLevel | 0) + 1;

        // Compressed
        if (context.compress) {
            output.add('{');
            for (i = 0; i < ruleCnt; i++) {
                rules[i].genCSS(context, output);
            }
            output.add('}');
            context.tabLevel--;
            return;
        }

        // Non-compressed
        const tabSetStr = `\n${Array(context.tabLevel).join('  ')}`, tabRuleStr = `${tabSetStr}  `;
        if (!ruleCnt) {
            output.add(` {${tabSetStr}}`);
        } else {
            output.add(` {${tabRuleStr}`);
            rules[0].genCSS(context, output);
            for (i = 1; i < ruleCnt; i++) {
                output.add(tabRuleStr);
                rules[i].genCSS(context, output);
            }
            output.add(`${tabSetStr}}`);
        }

        context.tabLevel--;
    }
}

// Apply shared methods from NestableAtRulePrototype that AtRule doesn't override
const { evalFunction, evalTop, evalNested, permute, bubbleSelectors } = NestableAtRulePrototype;
Object.assign(AtRule.prototype, { evalFunction, evalTop, evalNested, permute, bubbleSelectors });

export default AtRule;
