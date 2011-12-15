(function (tree) {

tree.Condition = function (op, l, r, i) {
    this.op = op.trim();
    this.lvalue = l;
    this.rvalue = r;
    this.index = i;
};
tree.Condition.prototype.eval = function (env) {
    var a = this.lvalue.eval(env),
        b = this.rvalue.eval(env);

    var i = this.index;
    
    if (a.compare) {
        switch (a.compare(b)) {
            case -1: return this.op === '<';
            case  0: return this.op === '=';
            case  1: return this.op === '>';
        }
    } else {
        throw { type: "Type",
                message: "Unable to perform comparison",
                index: i };
    }
};

})(require('../tree'));
