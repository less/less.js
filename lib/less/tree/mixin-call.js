module.exports = function (tree) {

var Call = function (elements, args, index, currentFileInfo, important) {
    this.selector = new(tree.Selector)(elements);
    this.arguments = (args && args.length) ? args : null;
    this.index = index;
    this.currentFileInfo = currentFileInfo;
    this.important = important;
};
Call.prototype = {
    type: "MixinCall",
    accept: function (visitor) {
        if (this.selector) {
            this.selector = visitor.visit(this.selector);
        }
        if (this.arguments) {
            this.arguments = visitor.visitArray(this.arguments);
        }
    },
    eval: function (env) {
        var mixins, mixin, args, rules = [], match = false, i, m, f, isRecursive, isOneFound, rule,
            candidates = [], candidate, conditionResult = [], defaultFunc = tree.defaultFunc,
            defaultResult, defNone = 0, defTrue = 1, defFalse = 2, count, originalRuleset;

        args = this.arguments && this.arguments.map(function (a) {
            return { name: a.name, value: a.value.eval(env) };
        });

        for (i = 0; i < env.frames.length; i++) {
            if ((mixins = env.frames[i].find(this.selector)).length > 0) {
                isOneFound = true;

                // To make `default()` function independent of definition order we have two "subpasses" here.
                // At first we evaluate each guard *twice* (with `default() == true` and `default() == false`),
                // and build candidate list with corresponding flags. Then, when we know all possible matches,
                // we make a final decision.

                for (m = 0; m < mixins.length; m++) {
                    mixin = mixins[m];
                    isRecursive = false;
                    for(f = 0; f < env.frames.length; f++) {
                        if ((!(mixin instanceof tree.mixin.Definition)) && mixin === (env.frames[f].originalRuleset || env.frames[f])) {
                            isRecursive = true;
                            break;
                        }
                    }
                    if (isRecursive) {
                        continue;
                    }

                    if (mixin.matchArgs(args, env)) {
                        candidate = {mixin: mixin, group: defNone};

                        if (mixin.matchCondition) {
                            for (f = 0; f < 2; f++) {
                                defaultFunc.value(f);
                                conditionResult[f] = mixin.matchCondition(args, env);
                            }
                            if (conditionResult[0] || conditionResult[1]) {
                                if (conditionResult[0] != conditionResult[1]) {
                                    candidate.group = conditionResult[1] ?
                                        defTrue : defFalse;
                                }

                                candidates.push(candidate);
                            }
                        }
                        else {
                            candidates.push(candidate);
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
                            message: 'Ambiguous use of `default()` found when matching for `'
                                + this.format(args) + '`',
                            index: this.index, filename: this.currentFileInfo.filename };
                    }
                }

                for (m = 0; m < candidates.length; m++) {
                    candidate = candidates[m].group;
                    if ((candidate === defNone) || (candidate === defaultResult)) {
                        try {
                            mixin = candidates[m].mixin;
                            if (!(mixin instanceof tree.mixin.Definition)) {
                                originalRuleset = mixin.originalRuleset || mixin;
                                mixin = new tree.mixin.Definition("", [], mixin.rules, null, false);
                                mixin.originalRuleset = originalRuleset;
                            }
                            Array.prototype.push.apply(
                                  rules, mixin.evalCall(env, args, this.important).rules);
                        } catch (e) {
                            throw { message: e.message, index: this.index, filename: this.currentFileInfo.filename, stack: e.stack };
                        }
                    }
                }

                if (match) {
                    if (!this.currentFileInfo || !this.currentFileInfo.reference) {
                        for (i = 0; i < rules.length; i++) {
                            rule = rules[i];
                            if (rule.markReferenced) {
                                rule.markReferenced();
                            }
                        }
                    }
                    return rules;
                }
            }
        }
        if (isOneFound) {
            throw { type:    'Runtime',
                    message: 'No matching definition was found for `' + this.format(args) + '`',
                    index:   this.index, filename: this.currentFileInfo.filename };
        } else {
            throw { type:    'Name',
                    message: this.selector.toCSS().trim() + " is undefined",
                    index:   this.index, filename: this.currentFileInfo.filename };
        }
    },
    format: function (args) {
        return this.selector.toCSS().trim() + '(' +
            (args ? args.map(function (a) {
                var argValue = "";
                if (a.name) {
                    argValue += a.name + ":";
                }
                if (a.value.toCSS) {
                    argValue += a.value.toCSS();
                } else {
                    argValue += "???";
                }
                return argValue;
            }).join(', ') : "") + ")";
    }
};
return Call;
};
