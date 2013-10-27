(function (tree) {

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
        ('file://' + ctx.debugInfo.fileName).replace(/([.:/\\])/g, function (a) {
            if (a == '\\') {
                a = '\/';
            }
            return '\\' + a;
        }) +
        '}line{font-family:\\00003' + ctx.debugInfo.lineNumber + '}}\n';
};

tree.find = function (obj, fun) {
    for (var i = 0, r; i < obj.length; i++) {
        if (r = fun.call(obj, obj[i])) { return r; }
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
    output.add((env.compress ? '{' : ' {\n'));
    env.tabLevel = (env.tabLevel || 0) + 1;
    var tabRuleStr = env.compress ? '' : Array(env.tabLevel + 1).join("  "),
        tabSetStr = env.compress ? '' : Array(env.tabLevel).join("  ");
    for(var i = 0; i < rules.length; i++) {
        output.add(tabRuleStr);
        rules[i].genCSS(env, output);
        output.add(env.compress ? '' : '\n');
    }
    env.tabLevel--;
    output.add(tabSetStr + "}");
};

})(require('./tree'));
