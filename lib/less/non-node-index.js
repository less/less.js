var less = {
    version: [1, 6, 3],
    data: require('./data/index.js')
};

less.tree = require('./tree/index.js');
less.visitor = require('./visitor/index.js')(less, less.tree);
less.Parser = (require('./parser'))(less, less.tree, less.visitor);
less.functions = (require('./functions/index.js'))(less, less.tree);
less.contexts = require("./env.js");

less.tree.sourceMapOutput = require('./source-map-output.js')(less);

module.exports = less;
