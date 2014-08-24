var Selector = require("./selector.js"),
    Element = require("./element.js"),
    Ruleset = require("./ruleset.js"),
    Rule = require("./rule.js"),
    Expression = require("./expression.js"),
    contexts = require("../contexts.js");

var Definition = function (name, params, rules, condition, variadic, frames) {
    this.name = name;
    this.selectors = [new(Selector)([new(Element)(null, name, this.index, this.currentFileInfo)])];
    this.params = params;
    this.condition = condition;
    this.variadic = variadic;
    this.arity = params.length;
    this.rules = rules;
    this._lookups = {};
    this.required = params.reduce(function (count, p) {
        if (!p.name || (p.name && !p.value)) { return count + 1; }
        else                                 { return count; }
    }, 0);
    this.frames = frames;
};
Definition.prototype = new Ruleset();
Definition.prototype.type = "MixinDefinition";
Definition.prototype.evalFirst = true;
Definition.prototype.accept = function (visitor) {
    if (this.params && this.params.length) {
        this.params = visitor.visitArray(this.params);
    }
    this.rules = visitor.visitArray(this.rules);
    if (this.condition) {
        this.condition = visitor.visit(this.condition);
    }
};
Definition.prototype.evalParams = function (env, mixinEnv, args, evaldArguments) {
    /*jshint boss:true */
    var frame = new(Ruleset)(null, null),
        varargs, arg,
        params = this.params.slice(0),
        i, j, val, name, isNamedFound, argIndex, argsLength = 0;

    mixinEnv = new contexts.evalEnv(mixinEnv, [frame].concat(mixinEnv.frames));

    if (args) {
        args = args.slice(0);
        argsLength = args.length;

        for(i = 0; i < argsLength; i++) {
            arg = args[i];
            if (name = (arg && arg.name)) {
                isNamedFound = false;
                for(j = 0; j < params.length; j++) {
                    if (!evaldArguments[j] && name === params[j].name) {
                        evaldArguments[j] = arg.value.eval(env);
                        frame.prependRule(new(Rule)(name, arg.value.eval(env)));
                        isNamedFound = true;
                        break;
                    }
                }
                if (isNamedFound) {
                    args.splice(i, 1);
                    i--;
                    continue;
                } else {
                    throw { type: 'Runtime', message: "Named argument for " + this.name +
                        ' ' + args[i].name + ' not found' };
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
                    varargs.push(args[j].value.eval(env));
                }
                frame.prependRule(new(Rule)(name, new(Expression)(varargs).eval(env)));
            } else {
                val = arg && arg.value;
                if (val) {
                    val = val.eval(env);
                } else if (params[i].value) {
                    val = params[i].value.eval(mixinEnv);
                    frame.resetCache();
                } else {
                    throw { type: 'Runtime', message: "wrong number of arguments for " + this.name +
                        ' (' + argsLength + ' for ' + this.arity + ')' };
                }

                frame.prependRule(new(Rule)(name, val));
                evaldArguments[i] = val;
            }
        }

        if (params[i].variadic && args) {
            for (j = argIndex; j < argsLength; j++) {
                evaldArguments[j] = args[j].value.eval(env);
            }
        }
        argIndex++;
    }

    return frame;
};
Definition.prototype.eval = function (env) {
    return new Definition(this.name, this.params, this.rules, this.condition, this.variadic, this.frames || env.frames.slice(0));
};
Definition.prototype.evalCall = function (env, args, important) {
    var _arguments = [],
        mixinFrames = this.frames ? this.frames.concat(env.frames) : env.frames,
        frame = this.evalParams(env, new(contexts.evalEnv)(env, mixinFrames), args, _arguments),
        rules, ruleset;

    frame.prependRule(new(Rule)('@arguments', new(Expression)(_arguments).eval(env)));

    rules = this.rules.slice(0);

    ruleset = new(Ruleset)(null, rules);
    ruleset.originalRuleset = this;
    ruleset = ruleset.eval(new(contexts.evalEnv)(env, [this, frame].concat(mixinFrames)));
    if (important) {
        ruleset = this.makeImportant.apply(ruleset);
    }
    return ruleset;
};
Definition.prototype.matchCondition = function (args, env) {
    if (this.condition && !this.condition.eval(
        new(contexts.evalEnv)(env,
            [this.evalParams(env, new(contexts.evalEnv)(env, this.frames ? this.frames.concat(env.frames) : env.frames), args, [])] // the parameter variables
                .concat(this.frames) // the parent namespace/mixin frames
                .concat(env.frames)))) { // the current environment frames
        return false;
    }
    return true;
};
Definition.prototype.matchArgs = function (args, env) {
    var argsLength = (args && args.length) || 0, len;

    if (! this.variadic) {
        if (argsLength < this.required)                               { return false; }
        if (argsLength > this.params.length)                          { return false; }
    } else {
        if (argsLength < (this.required - 1))                         { return false; }
    }

    len = Math.min(argsLength, this.arity);

    for (var i = 0; i < len; i++) {
        if (!this.params[i].name && !this.params[i].variadic) {
            if (args[i].value.eval(env).toCSS() != this.params[i].value.eval(env).toCSS()) {
                return false;
            }
        }
    }
    return true;
};
module.exports = Definition;
