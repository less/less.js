import Expression from '../tree/expression';

class functionCaller {
    constructor(name, context, index, currentFileInfo) {
        this.name = name.toLowerCase();
        this.index = index;
        this.context = context;
        this.currentFileInfo = currentFileInfo;

        this.func = context.frames[0].functionRegistry.get(this.name);
    }

    isValid() {
        return Boolean(this.func);
    }

    call(args) {
        if (!(Array.isArray(args))) {
            args = [args];
        }
        const evalArgs = this.func.evalArgs;
        if (evalArgs !== false) {
            args = args.map(a => a.eval(this.context));
        }
        const commentFilter = item => !(item.type === 'Comment');

        // This code is terrible and should be replaced as per this issue...
        // https://github.com/less/less.js/issues/2477
        args = args
            .filter(commentFilter)
            .map(item => {
                if (item.type === 'Expression') {
                    const subNodes = item.value.filter(commentFilter);
                    if (subNodes.length === 1) {
                        // https://github.com/less/less.js/issues/3616
                        if (item.parens && subNodes[0].op === '/') {
                            return item;
                        }
                        return subNodes[0];
                    } else {
                        return new Expression(subNodes);
                    }
                }
                return item;
            });

        if (evalArgs === false) {
            return this.func(this.context, ...args);
        }

        return this.func(...args);
    }
}

export default functionCaller;
