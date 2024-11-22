import Ruleset from './ruleset';
import Value from './value';
import Selector from './selector';
import AtRule from './atrule';
import NestableAtRulePrototype from './nested-at-rule';
import Anonymous from './anonymous';
import Expression from './expression';

const Scope = function (value, features, index, currentFileInfo, visibilityInfo) {
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

Scope.prototype = Object.assign(new AtRule(), {
    type: 'Scope',

    ...NestableAtRulePrototype,

    accept: function (visitor) {
        if (this.features) {
            this.features = visitor.visit(this.features, { preserve: true });
        }
        if (this.rules) {
            this.rules = visitor.visitArray(this.rules, undefined, { preserve: true });
        }
    },

    genCSS(context, output) {
        if (this.rules && (Array.isArray(this.rules) && this.rules.length > 0) || (Array.isArray(this.rules[0]) && this.rules[0].length > 0)) {
            output.add('@scope ', this._fileInfo, this._index);
            this.features.genCSS(context, output);
            this.outputRuleset(context, output, this.rules);
        }
    },

    eval(context) {
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }

        const media = new Scope(null, [], this._index, this._fileInfo, this.visibilityInfo());
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

    getNestedElementValue(pathNode) {
        let tmp = pathNode.value.trim();

        if (tmp.startsWith('(')) {
            tmp = tmp.substring(1);
        }
        if (tmp.endsWith(')')) {
            tmp = tmp.substring(0, tmp.length - 1);
        }
        if (tmp.startsWith(':scope')) {
            tmp = tmp.substring(6).trim();
        }

        return tmp;
    },

    evalNested(context) {
        let i, n;
        let value;
        let path = context.mediaPath.concat([this]);

        // Extract the media-query conditions separated with `,` (OR).
        for (i = 0; i < path.length; i++) {
            value = path[i].features instanceof Value ?
                path[i].features.value : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
        }

        let fromCss = '', toCss = '', tmp;

        for (i = 0; i < path.length; ++i) {
            let buildTo = true;

            for (n = 0; n < path[i].length; ++n) {
                for (let e = 0; e < path[i][n].elements.length; ++e) {
                    if (path[i][n].elements[e].value === 'to') {
                        buildTo = false;
                    } else if (buildTo) {
                        tmp = this.getNestedElementValue(path[i][n].elements[e]);

                        if (fromCss.length > 0 && !tmp.startsWith('>')) {
                            fromCss += ' > ';
                        } else {
                            fromCss += ' ';
                        }

                        fromCss += tmp;
                    } else {
                        tmp = this.getNestedElementValue(path[i][n].elements[e]);

                        if (toCss.length > 0 && !tmp.startsWith('>')) {
                            toCss += ' > ';
                        }

                        toCss += tmp;
                    }
                }
            }
        }

        path = new Value(new Expression([new Selector('(' + fromCss + ')'), new Anonymous(' to '), new Selector('(' + fromCss + ' > ' + toCss + ')')]));

        this.features = path;
        this.setParent(this.features, this);

        // Fake a tree-node that doesn't output anything.
        return new Ruleset([], []);
    },
});

export default Scope;
