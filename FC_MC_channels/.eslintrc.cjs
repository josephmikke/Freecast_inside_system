module.exports = {
    extends: ['airbnb-base', 'airbnb-typescript/base'], parserOptions: {
        project: './tsconfig.json'
    }, parser: '@typescript-eslint/parser', plugins: ['@typescript-eslint'], root: true,
    rules: {
        "no-template-curly-in-string": "off",
        "import/no-import-module-exports": "off",
        "import/extensions": "off",
        "import/no-absolute-path": "off",
        "no-console": "off",
        "consistent-return": "off",
        "class-methods-use-this": "off",
        "@typescript-eslint/no-unused-vars": ["error", {"argsIgnorePattern": "^_"}]
    }
};
