// @ts-check
/** @import { EvalContext, CSSOutput, FileInfo, VisibilityInfo } from './node.js' */
/** @import { NestableAtRuleThis } from './nested-at-rule.js' */
/** @import { RulesetLikeNode } from './atrule.js' */
import Node from './node.js';
import Ruleset from './ruleset.js';
import Value from './value.js';
import Selector from './selector.js';
import AtRule from './atrule.js';
import NestableAtRulePrototype from './nested-at-rule.js';

class Media extends AtRule {
    get type() { return 'Media'; }

    /**
     * @param {Node[] | null} value
     * @param {Node[]} features
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(value, features, index, currentFileInfo, visibilityInfo) {
        super();
        this._index = index;
        this._fileInfo = currentFileInfo;

        const selectors = (new Selector([], null, null, this._index, this._fileInfo)).createEmptySelectors();

        /** @type {Value} */
        this.features = new Value(features);
        /** @type {RulesetLikeNode[]} */
        this.rules = [new Ruleset(selectors, value)];
        /** @type {RulesetLikeNode} */ (this.rules[0]).allowImports = true;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(selectors, /** @type {Node} */ (/** @type {unknown} */ (this)));
        this.setParent(this.features, /** @type {Node} */ (/** @type {unknown} */ (this)));
        this.setParent(this.rules, /** @type {Node} */ (/** @type {unknown} */ (this)));
    }

    /**
     * @param {EvalContext} context
     * @param {CSSOutput} output
     */
    genCSS(context, output) {
        output.add('@media ', this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }

        const media = new Media(null, [], this._index, this._fileInfo, this.visibilityInfo());
        if (this.debugInfo) {
            /** @type {RulesetLikeNode} */ (this.rules[0]).debugInfo = this.debugInfo;
            media.debugInfo = this.debugInfo;
        }

        media.features = /** @type {Value} */ (this.features.eval(context));

        context.mediaPath.push(/** @type {Node} */ (/** @type {unknown} */ (media)));
        context.mediaBlocks.push(/** @type {Node} */ (/** @type {unknown} */ (media)));

        /** @type {RulesetLikeNode} */ (this.rules[0]).functionRegistry = /** @type {RulesetLikeNode} */ (context.frames[0]).functionRegistry.inherit();
        context.frames.unshift(this.rules[0]);
        media.rules = [/** @type {RulesetLikeNode} */ (this.rules[0].eval(context))];
        context.frames.shift();

        context.mediaPath.pop();

        return context.mediaPath.length === 0 ? /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (media)).evalTop(context) :
            /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (media)).evalNested(context);
    }
}

// Apply NestableAtRulePrototype methods (accept, isRulesetLike override AtRule's versions)
Object.assign(Media.prototype, NestableAtRulePrototype);

export default Media;
