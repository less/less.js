import Ruleset from './ruleset';
import Value from './value';
import Selector from './selector';
import AtRule from './atrule';
import NestableAtRulePrototype from './nested-at-rule';

const Media = function(value, features, index, currentFileInfo, visibilityInfo) {
    this._index = index;
    this._fileInfo = currentFileInfo;

    const selectors = (new Selector([], null, null, this._index, this._fileInfo)).createEmptySelectors();

    this.features = new Value(features);
    this.rules = [new Ruleset(selectors, value)];
    this.rules[0].allowImports = true;
    this.copyVisibilityInfo(visibilityInfo);
    this.allowRoot = true;
    this.setParent(selectors, this);
    this.setParent(this.features, this);
    this.setParent(this.rules, this);
};

Media.prototype = Object.assign(new AtRule(), {
    type: 'Media',

    ...NestableAtRulePrototype,

    genCSS(context, output) {
        output.add('@media ', this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
    },

    eval(context) {
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }

        const media = new Media(null, [], this._index, this._fileInfo, this.visibilityInfo());
        if (this.debugInfo) {
            this.rules[0].debugInfo = this.debugInfo;
            media.debugInfo = this.debugInfo;
        }
        
        media.features = this.features.eval(context);

        context.mediaPath.push(media);
        context.mediaBlocks.push(media);

        this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
        context.frames.unshift(this.rules[0]);
        media.rules = [this.rules[0].eval(context)];
        context.frames.shift();

        context.mediaPath.pop();

        return context.mediaPath.length === 0 ? media.evalTop(context) :
            media.evalNested(context);
    }
});

export default Media;
