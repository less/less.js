var less = {
    version: [1, 6, 3],
    data: {
        colors: require('./data/colors')
    }
};

less.tree = (require('./tree'))(less, less.data);
less.visitor = require('./visitor/index.js')(less, less.tree);
less.Parser = (require('./parser'))(less, less.tree, less.visitor);
less.functions = (require('./functions/index.js'))(less, less.tree);
require('./env')(less.tree);

less.tree.sourceMapOutput = require('./source-map-output.js')(less);

module.exports = less;
