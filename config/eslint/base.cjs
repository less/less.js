module.exports = {
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
        'ecmaVersion': 2022,
        'sourceType': 'module'
    },
    'plugins': ['@typescript-eslint'],
    'extends': [
        'eslint:recommended'
    ],
    'env': {
        'browser': true,
        'node': true,
        'mocha': true
    },
    'rules': {
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'no-empty': ['error', { 'allowEmptyCatch': true }],
        'quotes': ['error', 'single', { 'avoidEscape': true }],
        /**
         * The codebase uses some while(true) statements.
         * Refactor to remove this rule.
         */
        'no-constant-condition': 0,
        /**
         * Less combines assignments with conditionals sometimes
         */
        'no-cond-assign': 0,
        'no-multiple-empty-lines': 'error'
    }
};