import Ruleset from './ruleset';
import Value from './value';
import Selector from './selector';
import AtRule from './atrule';
import Anonymous from './anonymous';
import Expression from './expression';
import NestableAtRulePrototype from './nested-at-rule';
import * as utils from '../utils';

const Container = function(value, features, index, currentFileInfo, visibilityInfo) {
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

Container.prototype = Object.assign(new AtRule(), {
    type: 'Container',

    ...NestableAtRulePrototype,

    genCSS(context, output) {
        output.add('@container ', this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
    },

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

        this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
        context.frames.unshift(this.rules[0]);
        media.rules = [this.rules[0].eval(context)];
        context.frames.shift();

        context.mediaPath.pop();

        return context.mediaPath.length === 0 ? media.evalTop(context) :
            media.evalNested(context);
    },

    evalNested(context) {
        this.evalFunction();

        let i;
        let value;
        const path = context.mediaPath.concat([this]);

        for (i = 0; i < path.length; i++) {
            if (path[i].type !== this.type) {
                context.mediaBlocks.splice(i, 1);
                return this;
            }

            value = path[i].features instanceof Value ?
                path[i].features.value : path[i].features;
            const fragments = Array.isArray(value) ? value : [value];
            path[i] = fragments;
        }

        this.features = new Value(this.permute(path).map(path => {
            path = path.map(fragment => fragment.toCSS ? fragment : new Anonymous(fragment));

            for (i = path.length - 1; i > 0; i--) {
                path.splice(i, 0, new Anonymous('and'));
            }

            return new Expression(path);
        }));
        this.setParent(this.features, this);

        return new Ruleset([], []);
    },

    permute(arr) {
        if (arr.length === 0) {
            return [];
        } else if (arr.length === 1) {
            return arr[0];
        } else {
            const result = [];
            const rest = this.permute(arr.slice(1));
            for (let i = 0; i < rest.length; i++) {
                for (let j = 0; j < arr[0].length; j++) {
                    result.push([arr[0][j]].concat(rest[i]));
                }
            }
            return result;
        }
    },

    bubbleSelectors(selectors) {
        if (!selectors) {
            return;
        }
        this.rules = [new Ruleset(utils.copyArray(selectors), [this.rules[0]])];
        this.setParent(this.rules, this);
    }
});

export default Container;
