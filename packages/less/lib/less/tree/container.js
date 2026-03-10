// @ts-check
/** @import { EvalContext, CSSOutput, FileInfo, VisibilityInfo } from './node.js' */
/** @import { FunctionRegistry, NestableAtRuleThis } from './nested-at-rule.js' */
import Node from './node.js';
import Ruleset from './ruleset.js';
import Value from './value.js';
import Selector from './selector.js';
import AtRule from './atrule.js';
import NestableAtRulePrototype from './nested-at-rule.js';

/**
 * @typedef {Ruleset & {
 *   allowImports?: boolean,
 *   debugInfo?: { lineNumber: number, fileName: string },
 *   functionRegistry?: FunctionRegistry
 * }} RulesetWithExtras
 */

class Container extends AtRule {
    get type() { return 'Container'; }

    /**
     * @param {Node[] | null} value
     * @param {Node[]} features
     * @param {number} index
     * @param {FileInfo} currentFileInfo
     * @param {VisibilityInfo} visibilityInfo
     */
    constructor(value, features, index, currentFileInfo, visibilityInfo) {
        super();
        this._index = index;
        this._fileInfo = currentFileInfo;

        const selectors = (new Selector([], null, null, this._index, this._fileInfo)).createEmptySelectors();

        /** @type {Value} */
        this.features = new Value(features);
        /** @type {RulesetWithExtras[]} */
        this.rules = [new Ruleset(selectors, value)];
        this.rules[0].allowImports = true;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(selectors, /** @type {Node} */ (/** @type {unknown} */ (this)));
        this.setParent(this.features, /** @type {Node} */ (/** @type {unknown} */ (this)));
        this.setParent(this.rules, /** @type {Node} */ (/** @type {unknown} */ (this)));

        /** @type {boolean | undefined} */
        this._evaluated = undefined;
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add('@container ', this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        if (this._evaluated) {
            return /** @type {Node} */ (/** @type {unknown} */ (this));
        }
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }

        const media = new Container(null, [], this._index, this._fileInfo, this.visibilityInfo());
        media._evaluated = true;
        if (this.debugInfo) {
            this.rules[0].debugInfo = this.debugInfo;
            media.debugInfo = this.debugInfo;
        }

        media.features = /** @type {Value} */ (this.features.eval(context));

        context.mediaPath.push(/** @type {Node} */ (/** @type {unknown} */ (media)));
        context.mediaBlocks.push(/** @type {Node} */ (/** @type {unknown} */ (media)));

        const fr = /** @type {RulesetWithExtras} */ (context.frames[0]).functionRegistry;
        if (fr) {
            this.rules[0].functionRegistry = fr.inherit();
        }
        context.frames.unshift(this.rules[0]);
        media.rules = [/** @type {RulesetWithExtras} */ (this.rules[0].eval(context))];
        context.frames.shift();

        context.mediaPath.pop();

        return context.mediaPath.length === 0 ? /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (media)).evalTop(context) :
            /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (media)).evalNested(context);
    }
}

// Apply NestableAtRulePrototype methods (accept, isRulesetLike override AtRule's versions)
Object.assign(Container.prototype, NestableAtRulePrototype);

export default Container;
