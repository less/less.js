/**
 * Deprecation registry for Less.js
 *
 * Each deprecation has a unique ID and description.
 * Repetition limiting caps warnings at 5 per deprecation type per parse.
 * Use --quiet-deprecations to suppress all deprecation warnings.
 */

const deprecations = {
    'mixin-call-no-parens': {
        description: 'Calling a mixin without parentheses is deprecated.'
    },
    'mixin-call-whitespace': {
        description: 'Whitespace between a mixin name and parentheses for a mixin call is deprecated.'
    },
    'dot-slash-operator': {
        description: 'The ./ operator is deprecated.'
    },
    'variable-in-unknown-value': {
        description: '@[ident] in custom property values is treated as literal text.'
    },
    'property-in-unknown-value': {
        description: '$[ident] in custom property values is treated as literal text.'
    },
    'js-eval': {
        description: 'Inline JavaScript evaluation (backtick expressions) is deprecated and will be removed in Less 5.x.'
    },
    'at-plugin': {
        description: 'The @plugin directive is deprecated and will be removed in Less 5.x.'
    },
    'dump-line-numbers': {
        description: 'The dumpLineNumbers option is deprecated and will be removed in Less 5.x.'
    },
    'math-always': {
        description: '--math=always is deprecated and will be removed in Less 5.x.'
    }
};

const MAX_REPETITIONS = 5;

class DeprecationHandler {
    constructor() {
        /** @type {Record<string, number>} */
        this._counts = {};
    }

    /** @param {string} deprecationId */
    shouldWarn(deprecationId) {
        if (!deprecationId) { return true; }
        const count = (this._counts[deprecationId] || 0) + 1;
        this._counts[deprecationId] = count;
        return count <= MAX_REPETITIONS;
    }

    /** @param {{ warn: (msg: string) => void }} logger */
    summarize(logger) {
        for (const id of Object.keys(this._counts)) {
            const omitted = this._counts[id] - MAX_REPETITIONS;
            if (omitted > 0) {
                logger.warn(`${omitted} repetitive "${id}" deprecation warning(s) omitted.`);
            }
        }
    }
}

export { deprecations, DeprecationHandler, MAX_REPETITIONS };
export default { deprecations, DeprecationHandler };
