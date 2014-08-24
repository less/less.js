var less = {
    version: [1, 6, 3],
    data: require('./data/index.js')
};

less.tree = require('./tree/index.js');
less.visitor = require('./visitor/index.js');
less.Parser = (require('./parser/parser.js'))(less);
less.functions = require('./functions/index.js')(less);
less.contexts = require("./contexts.js");

less.SourceMapOutput = require('./source-map-output.js')(less);

module.exports = less;
