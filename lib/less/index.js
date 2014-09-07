module.exports = function(environment) {
    var less = {
        version: [2, 0, 0],
        data: require('./data'),
        tree: require('./tree'),
        visitor: require('./visitor'),
        Parser: require('./parser/parser'),
        functions: require('./functions')(environment),
        contexts: require("./contexts"),
        environment: environment,
        render: require("./render")(environment)
    };

    return less;
};
