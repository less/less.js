var contexts = require("./contexts.js"),
    visitor = require("./visitor/index.js"),
    tree = require("./tree/index.js");

module.exports = function(root, options) {
    options = options || {};
    var evaldRoot,
        variables = options.variables,
        evalEnv = new contexts.evalEnv(options);

    //
    // Allows setting variables with a hash, so:
    //
    //   `{ color: new(tree.Color)('#f01') }` will become:
    //
    //   new(tree.Rule)('@color',
    //     new(tree.Value)([
    //       new(tree.Expression)([
    //         new(tree.Color)('#f01')
    //       ])
    //     ])
    //   )
    //
    if (typeof(variables) === 'object' && !Array.isArray(variables)) {
        variables = Object.keys(variables).map(function (k) {
            var value = variables[k];

            if (! (value instanceof tree.Value)) {
                if (! (value instanceof tree.Expression)) {
                    value = new(tree.Expression)([value]);
                }
                value = new(tree.Value)([value]);
            }
            return new(tree.Rule)('@' + k, value, false, null, 0);
        });
        evalEnv.frames = [new(tree.Ruleset)(null, variables)];
    }

    var preEvalVisitors = [],
        visitors = [
            new(visitor.JoinSelectorVisitor)(),
            new(visitor.ExtendVisitor)(),
            new(visitor.ToCSSVisitor)({compress: Boolean(options.compress)})
        ], i;

    if (options.plugins) {
        for(i =0; i < options.plugins.length; i++) {
            if (options.plugins[i].isPreEvalVisitor) {
                preEvalVisitors.push(options.plugins[i]);
            } else {
                if (options.plugins[i].isPreVisitor) {
                    visitors.splice(0, 0, options.plugins[i]);
                } else {
                    visitors.push(options.plugins[i]);
                }
            }
        }
    }

    for(i = 0; i < preEvalVisitors.length; i++) {
        preEvalVisitors[i].run(root);
    }

    evaldRoot = root.eval(evalEnv);

    for(i = 0; i < visitors.length; i++) {
        visitors[i].run(evaldRoot);
    }

    return evaldRoot;
};
