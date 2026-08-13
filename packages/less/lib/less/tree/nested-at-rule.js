// @ts-check
/** @import { EvalContext, CSSOutput, TreeVisitor, FileInfo, VisibilityInfo } from './node.js' */
import Ruleset from './ruleset.js';
import Value from './value.js';
import Selector from './selector.js';
import Anonymous from './anonymous.js';
import Expression from './expression.js';
import * as utils from '../utils.js';
import Node from './node.js';

/**
 * @typedef {object} FunctionRegistry
 * @property {(name: string, func: Function) => void} add
 * @property {(functions: Object) => void} addMultiple
 * @property {(name: string) => Function} get
 * @property {() => Object} getLocalFunctions
 * @property {() => FunctionRegistry} inherit
 * @property {(base: FunctionRegistry) => FunctionRegistry} create
 */

/**
 * @typedef {Node & {
 *   features: Value,
 *   rules: Ruleset[],
 *   type: string,
 *   functionRegistry?: FunctionRegistry,
 *   multiMedia?: boolean,
 *   debugInfo?: { lineNumber: number, fileName: string },
 *   allowRoot?: boolean,
 *   _evaluated?: boolean,
 *   evalFunction: () => void,
 *   evalTop: (context: EvalContext) => Node | Ruleset,
 *   evalNested: (context: EvalContext) => Node | Ruleset,
 *   permute: (arr: Node[][]) => Node[][],
 *   bubbleSelectors: (selectors: Selector[] | undefined) => void,
 *   outputRuleset: (context: EvalContext, output: CSSOutput, rules: Node[]) => void
 * }} NestableAtRuleThis
 */

// A media query may only carry a media type at its front, before any
// conditions (https://drafts.csswg.org/mediaqueries-5/#typedef-media-query-list).
// Operators that join media-query parts, so a fragment leading with one is not
// a media type. Any other bare identifier is treated as a type, since unknown
// media types are valid non-matches in CSS, not syntax errors.
const MEDIA_QUERY_OPERATORS = ['and', 'or'];

/**
 * Whether a flattened media-query fragment leads with a media type, e.g.
 * `screen`, `only screen`, `print and (color)` or an unknown type like `foo`.
 * @param {Node & { value?: * }} fragment
 */
function startsWithMediaType(fragment) {
    let head;
    if (fragment.type === 'Keyword' || fragment.type === 'Anonymous') {
        head = fragment.value;
    } else if (fragment.type === 'Expression' && Array.isArray(fragment.value)) {
        const parts = fragment.value.filter(p => p && p.value !== undefined);
        let idx = 0;
        const first = parts[idx] && String(parts[idx].value).toLowerCase();
        if (first === 'not' || first === 'only') { idx++; }
        head = parts[idx] && parts[idx].value;
    }
    if (typeof head !== 'string' || head === '') {
        return false;
    }
    // Inspect only the first token. A media type is a bare identifier; a feature
    // condition begins with '(' - e.g. an escaped ~"(max-width: 1px)" is an
    // Anonymous whose whole value is "(max-width: 1px)", which is not a media type.
    const firstToken = head.trim().split(/[\s(]/)[0];
    return firstToken !== ''
        && MEDIA_QUERY_OPERATORS.indexOf(firstToken.toLowerCase()) < 0;
}

const NestableAtRulePrototype = {

    isRulesetLike() {
        return true;
    },

    /** @param {TreeVisitor} visitor */
    accept(visitor) {
        /** @type {NestableAtRuleThis} */
        const self = /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (this));
        if (self.features) {
            self.features = /** @type {Value} */ (visitor.visit(self.features));
        }
        if (self.rules) {
            self.rules = /** @type {Ruleset[]} */ (visitor.visitArray(self.rules));
        }
    },

    evalFunction: function () {
        /** @type {NestableAtRuleThis} */
        const self = /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (this));
        if (!self.features || !Array.isArray(self.features.value) || self.features.value.length < 1) {
            return;
        }

        const exprValues = /** @type {Node[]} */ (self.features.value);
        /** @type {Node | undefined} */
        let expr;
        /** @type {Node | undefined} */
        let paren;

        for (let index = 0; index < exprValues.length; ++index) {
            expr = exprValues[index];

            if ((expr.type === 'Keyword' || expr.type === 'Variable')
                && index + 1 < exprValues.length
                && (/** @type {Node & { noSpacing?: boolean }} */ (expr).noSpacing || /** @type {Node & { noSpacing?: boolean }} */ (expr).noSpacing == null)) {
                paren =  exprValues[index + 1];

                if (paren.type ===  'Paren' && /** @type {Node & { noSpacing?: boolean }} */ (paren).noSpacing) {
                    exprValues[index]= new Expression([expr, paren]);
                    exprValues.splice(index + 1, 1);
                    /** @type {Node & { noSpacing?: boolean }} */ (exprValues[index]).noSpacing = true;
                }
            }
        }
    },

    /** @param {EvalContext} context */
    evalTop(context) {
        /** @type {NestableAtRuleThis} */
        const self = /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (this));
        self.evalFunction();

        /** @type {Node | Ruleset} */
        let result = self;

        // Render all dependent Media blocks.
        if (context.mediaBlocks.length > 1) {
            const selectors = (new Selector([], null, null, self.getIndex(), self.fileInfo())).createEmptySelectors();
            result = new Ruleset(selectors, context.mediaBlocks);
            /** @type {Ruleset & { multiMedia?: boolean }} */ (result).multiMedia = true;
            result.copyVisibilityInfo(self.visibilityInfo());
            self.setParent(result, self);
        }

        delete context.mediaBlocks;
        delete context.mediaPath;

        return result;
    },

    /** @param {EvalContext} context */
    evalNested(context) {
        /** @type {NestableAtRuleThis} */
        const self = /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (this));
        self.evalFunction();

        let i;
        /** @type {Node | Node[]} */
        let value;
        const path = context.mediaPath.concat([self]);

        // Extract the media-query conditions separated with `,` (OR).
        for (i = 0; i < path.length; i++) {
            if (path[i].type !== self.type) {
                const blockIndex = context.mediaBlocks.indexOf(self);
                if (blockIndex > -1) {
                    context.mediaBlocks.splice(blockIndex, 1);
                }
                return self;
            }

            value = /** @type {NestableAtRuleThis} */ (path[i]).features instanceof Value ?
                /** @type {Node[]} */ (/** @type {NestableAtRuleThis} */ (path[i]).features.value) : /** @type {NestableAtRuleThis} */ (path[i]).features;
            path[i] = /** @type {Node} */ (/** @type {unknown} */ (Array.isArray(value) ? value : [value]));
        }

        // Trace all permutations to generate the resulting media-query.
        //
        // (a, b and c) with nested (d, e) ->
        //    a and d
        //    a and e
        //    b and c and d
        //    b and c and e
        self.features = new Value(self.permute(/** @type {Node[][]} */ (/** @type {unknown} */ (path))).map(
            /** @param {Node | Node[]} path */
            path => {
                path = /** @type {Node[]} */ (path).map(
                /** @param {Node & { toCSS?: Function }} fragment */
                    fragment => fragment.toCSS ? fragment : new Anonymous(/** @type {string} */ (/** @type {unknown} */ (fragment))));

                // A media type nested inside conditions must move ahead of them
                // so the flattened query stays valid (issue #3694, #3764).
                const types = /** @type {Node[]} */ (path).filter(startsWithMediaType);
                if (types.length && types.length < /** @type {Node[]} */ (path).length) {
                    path = types.concat(/** @type {Node[]} */ (path).filter(f => !startsWithMediaType(f)));
                }

                for (i = /** @type {Node[]} */ (path).length - 1; i > 0; i--) {
                /** @type {Node[]} */ (path).splice(i, 0, new Anonymous('and'));
                }

                return new Expression(/** @type {Node[]} */ (path));
            }));
        self.setParent(self.features, self);

        // Fake a tree-node that doesn't output anything.
        return new Ruleset([], []);
    },

    /**
     * @param {Node[][]} arr
     * @returns {Node[][]}
     */
    permute(arr) {
        if (arr.length === 0) {
            return [];
        } else if (arr.length === 1) {
            return /** @type {Node[][]} */ (/** @type {unknown} */ (arr[0]));
        } else {
            /** @type {Node[][]} */
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

    /** @param {Selector[] | undefined} selectors */
    bubbleSelectors(selectors) {
        /** @type {NestableAtRuleThis} */
        const self = /** @type {NestableAtRuleThis} */ (/** @type {unknown} */ (this));
        if (!selectors) {
            return;
        }
        self.rules = [new Ruleset(utils.copyArray(selectors), [self.rules[0]])];
        self.setParent(self.rules, self);
    }
};

export default NestableAtRulePrototype;
