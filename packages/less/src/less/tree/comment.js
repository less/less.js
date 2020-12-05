import Node from './node';
import getDebugInfo from './debug-info';

const Comment = function(value, isLineComment, index, currentFileInfo) {
    this.value = value;
    this.isLineComment = isLineComment;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.allowRoot = true;
}

Comment.prototype = Object.assign(new Node(), {
    type: 'Comment',

    genCSS(context, output) {
        if (this.debugInfo) {
            output.add(getDebugInfo(context, this), this.fileInfo(), this.getIndex());
        }
        output.add(this.value);
    },

    isSilent(context) {
        const isCompressed = context.compress && this.value[2] !== '!';
        return this.isLineComment || isCompressed;
    }
});

export default Comment;
