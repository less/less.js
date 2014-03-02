var less = {
    version: [1, 6, 3],
    data: {
        colors: require('./data/colors')
    }
};

less.tree = (require('./tree'))(less);
less.Parser = (require('./parser'))(less, less.tree);
less.tree.functions = (require('./functions'))(less, less.tree);
require('./env')(less.tree);

less.tree.visitor = require('./visitor.js')(less.tree);
less.tree.importVisitor = require('./import-visitor.js')(less.tree);
less.tree.extendVisitor = require('./extend-visitor.js')(less.tree);
less.tree.joinSelectorVisitor = require('./join-selector-visitor.js')(less.tree.visitor);
less.tree.toCSSVisitor = require('./to-css-visitor.js')(less.tree);

less.tree.sourceMapOutput = require('./source-map-output.js')(less);

module.exports = less;
