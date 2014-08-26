module.exports = function(environment) {
    var functions = {
        functionRegistry: require("./function-registry.js"),
        functionCaller: require("./function-caller.js")
    };

    //register functions
    require("./default.js");
    require("./color.js");
    require("./color-blending.js");
    require("./data-uri.js")(environment);
    require("./math.js");
    require("./number.js");
    require("./string.js");
    require("./svg.js")(environment);
    require("./types.js");

    return functions;
};
