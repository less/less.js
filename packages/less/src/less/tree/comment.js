import Node from './node';
import getDebugInfo from './debug-info';

const Comment = function(value, isLineComment, index, currentFileInfo) {
    this.value = value;
    this.isLineComment = isLineComment;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.allowRoot = true;
};

Comment.prototype = new Node();

Comment.prototype.genCSS = function(context, output) {
    if (this.debugInfo) {
        output.add(getDebugInfo(context, this), this.fileInfo(), this.getIndex());
    }
    output.add(this.value);
};

Comment.prototype.isSilent = function(context) {
    const isCompressed = context.compress && this.value[2] !== '!';
    return this.isLineComment || isCompressed;
};

Comment.prototype.type = 'Comment';
export default Comment;
