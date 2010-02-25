node.Quoted = function Quoted(value) { this.value = value };
node.Quoted.prototype = {
    toCSS: function () {
        var css = this.value;
        return css;
    },
    eval: function () {
        return this;
    }
};
