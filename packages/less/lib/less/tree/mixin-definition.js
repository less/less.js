// @ts-check
/** @import { EvalContext, TreeVisitor, VisibilityInfo } from './node.js' */
/** @import { FunctionRegistry } from './nested-at-rule.js' */
/** @import { MixinArg } from './mixin-call.js' */
import Node from './node.js';
import Selector from './selector.js';
import Element from './element.js';
import Ruleset from './ruleset.js';
import Declaration from './declaration.js';
import DetachedRuleset from './detached-ruleset.js';
import Expression from './expression.js';
import contexts from '../contexts.js';
import * as utils from '../utils.js';

/**
 * @typedef {object} MixinParam
 * @property {string} [name]
 * @property {Node} [value]
 * @property {boolean} [variadic]
 */

/**
 * @typedef {Ruleset & {
 *   functionRegistry?: FunctionRegistry,
 *   originalRuleset?: Node
 * }} RulesetWithRegistry
 */

class Definition extends Ruleset {
    get type() { return 'MixinDefinition'; }

    /**
     * @param {string | undefined} name
     * @param {MixinParam[]} params
     * @param {Node[]} rules
     * @param {Node | null} [condition]
     * @param {boolean} [variadic]
     * @param {Node[] | null} [frames]
     * @param {VisibilityInfo} [visibilityInfo]
     */
    constructor(name, params, rules, condition, variadic, frames, visibilityInfo) {
        super(null, null);
        /** @type {string} */
        this.name = name || 'anonymous mixin';
        this.selectors = [new Selector([new Element(null, name, false, this._index, this._fileInfo)])];
        /** @type {MixinParam[]} */
        this.params = params;
        /** @type {Node | null | undefined} */
        this.condition = condition;
        /** @type {boolean | undefined} */
        this.variadic = variadic;
        /** @type {number} */
        this.arity = params.length;
        this.rules = rules;
        this._lookups = {};
        /** @type {string[]} */
        const optionalParameters = [];
        /** @type {number} */
        this.required = params.reduce(function (/** @type {number} */ count, /** @type {MixinParam} */ p) {
            if (!p.name || (p.name && !p.value)) {
                return count + 1;
            }
            else {
                optionalParameters.push(p.name);
                return count;
            }
        }, 0);
        /** @type {string[]} */
        this.optionalParameters = optionalParameters;
        /** @type {Node[] | null | undefined} */
        this.frames = frames;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        /** @type {boolean} */
        this.evalFirst = true;
    }

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        if (this.params && this.params.length) {
            this.params = /** @type {MixinParam[]} */ (/** @type {unknown} */ (visitor.visitArray(/** @type {Node[]} */ (/** @type {unknown} */ (this.params)))));
        }
        this.rules = visitor.visitArray(this.rules);
        if (this.condition) {
            this.condition = visitor.visit(this.condition);
        }
    }

    /**
     * @param {EvalContext} context
     * @param {EvalContext} mixinEnv
     * @param {MixinArg[] | null} args
     * @param {Node[]} evaldArguments
     * @returns {Ruleset}
     */
    evalParams(context, mixinEnv, args, evaldArguments) {
        /* jshint boss:true */
        const frame = new Ruleset(null, null);

        /** @type {Node[] | undefined} */
        let varargs;
        /** @type {MixinArg | undefined} */
        let arg;
        const params = /** @type {MixinParam[]} */ (utils.copyArray(this.params));
        /** @type {number} */
        let i;
        /** @type {number} */
        let j;
        /** @type {Node | undefined} */
        let val;
        /** @type {string | undefined} */
        let name;
        /** @type {boolean} */
        let isNamedFound;
        /** @type {number} */
        let argIndex;
        let argsLength = 0;

        if (mixinEnv.frames && mixinEnv.frames[0] && /** @type {RulesetWithRegistry} */ (mixinEnv.frames[0]).functionRegistry) {
            /** @type {RulesetWithRegistry} */ (frame).functionRegistry = /** @type {FunctionRegistry} */ (/** @type {RulesetWithRegistry} */ (mixinEnv.frames[0]).functionRegistry).inherit();
        }
        mixinEnv = new contexts.Eval(mixinEnv, /** @type {Node[]} */ ([frame]).concat(/** @type {Node[]} */ (mixinEnv.frames)));

        if (args) {
            args = /** @type {MixinArg[]} */ (utils.copyArray(args));
            argsLength = args.length;

            for (i = 0; i < argsLength; i++) {
                arg = args[i];
                if (name = (arg && arg.name)) {
                    isNamedFound = false;
                    for (j = 0; j < params.length; j++) {
                        if (!evaldArguments[j] && name === params[j].name) {
                            evaldArguments[j] = arg.value.eval(context);
                            frame.prependRule(new Declaration(name, arg.value.eval(context)));
                            isNamedFound = true;
                            break;
                        }
                    }
                    if (isNamedFound) {
                        args.splice(i, 1);
                        i--;
                        continue;
                    } else {
                        throw { type: 'Runtime', message: `Named argument for ${this.name} ${args[i].name} not found` };
                    }
                }
            }
        }
        argIndex = 0;
        for (i = 0; i < params.length; i++) {
            if (evaldArguments[i]) { continue; }

            arg = args && args[argIndex];

            if (name = params[i].name) {
                if (params[i].variadic) {
                    varargs = [];
                    for (j = argIndex; j < argsLength; j++) {
                        varargs.push(/** @type {MixinArg[]} */ (args)[j].value.eval(context));
                    }
                    frame.prependRule(new Declaration(name, new Expression(varargs).eval(context)));
                } else {
                    val = arg && arg.value;
                    if (val) {
                        // This was a mixin call, pass in a detached ruleset of it's eval'd rules
                        if (Array.isArray(val)) {
                            val = /** @type {Node} */ (/** @type {unknown} */ (new DetachedRuleset(new Ruleset(null, /** @type {Node[]} */ (val)))));
                        }
                        else {
                            val = val.eval(context);
                        }
                    } else if (params[i].value) {
                        val = /** @type {Node} */ (params[i].value).eval(mixinEnv);
                        frame.resetCache();
                    } else {
                        throw { type: 'Runtime', message: `wrong number of arguments for ${this.name} (${argsLength} for ${this.arity})` };
                    }

                    frame.prependRule(new Declaration(name, val));
                    evaldArguments[i] = val;
                }
            }

            if (params[i].variadic && args) {
                for (j = argIndex; j < argsLength; j++) {
                    evaldArguments[j] = args[j].value.eval(context);
                }
            }
            argIndex++;
        }

        return frame;
    }

    /** @returns {Ruleset} */
    makeImportant() {
        const rules = !this.rules ? this.rules : this.rules.map(function (/** @type {Node & { makeImportant?: (important?: boolean) => Node }} */ r) {
            if (r.makeImportant) {
                return r.makeImportant(true);
            } else {
                return r;
            }
        });
        const result = new Definition(this.name, this.params, rules, this.condition, this.variadic, this.frames);
        return /** @type {Ruleset} */ (/** @type {unknown} */ (result));
    }

    /**
     * @param {EvalContext} context
     * @returns {Definition}
     */
    eval(context) {
        return new Definition(this.name, this.params, this.rules, this.condition, this.variadic, this.frames || utils.copyArray(context.frames));
    }

    /**
     * @param {EvalContext} context
     * @param {MixinArg[]} args
     * @param {string | undefined} important
     * @returns {Ruleset}
     */
    evalCall(context, args, important) {
        /** @type {Node[]} */
        const _arguments = [];
        const mixinFrames = this.frames ? /** @type {Node[]} */ (this.frames).concat(/** @type {Node[]} */ (context.frames)) : /** @type {Node[]} */ (context.frames);
        const frame = this.evalParams(context, new contexts.Eval(context, mixinFrames), args, _arguments);
        /** @type {Node[]} */
        let rules;
        /** @type {Ruleset} */
        let ruleset;

        frame.prependRule(new Declaration('@arguments', new Expression(_arguments).eval(context)));

        rules = utils.copyArray(this.rules);

        ruleset = new Ruleset(null, rules);
        /** @type {RulesetWithRegistry} */ (ruleset).originalRuleset = this;
        ruleset = /** @type {Ruleset} */ (ruleset.eval(new contexts.Eval(context, /** @type {Node[]} */ ([this, frame]).concat(mixinFrames))));
        if (important) {
            ruleset = /** @type {Ruleset} */ (ruleset.makeImportant());
        }
        return ruleset;
    }

    /**
     * @param {MixinArg[] | null} args
     * @param {EvalContext} context
     * @returns {boolean}
     */
    matchCondition(args, context) {
        if (this.condition && !this.condition.eval(
            new contexts.Eval(context,
                /** @type {Node[]} */ ([this.evalParams(context, /* the parameter variables */
                    new contexts.Eval(context, this.frames ? /** @type {Node[]} */ (this.frames).concat(/** @type {Node[]} */ (context.frames)) : context.frames), args, [])])
                    .concat(/** @type {Node[]} */ (this.frames || [])) // the parent namespace/mixin frames
                    .concat(/** @type {Node[]} */ (context.frames))))) { // the current environment frames
            return false;
        }
        return true;
    }

    /**
     * @param {MixinArg[] | null} args
     * @param {EvalContext} [context]
     * @returns {boolean}
     */
    matchArgs(args, context) {
        const allArgsCnt = (args && args.length) || 0;
        let len;
        const optionalParameters = this.optionalParameters;
        const requiredArgsCnt = !args ? 0 : args.reduce(function (/** @type {number} */ count, /** @type {MixinArg} */ p) {
            if (optionalParameters.indexOf(p.name) < 0) {
                return count + 1;
            } else {
                return count;
            }
        }, 0);

        if (!this.variadic) {
            if (requiredArgsCnt < this.required) {
                return false;
            }
            if (allArgsCnt > this.params.length) {
                return false;
            }
        } else {
            if (requiredArgsCnt < (this.required - 1)) {
                return false;
            }
        }

        // check patterns
        len = Math.min(requiredArgsCnt, this.arity);

        for (let i = 0; i < len; i++) {
            if (!this.params[i].name && !this.params[i].variadic) {
                if (/** @type {MixinArg[]} */ (args)[i].value.eval(context).toCSS(/** @type {EvalContext} */ ({})) != /** @type {Node} */ (this.params[i].value).eval(context).toCSS(/** @type {EvalContext} */ ({}))) {
                    return false;
                }
            }
        }
        return true;
    }
}

export default Definition;
