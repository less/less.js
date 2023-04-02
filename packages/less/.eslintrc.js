module.exports = {
    'parser': '@typescript-eslint/parser',
    'extends': 'eslint:recommended',
    'parserOptions': {
        'ecmaVersion': 2018,
        'sourceType': 'module'
    },
    'plugins': ['@typescript-eslint'],
    'env': {
        'browser': true,
        'node': true,
        'mocha': true
    },
    'globals': {},
    'rules': {
        indent: ['error', 4, {
            SwitchCase: 1
        }],
        'no-empty': ['error', { 'allowEmptyCatch': true }],
        quotes: ['error', 'single', {
            avoidEscape: true
        }],
        /**
         * The codebase uses some while(true) statements.
         * Refactor to remove this rule.
         */
        'no-constant-condition': 0,
        /**
         * Less combines assignments with conditionals sometimes
         */
        'no-cond-assign': 0,
        /**
         * @todo - remove when some kind of code style (XO?) is added
         */
        'no-multiple-empty-lines': 'error'
    },
    'overrides': [
        {
            files: ['*.ts'],
            extends: ['plugin:@typescript-eslint/recommended'],
            rules: {
                /**
                 * Suppress until Less has better-defined types
                 * @see https://github.com/less/less.js/discussions/3786
                 */
                '@typescript-eslint/no-explicit-any': 0
            }
        },
        {
            files: ['test/**/*.{js,ts}', 'benchmark/index.js'],
            /**
             * @todo - fix later
             */
            rules: {
                'no-undef': 0,
                'no-useless-escape': 0,
                'no-unused-vars': 0,
                'no-redeclare': 0,
                '@typescript-eslint/no-unused-vars': 0
            }
        },
    ]
}
