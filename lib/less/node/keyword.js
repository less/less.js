
node.Keyword = function Keyword(value) { this.value = value };
node.Keyword.prototype.toCSS = function () {
    return this.value;
};
