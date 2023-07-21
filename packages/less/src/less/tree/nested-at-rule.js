import Ruleset from './ruleset';
import Value from './value';
import Selector from './selector';
import Anonymous from './anonymous';
import Expression from './expression';
import * as utils from '../utils';

const NestableAtRulePrototype = {

    isRulesetLike() {
        return true;
    },

    accept(visitor) {
        if (this.features) {
            this.features = visitor.visit(this.features);
        }
        if (this.rules) {
            this.rules = visitor.visitArray(this.rules);
        }
    },

    evalTop(context) {
        let result = this;

        // Render all dependent Media blocks.
        if (context.mediaBlocks.length > 1) {
            const selectors = (new Selector([], null, null, this.getIndex(), this.fileInfo())).createEmptySelectors();
            result = new Ruleset(selectors, context.mediaBlocks);
            result.multiMedia = true;
            result.copyVisibilityInfo(this.visibilityInfo());
            this.setParent(result, this);
        }

        delete context.mediaBlocks;
        delete context.mediaPath;

        return result;
    },

    evalNested(context) {
        let i;
        let value;
        const path = context.mediaPath.concat([this]);

        // Extract the media-query conditions separated with `,` (OR).
        for (i = 0; i < path.length; i++) {
            value = path[i].features instanceof Value ?
                path[i].features.value : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
        }

        // Trace all permutations to generate the resulting media-query.
        //
        // (a, b and c) with nested (d, e) ->
        //    a and d
        //    a and e
        //    b and c and d
        //    b and c and e
        this.features = new Value(this.permute(path).map(path => {
            path = path.map(fragment => fragment.toCSS ? fragment : new Anonymous(fragment));

            for (i = path.length - 1; i > 0; i--) {
                path.splice(i, 0, new Anonymous('and'));
            }

            return new Expression(path);
        }));
        this.setParent(this.features, this);

        // Fake a tree-node that doesn't output anything.
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
};

export default NestableAtRulePrototype;
