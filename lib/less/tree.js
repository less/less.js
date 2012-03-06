(function (tree) {

tree.find = function (obj, fun) {
    for (var i = 0, l = obj.length, r; i < l;) 
        if (r = fun.call(obj, obj[i++])) return r;

    return null;
};
tree.jsify = function (obj) {
    if (Array.isArray(obj.value) && obj.value.length > 1)
        return '[' + obj.value.map(function (v) { return v.toCSS(false) }).join(', ') + ']';
    else
        return obj.toCSS(false);
};

})(require('./tree'));
