module.exports = {
    extends: [
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:import/recommended',
        'plugin:import/typescript'
    ],
    parserOptions: {
        project: './tsconfig.json'
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'import', "jest-extended"],
    root: true,
    rules: {
        "prefer-object-spread": "off",
        'import/no-unresolved': 'error',
        "import/extensions": "off",
        "import/no-absolute-path": "off",
        "no-console": "off",
        "consistent-return": "off",
        "class-methods-use-this": "off",
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        "no-param-reassign": [
            "error",
            {
                "props": true,
                "ignorePropertyModificationsFor": ["acc"]
            }
        ],
        'import/order': [
            'error',
            {
                groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
                'newlines-between': 'always',
                alphabetize: {
                    /* sort in ascending order. Options: ["ignore", "asc", "desc"] */
                    order: 'asc',
                    /* ignore case. Options: [true, false] */
                    caseInsensitive: true,
                },
            },
        ],
    },
    settings: {
        'import/resolver': {
            typescript: {
                project: './tsconfig.json',
            },
        },
    },
};
