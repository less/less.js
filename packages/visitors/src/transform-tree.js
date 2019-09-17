import contexts from './contexts'
import visitor from './visitors'
import tree from './tree'

export default (root, options = {}) => {
    let evaldRoot
    const evalEnv = new contexts.Eval(options);

    const visitors = [
        new visitor.JoinSelectorVisitor(),
        new visitor.MarkVisibleSelectorsVisitor(true),
        new visitor.ExtendVisitor(),
        new visitor.ToCSSVisitor()
    ];

    const preEvalVisitors = [];
    let v;
    let visitorIterator;

    /**
     * first() / get() allows visitors to be added while visiting
     * 
     * @todo Add scoping for visitors just like functions for @plugin; right now they're global
     */
    if (options.pluginManager) {
        visitorIterator = options.pluginManager.visitor();
        for (var i = 0; i < 2; i++) {
            visitorIterator.first();
            while ((v = visitorIterator.get())) {
                if (v.isPreEvalVisitor) {
                    if (i === 0 || preEvalVisitors.indexOf(v) === -1) {
                        preEvalVisitors.push(v);
                        v.run(root);
                    }
                }
                else {
                    if (i === 0 || visitors.indexOf(v) === -1) {
                        if (v.isPreVisitor) {
                            visitors.unshift(v);
                        }
                        else {
                            visitors.push(v);
                        }
                    }
                }
            }
        }
    }

    evaldRoot = root.eval(evalEnv);

    for (var i = 0; i < visitors.length; i++) {
        visitors[i].run(evaldRoot);
    }

    // Run any remaining visitors added after eval pass
    if (options.pluginManager) {
        visitorIterator.first();
        while ((v = visitorIterator.get())) {
            if (visitors.indexOf(v) === -1 && preEvalVisitors.indexOf(v) === -1) {
                v.run(evaldRoot);
            }
        }
    }

    return evaldRoot;
};
