module.exports = {
    'env': {
        'browser': true,
        'node': true,
        'mocha': true
    },
    'parserOptions': {
        'ecmaVersion': 6
    },
    'extends': 'eslint:recommended',
    'rules': {
        'comma-spacing': [
            'error',
            { 'before': false, 'after': true }
        ],
        'curly': 'error',
        'indent': [
            'error',
            4,
            {'SwitchCase': 1}
        ],
        'keyword-spacing': [
            'error',
            {'before': true, 'after': true}
        ],
        'no-console': [
            'error',
            {'allow': ['log', 'warn', 'error', 'time', 'timeEnd']}
        ],
        'no-irregular-whitespace': 'error',
        'no-trailing-spaces': [
            'error',
            {'skipBlankLines': true }
        ],
        'no-unneeded-ternary': 'error',
        'no-var': 'error',
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'never'
        ],
        'space-in-parens': [
            'error',
            'never'
        ],
        'space-infix-ops': [
            'error',
            {'int32Hint': false}
        ]

    }
};
