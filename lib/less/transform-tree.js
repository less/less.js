var contexts = require("./contexts"),
    visitor = require("./visitors"),
    tree = require("./tree");

module.exports = function(root, options) {
    options = options || {};
    var evaldRoot,
        variables = options.variables,
        evalEnv = new contexts.Eval(options);

    //
    // Allows setting variables with a hash, so:
    //
    //   `{ color: new tree.Color('#f01') }` will become:
    //
    //   new tree.Declaration('@color',
    //     new tree.Value([
    //       new tree.Expression([
    //         new tree.Color('#f01')
    //       ])
    //     ])
    //   )
    //
    if (typeof variables === 'object' && !Array.isArray(variables)) {
        variables = Object.keys(variables).map(function (k) {
            var value = variables[k];

            if (!(value instanceof tree.Value)) {
                if (!(value instanceof tree.Expression)) {
                    value = new tree.Expression([value]);
                }
                value = new tree.Value([value]);
            }
            return new tree.Declaration('@' + k, value, false, null, 0);
        });
        evalEnv.frames = [new tree.Ruleset(null, variables)];
    }

    var visitors = [
            new visitor.JoinSelectorVisitor(),
            new visitor.MarkVisibleSelectorsVisitor(true),
            new visitor.ExtendVisitor(),
            new visitor.ToCSSVisitor({compress: Boolean(options.compress)})
        ], v, visitorIterator;

    // first() / get() allows visitors to be added while visiting
    if (options.pluginManager) {
        visitorIterator = options.pluginManager.visitor();
        visitorIterator.first();
        while ((v = visitorIterator.get())) {
            if (v.isPreEvalVisitor) {
                v.run(root);
            }
        }
    }

    evaldRoot = root.eval(evalEnv);

    for (var i = 0; i < visitors.length; i++) {
        visitors[i].run(evaldRoot);
    }

    if (options.pluginManager) {
        visitorIterator.first();
        while ((v = visitorIterator.get())) {
            if (!v.isPreEvalVisitor) {
                v.run(evaldRoot);
            }
        }
    }

    return evaldRoot;
};
