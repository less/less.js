// @ts-check
/** @import { EvalContext, TreeVisitor, FileInfo } from './node.js' */
/** @import { FunctionRegistry } from './nested-at-rule.js' */
import Node from './node.js';
import Selector from './selector.js';
import MixinDefinition from './mixin-definition.js';
import defaultFunc from '../functions/default.js';

/**
 * @typedef {{ name?: string, value: Node, expand?: boolean }} MixinArg
 */

/**
 * @typedef {Node & {
 *   rules?: Node[],
 *   selectors?: Selector[],
 *   originalRuleset?: Node,
 *   matchArgs: (args: MixinArg[] | null, context: EvalContext) => boolean,
 *   matchCondition?: (args: MixinArg[] | null, context: EvalContext) => boolean,
 *   find: (selector: Selector, self?: Node | null, filter?: (rule: Node) => boolean) => Array<{ rule: Node & { rules?: Node[], originalRuleset?: Node, matchArgs: Function, matchCondition?: Function, evalCall?: Function }, path: Node[] }>,
 *   functionRegistry?: FunctionRegistry
 * }} MixinSearchFrame
 */

class MixinCall extends Node {
    get type() { return 'MixinCall'; }

    /**
     * @param {import('./element.js').default[]} elements
     * @param {MixinArg[]} [args]
     * @param {number} [index]
     * @param {FileInfo} [currentFileInfo]
     * @param {string} [important]
     */
    constructor(elements, args, index, currentFileInfo, important) {
        super();
        /** @type {Selector} */
        this.selector = new Selector(elements);
        /** @type {MixinArg[]} */
        this.arguments = args || [];
        this._index = index;
        this._fileInfo = currentFileInfo;
        /** @type {string | undefined} */
        this.important = important;
        this.allowRoot = true;
        this.setParent(this.selector, /** @type {Node} */ (/** @type {unknown} */ (this)));
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        if (this.selector) {
            this.selector = /** @type {Selector} */ (visitor.visit(this.selector));
        }
        if (this.arguments.length) {
            this.arguments = /** @type {MixinArg[]} */ (/** @type {unknown} */ (visitor.visitArray(/** @type {Node[]} */ (/** @type {unknown} */ (this.arguments)))));
        }
    }

    /**
     * @param {EvalContext} context
     * @returns {Node}
     */
    eval(context) {
        /** @type {{ rule: Node & { rules?: Node[], originalRuleset?: Node, matchArgs: Function, matchCondition?: Function, evalCall?: Function }, path: Node[] }[] | undefined} */
        let mixins;
        /** @type {Node & { rules?: Node[], originalRuleset?: Node, matchArgs: Function, matchCondition?: Function, evalCall?: Function }} */
        let mixin;
        /** @type {Node[]} */
        let mixinPath;
        /** @type {MixinArg[]} */
        const args = [];
        /** @type {MixinArg} */
        let arg;
        /** @type {Node} */
        let argValue;
        /** @type {Node[]} */
        const rules = [];
        let match = false;
        /** @type {number} */
        let i;
        /** @type {number} */
        let m;
        /** @type {number} */
        let f;
        /** @type {boolean} */
        let isRecursive;
        /** @type {boolean | undefined} */
        let isOneFound;
        /** @type {{ mixin: Node & { rules?: Node[], originalRuleset?: Node, matchArgs: Function, matchCondition?: Function, evalCall?: Function }, group: number }[]} */
        const candidates = [];
        /** @type {{ mixin: Node & { rules?: Node[], originalRuleset?: Node, matchArgs: Function, matchCondition?: Function, evalCall?: Function }, group: number } | number} */
        let candidate;
        /** @type {boolean[]} */
        const conditionResult = [];
        /** @type {number | undefined} */
        let defaultResult;
        const defFalseEitherCase = -1;
        const defNone = 0;
        const defTrue = 1;
        const defFalse = 2;
        /** @type {number[]} */
        let count;
        /** @type {Node | undefined} */
        let originalRuleset;
        /** @type {((rule: MixinSearchFrame) => boolean) | undefined} */
        let noArgumentsFilter;

        this.selector = /** @type {Selector} */ (this.selector.eval(context));

        /**
         * @param {Node & { matchCondition?: Function }} mixin
         * @param {Node[]} mixinPath
         */
        function calcDefGroup(mixin, mixinPath) {
            /** @type {number} */
            let f;
            /** @type {number} */
            let p;
            /** @type {Node & { matchCondition?: Function }} */
            let namespace;

            for (f = 0; f < 2; f++) {
                conditionResult[f] = true;
                defaultFunc.value(f);
                for (p = 0; p < mixinPath.length && conditionResult[f]; p++) {
                    namespace = mixinPath[p];
                    if (namespace.matchCondition) {
                        conditionResult[f] = conditionResult[f] && namespace.matchCondition(null, context);
                    }
                }
                if (mixin.matchCondition) {
                    conditionResult[f] = conditionResult[f] && mixin.matchCondition(args, context);
                }
            }
            if (conditionResult[0] || conditionResult[1]) {
                if (conditionResult[0] != conditionResult[1]) {
                    return conditionResult[1] ?
                        defTrue : defFalse;
                }

                return defNone;
            }
            return defFalseEitherCase;
        }

        for (i = 0; i < this.arguments.length; i++) {
            arg = this.arguments[i];
            argValue = arg.value.eval(context);
            if (arg.expand && Array.isArray(argValue.value)) {
                const expandedValues = /** @type {Node[]} */ (argValue.value);
                for (m = 0; m < expandedValues.length; m++) {
                    args.push({value: expandedValues[m]});
                }
            } else {
                args.push({name: arg.name, value: argValue});
            }
        }

        noArgumentsFilter = function(/** @type {MixinSearchFrame} */ rule) {return rule.matchArgs(null, context);};

        for (i = 0; i < context.frames.length; i++) {
            if ((mixins = /** @type {MixinSearchFrame} */ (context.frames[i]).find(this.selector, null, /** @type {(rule: Node) => boolean} */ (/** @type {unknown} */ (noArgumentsFilter)))).length > 0) {
                isOneFound = true;

                // To make `default()` function independent of definition order we have two "subpasses" here.
                // At first we evaluate each guard *twice* (with `default() == true` and `default() == false`),
                // and build candidate list with corresponding flags. Then, when we know all possible matches,
                // we make a final decision.

                for (m = 0; m < mixins.length; m++) {
                    mixin = mixins[m].rule;
                    mixinPath = mixins[m].path;
                    isRecursive = false;
                    for (f = 0; f < context.frames.length; f++) {
                        if ((!(mixin instanceof MixinDefinition)) && mixin === (/** @type {Node & { originalRuleset?: Node }} */ (context.frames[f]).originalRuleset || context.frames[f])) {
                            isRecursive = true;
                            break;
                        }
                    }
                    if (isRecursive) {
                        continue;
                    }

                    if (mixin.matchArgs(args, context)) {
                        candidate = {mixin, group: calcDefGroup(mixin, mixinPath)};

                        if (/** @type {{ mixin: Node, group: number }} */ (candidate).group !== defFalseEitherCase) {
                            candidates.push(/** @type {{ mixin: Node & { rules?: Node[], originalRuleset?: Node, matchArgs: Function, matchCondition?: Function, evalCall?: Function }, group: number }} */ (candidate));
                        }

                        match = true;
                    }
                }

                defaultFunc.reset();

                count = [0, 0, 0];
                for (m = 0; m < candidates.length; m++) {
                    count[candidates[m].group]++;
                }

                if (count[defNone] > 0) {
                    defaultResult = defFalse;
                } else {
                    defaultResult = defTrue;
                    if ((count[defTrue] + count[defFalse]) > 1) {
                        throw { type: 'Runtime',
                            message: `Ambiguous use of \`default()\` found when matching for \`${this.format(args)}\``,
                            index: this.getIndex(), filename: this.fileInfo().filename };
                    }
                }

                for (m = 0; m < candidates.length; m++) {
                    candidate = candidates[m].group;
                    if ((candidate === defNone) || (candidate === defaultResult)) {
                        try {
                            mixin = candidates[m].mixin;
                            if (!(mixin instanceof MixinDefinition)) {
                                originalRuleset = /** @type {Node & { originalRuleset?: Node }} */ (mixin).originalRuleset || mixin;
                                mixin = new MixinDefinition('', [], mixin.rules, null, false, null, originalRuleset.visibilityInfo());
                                /** @type {Node & { originalRuleset?: Node }} */ (mixin).originalRuleset = originalRuleset;
                            }
                            const newRules = /** @type {MixinDefinition} */ (mixin).evalCall(context, args, this.important).rules;
                            this._setVisibilityToReplacement(newRules);
                            Array.prototype.push.apply(rules, newRules);
                        } catch (e) {
                            throw { .../** @type {object} */ (e), index: this.getIndex(), filename: this.fileInfo().filename };
                        }
                    }
                }

                if (match) {
                    return /** @type {Node} */ (/** @type {unknown} */ (rules));
                }
            }
        }
        if (isOneFound) {
            throw { type:    'Runtime',
                message: `No matching definition was found for \`${this.format(args)}\``,
                index:   this.getIndex(), filename: this.fileInfo().filename };
        } else {
            throw { type:    'Name',
                message: `${this.selector.toCSS(/** @type {EvalContext} */ ({})).trim()} is undefined`,
                index:   this.getIndex(), filename: this.fileInfo().filename };
        }
    }

    /** @param {Node[]} replacement */
    _setVisibilityToReplacement(replacement) {
        /** @type {number} */
        let i;
        /** @type {Node} */
        let rule;
        if (this.blocksVisibility()) {
            for (i = 0; i < replacement.length; i++) {
                rule = replacement[i];
                rule.addVisibilityBlock();
            }
        }
    }

    /** @param {MixinArg[]} args */
    format(args) {
        return `${this.selector.toCSS(/** @type {EvalContext} */ ({})).trim()}(${args ? args.map(function (/** @type {MixinArg} */ a) {
            let argValue = '';
            if (a.name) {
                argValue += `${a.name}:`;
            }
            if (a.value.toCSS) {
                argValue += a.value.toCSS(/** @type {EvalContext} */ ({}));
            } else {
                argValue += '???';
            }
            return argValue;
        }).join(', ') : ''})`;
    }
}

export default MixinCall;
