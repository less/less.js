var Node = require("./node.js"),
    Ruleset = require("./ruleset.js");

var Directive = function (name, value, rules, index, currentFileInfo, debugInfo) {
    this.name  = name;
    this.value = value;
    if (rules) {
        this.rules = rules;
        this.rules.allowImports = true;
    }
    this.index = index;
    this.currentFileInfo = currentFileInfo;
    this.debugInfo = debugInfo;
};

Directive.prototype = new Node();
Directive.prototype.type = "Directive";
Directive.prototype.accept = function (visitor) {
    var value = this.value, rules = this.rules;
    if (rules) {
        rules = visitor.visit(rules);
    }
    if (value) {
        value = visitor.visit(value);
    }
};
Directive.prototype.isRulesetLike = function() {
    return this.rules || !this.isCharset();
};
Directive.prototype.isCharset = function() {
    return "@charset" === this.name;
};
Directive.prototype.genCSS = function (env, output) {
    var value = this.value, rules = this.rules;
    output.add(this.name, this.currentFileInfo, this.index);
    if (value) {
        output.add(' ');
        value.genCSS(env, output);
    }
    if (rules) {
        this.outputRuleset(env, output, [rules]);
    } else {
        output.add(';');
    }
};
Directive.prototype.eval = function (env) {
    var value = this.value, rules = this.rules;
    if (value) {
        value = value.eval(env);
    }
    if (rules) {
        rules = rules.eval(env);
        rules.root = true;
    }
    return new(Directive)(this.name, value, rules,
        this.index, this.currentFileInfo, this.debugInfo);
};
Directive.prototype.variable = function (name) { if (this.rules) return Ruleset.prototype.variable.call(this.rules, name); };
Directive.prototype.find = function () { if (this.rules) return Ruleset.prototype.find.apply(this.rules, arguments); };
Directive.prototype.rulesets = function () { if (this.rules) return Ruleset.prototype.rulesets.apply(this.rules); };
Directive.prototype.markReferenced = function () {
    var i, rules;
    this.isReferenced = true;
    if (this.rules) {
        rules = this.rules.rules;
        for (i = 0; i < rules.length; i++) {
            if (rules[i].markReferenced) {
                rules[i].markReferenced();
            }
        }
    }
};
Directive.prototype.outputRuleset = function (env, output, rules) {
    var ruleCnt = rules.length, i;
    env.tabLevel = (env.tabLevel | 0) + 1;

    // Compressed
    if (env.compress) {
        output.add('{');
        for (i = 0; i < ruleCnt; i++) {
            rules[i].genCSS(env, output);
        }
        output.add('}');
        env.tabLevel--;
        return;
    }

    // Non-compressed
    var tabSetStr = '\n' + Array(env.tabLevel).join("  "), tabRuleStr = tabSetStr + "  ";
    if (!ruleCnt) {
        output.add(" {" + tabSetStr + '}');
    } else {
        output.add(" {" + tabRuleStr);
        rules[0].genCSS(env, output);
        for (i = 1; i < ruleCnt; i++) {
            output.add(tabRuleStr);
            rules[i].genCSS(env, output);
        }
        output.add(tabSetStr + '}');
    }

    env.tabLevel--;
};
module.exports = Directive;
