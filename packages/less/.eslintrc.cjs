module.exports = {
    'extends': ['../../config/eslint/base.cjs'],
    'overrides': [
        {
            files: ['*.ts'],
            'extends': ['plugin:@typescript-eslint/recommended'],
            rules: {
                '@typescript-eslint/no-explicit-any': 0
            }
        },
        {
            files: ['lib/**/*.{js,ts}'],
            rules: {
                'no-unused-vars': 0,
                'no-redeclare': 0
            }
        },
        {
            files: ['benchmark/**/*.{js,ts}', 'build/**/*.{js,ts}', 'scripts/**/*.{js,ts}'],
            rules: {
                'no-unused-vars': 0,
                'no-redeclare': 0,
                'no-undef': 0
            }
        },
        {
            files: ['test/**/*.{js,ts}', 'benchmark/index.js'],
            rules: {
                'no-undef': 0,
                'no-useless-escape': 0,
                'no-unused-vars': 0,
                'no-redeclare': 0,
                '@typescript-eslint/no-unused-vars': 0
            }
        }
    ]
};