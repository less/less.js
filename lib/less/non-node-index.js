var less = {
    version: [1, 6, 3]
};

less.tree = (require('./tree'))(less);
less.Parser = (require('./parser'))(less, less.tree);
less.tree.functions = (require('./functions'))(less, less.tree);
require('./env')(less.tree);

require('./colors')(less.tree);
require('./visitor.js')(less.tree);
require('./import-visitor.js')(less.tree);
require('./extend-visitor.js')(less.tree);
require('./join-selector-visitor.js')(less.tree);
require('./to-css-visitor.js')(less.tree);
require('./source-map-output.js')(less.tree);

module.exports = less;
