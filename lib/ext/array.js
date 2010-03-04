Array.prototype.find = function (fun) {
    for (var i = 0, r; i < this.length; i++) {
        if (r = fun.call(this, this[i])) { return r }
    }
    return null;
};
