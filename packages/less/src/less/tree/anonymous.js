import Node from './node';
import { extend } from './util';

const Anonymous = function(value, index, currentFileInfo, mapLines, rulesetLike, visibilityInfo) {
    this.value = value;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.mapLines = mapLines;
    this.rulesetLike = (typeof rulesetLike === 'undefined') ? false : rulesetLike;
    this.allowRoot = true;
    this.copyVisibilityInfo(visibilityInfo);
}

Anonymous.prototype = new Node();

Anonymous.prototype.eval = function() {
    return new Anonymous(this.value, this._index, this._fileInfo, this.mapLines, this.rulesetLike, this.visibilityInfo());
};

Anonymous.prototype.compare = function(other) {
    return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
};

Anonymous.prototype.isRulesetLike = function() {
    return this.rulesetLike;
};

Anonymous.prototype.genCSS = function(context, output) {
    this.nodeVisible = Boolean(this.value);
    if (this.nodeVisible) {
        output.add(this.value, this._fileInfo, this._index, this.mapLines);
    }
};

Anonymous.prototype.type = 'Anonymous';
export default Anonymous;
