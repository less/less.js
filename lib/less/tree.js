module.exports = function (less) {

var tree = {};
  
tree.debugInfo = function(env, ctx, lineSeperator) {
    var result="";
    if (env.dumpLineNumbers && !env.compress) {
        switch(env.dumpLineNumbers) {
            case 'comments':
                result = tree.debugInfo.asComment(ctx);
                break;
            case 'mediaquery':
                result = tree.debugInfo.asMediaQuery(ctx);
                break;
            case 'all':
                result = tree.debugInfo.asComment(ctx) + (lineSeperator || "") + tree.debugInfo.asMediaQuery(ctx);
                break;
        }
    }
    return result;
};

tree.debugInfo.asComment = function(ctx) {
    return '/* line ' + ctx.debugInfo.lineNumber + ', ' + ctx.debugInfo.fileName + ' */\n';
};

tree.debugInfo.asMediaQuery = function(ctx) {
    return '@media -sass-debug-info{filename{font-family:' +
        ('file://' + ctx.debugInfo.fileName).replace(/([.:\/\\])/g, function (a) {
            if (a == '\\') {
                a = '\/';
            }
            return '\\' + a;
        }) +
        '}line{font-family:\\00003' + ctx.debugInfo.lineNumber + '}}\n';
};

tree.find = function (obj, fun) {
    for (var i = 0, r; i < obj.length; i++) {
        r = fun.call(obj, obj[i]);
        if (r) { return r; }
    }
    return null;
};

tree.jsify = function (obj) {
    if (Array.isArray(obj.value) && (obj.value.length > 1)) {
        return '[' + obj.value.map(function (v) { return v.toCSS(false); }).join(', ') + ']';
    } else {
        return obj.toCSS(false);
    }
};

tree.toCSS = function (env) {
    var strs = [];
    this.genCSS(env, {
        add: function(chunk, fileInfo, index) {
            strs.push(chunk);
        },
        isEmpty: function () {
            return strs.length === 0;
        }
    });
    return strs.join('');
};

tree.outputRuleset = function (env, output, rules) {
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

tree.Alpha = require('./tree/alpha')(tree);
tree.Color = require('./tree/color')(less.data, tree);
tree.Directive = require('./tree/directive')(tree);
tree.DetachedRuleset = require('./tree/detached-ruleset')(tree);
tree.Operation = require('./tree/operation')(tree);
tree.Dimension = require('./tree/dimension')(tree, require('./tree/unit-conversions')); //todo move conversions
tree.Unit = require('./tree/unit')(tree, require('./tree/unit-conversions'));
tree.Keyword = require('./tree/keyword')(tree);
tree.Variable = require('./tree/variable')(tree);
tree.Ruleset = require('./tree/ruleset')(tree);
tree.Element = require('./tree/element')(tree);
tree.Attribute = require('./tree/attribute')(tree);
tree.Combinator = require('./tree/combinator')(tree);
tree.Selector = require('./tree/selector')(tree);
tree.Quoted = require('./tree/quoted')(tree);
tree.Expression = require('./tree/expression')(tree);
tree.Rule = require('./tree/rule')(tree);
tree.Call = require('./tree/call')(tree);
tree.URL = require('./tree/url')(tree);
tree.Import = require('./tree/import')(tree);
tree.mixin = {
    Call: require('./tree/mixin-call')(tree),
    Definition: require('./tree/mixin-definition')(tree)
};
tree.Comment = require('./tree/comment')(tree);
tree.Anonymous = require('./tree/anonymous')(tree);
tree.Value = require('./tree/value')(tree);
tree.JavaScript = require('./tree/javascript')(tree);
tree.Assignment = require('./tree/assignment')(tree);
tree.Condition = require('./tree/condition')(tree);
tree.Paren = require('./tree/paren')(tree);
tree.Media = require('./tree/media')(tree);
tree.UnicodeDescriptor = require('./tree/unicode-descriptor')(tree);
tree.Negative = require('./tree/negative')(tree);
tree.Extend = require('./tree/extend')(tree);
tree.RulesetCall = require('./tree/ruleset-call')(tree);    

return tree;

};