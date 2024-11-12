import Node from './node';

class ApplyRule extends Node {
    constructor(selector, index, currentFileInfo) {
        super();
        this.selector = selector;
        this._index = index;
        this._fileInfo = currentFileInfo;
    }

    accept(visitor) {
        this.selector = visitor.visit(this.selector);
    }

    eval(context) {
        const mixinName = this.selector.toCSS(context).substring(1); // Remove the dot
        const mixin = context.frames.find(frame => frame[mixinName]);
        
        if (!mixin || !mixin[mixinName]) {
            throw { 
                type: 'Name',
                message: `The mixin "${mixinName}" was not found`,
                filename: this.fileInfo.filename,
                index: this.index
            };
        }

        return mixin[mixinName].eval(context);
    }
}

export default ApplyRule;
