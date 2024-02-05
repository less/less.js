import Ruleset from './ruleset';
import Selector from './selector';
import AtRule from './atrule';
import NestableAtRulePrototype from './nested-at-rule';

/**
 * @todo - It still feels like there's too much duplication
 * between Layer / Container / Media
 */
const Layer = function(value, features, index, currentFileInfo, visibilityInfo) {
    this._index = index;
    this._fileInfo = currentFileInfo;

    const selectors = (new Selector([], null, null, this._index, this._fileInfo)).createEmptySelectors();

    this.features = features;
    this.rules = [new Ruleset(selectors, value)];
    this.rules[0].allowImports = true;
    this.copyVisibilityInfo(visibilityInfo);
    this.allowRoot = true;
    this.setParent(selectors, this);
    this.setParent(this.features, this);
    this.setParent(this.rules, this);
};

Layer.prototype = Object.assign(new AtRule(), {
    type: 'Layer',

    ...NestableAtRulePrototype,

    genCSS(context, output) {
        if (this.features) {
            output.add('@layer ', this._fileInfo, this._index);
            this.features.genCSS(context, output);
        } else {
            output.add('@layer', this._fileInfo, this._index);
        }
        this.outputRuleset(context, output, this.rules);
    },

    eval(context) {
        const layer = new Layer(null, [], this._index, this._fileInfo, this.visibilityInfo());
        layer.features = this.features?.eval(context);

        this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
        context.frames.unshift(this.rules[0]);
        layer.rules = [this.rules[0].eval(context)];
        context.frames.shift();

        return layer;
    }
});

export default Layer;
