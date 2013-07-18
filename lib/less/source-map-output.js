(function (tree) {
    tree.sourceMapOutput = function (sourceMapFilename, rootNode) {
        this._css = [];
        this._rootNode = rootNode;
        this._sourceMapFilename = sourceMapFilename;
    };

    tree.sourceMapOutput.prototype.add = function(chunk, node) {
        this._css.push(chunk);
    };

    tree.sourceMapOutput.prototype.toCSS = function(env) {
        this._rootNode.genCSS(env, this);
        return this._css.join('');
    };

})(require('./tree'));