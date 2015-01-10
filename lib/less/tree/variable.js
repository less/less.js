var Node = require("./node");

var Variable = function (name, index, currentFileInfo) {
    this.name = name;
    this.index = index;
    this.currentFileInfo = currentFileInfo || {};
};
Variable.prototype = new Node();
Variable.prototype.type = "Variable";
Variable.prototype.eval = function (context,variablevariable) {
    var variable, name = this.name;
    variablevariable !== 'undefined' ? true : false;
    
    if (name.indexOf('@@') === 0) {
        name = '@' + new Variable(name.slice(1), this.index, this.currentFileInfo).eval(context,true).value;
    }

    if (this.evaluating) {
        throw { type: 'Name',
                message: "Recursive variable definition for " + name,
                filename: this.currentFileInfo.filename,
                index: this.index };
    }

    this.evaluating = true;

    variable = this.find(context.frames, function (frame) {
        var v = frame.variable(name);
        if (v) {
            if (v.important) {
                var importantScope = context.importantScope[context.importantScope.length-1];
                importantScope.important = v.important;
            }
            if(variablevariable && v.value.keyword && v.value.rgb){
		    //v.value.value = v.value.keyword;
		    throw { type: 'Name',
                message: "the name of a variable should be a string not a color(" + v.value.keyword + ")",
                filename: v.currentFileInfo.filename,
                index: v.index };
		    } 
            return v.value.eval(context);
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
