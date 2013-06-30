(function (tree) {

tree.RuleGroup = function (name, group){
    this.name = name;
    this.group = group;
};

tree.RuleGroup.prototype = {
    constructor: tree.RuleGroup,
    type: "RuleGroup",
    toCSS: function(env){
        var result = '';
        
        for(var i = 0, imax = this.group.length; i < imax; i++){
            result += this.name  + '-' + this.group[i].toCSS(env);
        }

        return result;
    },
    eval: function (env){
        return new(tree.RuleGroup)(this.name, eval_Group(env, this.group));
    }
};


function eval_Group (env, group) {
    var array = [],
        imax = group.length,
        i = 0;
    for(; i < imax; i++){
        array[i] = group[i].eval(env);
    }
    return array;
}

})(require('../tree'));
