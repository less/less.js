(function (tree) {

tree.Quoted = function (str, content, escaped) {
    this.escaped = escaped;
    this.value = content || '';
    this.quote = str.charAt(0);
};
tree.Quoted.prototype = {
    toCSS: function () {
        if (this.escaped) {
            return this.value;
        } else {
            return this.quote + this.value + this.quote;
        }
    },
    eval: function (env) {
        this.value = this.value.replace(/@\{([\w-]+)\}/g, function (_, name) {
            return new(tree.Variable)('@' + name).eval(env).value;
        });
        return this;
    }
};

})(require('less/tree'));
