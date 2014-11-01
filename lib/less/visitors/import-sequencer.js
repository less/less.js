function ImportSequencer(onSequencerEmpty) {
    this.imports = [];
    this.variableImports = [];
    this._onSequencerEmpty = onSequencerEmpty;
}

ImportSequencer.prototype.addImport = function(callback) {
    var importSequencer = this,
        importItem = {
            callback: callback,
            args: null,
            isReady: false
        };
    this.imports.push(importItem);
    return function() {
        importItem.args = Array.prototype.slice.call(arguments, 0);
        importItem.isReady = true;
        importSequencer.tryRun();
    };
};

ImportSequencer.prototype.addVariableImport = function(callback) {
    this.variableImports.push(callback);
};

ImportSequencer.prototype.tryRun = function() {
    while(true) {
        while(this.imports.length > 0) {
            var importItem = this.imports[0];
            if (!importItem.isReady) {
                return;
            }
            this.imports = this.imports.slice(1);
            importItem.callback.apply(null, importItem.args);
        }
        if (this.variableImports.length === 0) {
            break;
        }
        var variableImport = this.variableImports[0];
        this.variableImports = this.variableImports.slice(1);
        variableImport();
    }
    if (this._onSequencerEmpty) {
        this._onSequencerEmpty();
    }
};

module.exports = ImportSequencer;
