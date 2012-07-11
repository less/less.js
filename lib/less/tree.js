(function (tree) {

tree.isArray = Array.isArray ? Array.isArray : function(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]" ||
           (obj instanceof Array);
};
tree.forEach = Array.prototype.forEach ? Array.prototype.forEach : function(block, thisObject) {
    var len = this.length >>> 0;
    for (var i = 0; i < len; i++) {
        if (i in this) {
            block.call(thisObject, this[i], i, this);
        }
    }
};
tree.map = Array.prototype.map ? Array.prototype.map : function(fun /*, thisp*/) {
    var len = this.length >>> 0;
    var res = new Array(len);
    var thisp = arguments[1];

    for (var i = 0; i < len; i++) {
        if (i in this) {
            res[i] = fun.call(thisp, this[i], i, this);
        }
    }
    return res;
};
tree.filter = Array.prototype.filter ? Array.prototype.filter : function (block /*, thisp */) {
    var values = [];
    var thisp = arguments[1];
    for (var i = 0; i < this.length; i++) {
        if (block.call(thisp, this[i])) {
            values.push(this[i]);
        }
    }
    return values;
};
tree.reduce = Array.prototype.reduce ? Array.prototype.reduce : function(fun /*, initial*/) {
    var len = this.length >>> 0;
    var i = 0;

    // no value to return if no initial value and an empty array
    if (len === 0 && arguments.length === 1) throw new TypeError();

    if (arguments.length >= 2) {
        var rv = arguments[1];
    } else {
        do {
            if (i in this) {
                rv = this[i++];
                break;
            }
            // if array contains no values, no initial value to return
            if (++i >= len) throw new TypeError();
        } while (true);
    }
    for (; i < len; i++) {
        if (i in this) {
            rv = fun.call(null, rv, this[i], i, this);
        }
    }
    return rv;
};
tree.indexOf = Array.prototype.indexOf ? Array.prototype.indexOf : function (value /*, fromIndex */ ) {
    var length = this.length;
    var i = arguments[1] ? arguments[1] : 0;

    if (!length)     return -1;
    if (i >= length) return -1;
    if (i < 0)       i += length;

    for (; i < length; i++) {
        if (!Object.prototype.hasOwnProperty.call(this, i)) { continue }
        if (value === this[i]) return i;
    }
    return -1;
};
tree.keys = Object.keys ? Object.keys : function (object) {
    var keys = [];
    for (var name in object) {
        if (Object.prototype.hasOwnProperty.call(object, name)) {
            keys.push(name);
        }
    }
    return keys;
};
tree.trim = String.prototype.trim ? String.prototype.trim : function () {
    return String(this).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

tree.find = function (obj, fun) {
    for (var i = 0, r; i < obj.length; i++) {
        if (r = fun.call(obj, obj[i])) { return r }
    }
    return null;
};
tree.jsify = function (obj) {
    if (tree.isArray(obj.value) && (obj.value.length > 1)) {
        return '[' + tree.map.call(obj.value, function (v) { return v.toCSS(false) }).join(', ') + ']';
    } else {
        return obj.toCSS(false);
    }
};

})(require('./tree'));
