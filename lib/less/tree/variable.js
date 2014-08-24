var Node = require("./node.js");

var Variable = function (name, index, currentFileInfo) {
    this.name = name;
    this.index = index;
    this.currentFileInfo = currentFileInfo || {};
};
Variable.prototype = new Node();
Variable.prototype.type = "Variable";
Variable.prototype.eval = function (env) {
    var variable, name = this.name;

    if (name.indexOf('@@') === 0) {
        name = '@' + new(Variable)(name.slice(1)).eval(env).value;
    }

    if (this.evaluating) {
        throw { type: 'Name',
                message: "Recursive variable definition for " + name,
                filename: this.currentFileInfo.file,
                index: this.index };
    }

    this.evaluating = true;

    variable = this.find(env.frames, function (frame) {
        var v = frame.variable(name);
        if (v) {
            return v.value.eval(env);
        }
    });
    if (variable) {
        this.evaluating = false;
        return variable;
    } else {
        throw { type: 'Name',
                message: "variable " + name + " is undefined",
                filename: this.currentFileInfo.filename,
                index: this.index };
    }
};
Variable.prototype.find = function (obj, fun) {
    for (var i = 0, r; i < obj.length; i++) {
        r = fun.call(obj, obj[i]);
        if (r) { return r; }
    }
    return null;
};
module.exports = Variable;
