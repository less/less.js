import Ruleset from './ruleset.js';
import Value from './value.js';
import Selector from './selector.js';
import AtRule from './atrule.js';
import NestableAtRulePrototype from './nested-at-rule.js';

class Container extends AtRule {
    get type() { return 'Container'; }

    constructor(value, features, index, currentFileInfo, visibilityInfo) {
        super();
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
    }

    genCSS(context, output) {
        output.add('@container ', this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
    }

    eval(context) {
        if (this._evaluated) {
            return this;
        }
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }

        const media = new Container(null, [], this._index, this._fileInfo, this.visibilityInfo());
        media._evaluated = true;
        if (this.debugInfo) {
            this.rules[0].debugInfo = this.debugInfo;
            media.debugInfo = this.debugInfo;
        }

        media.features = this.features.eval(context);

        context.mediaPath.push(media);
        context.mediaBlocks.push(media);

        const fr = context.frames[0].functionRegistry;
        if (fr) {
            this.rules[0].functionRegistry = fr.inherit();
        }
        context.frames.unshift(this.rules[0]);
        media.rules = [this.rules[0].eval(context)];
        context.frames.shift();

        context.mediaPath.pop();

        return context.mediaPath.length === 0 ? media.evalTop(context) :
            media.evalNested(context);
    }
}

// Apply NestableAtRulePrototype methods (accept, isRulesetLike override AtRule's versions)
Object.assign(Container.prototype, NestableAtRulePrototype);

export default Container;
