module.exports = function(environment) {
    var less = {
        version: [2, 0, 0],
        data: require('./data/index.js'),
        tree: require('./tree/index.js'),
        visitor: require('./visitor/index.js'),
        Parser: require('./parser/parser.js')(environment),
        functions: require('./functions/index.js')(environment),
        contexts: require("./contexts.js"),
        environment: environment
    };
    less.render = require("./render.js")(less.Parser);

    return less;
};