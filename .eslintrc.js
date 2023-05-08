module.exports = {
  ignorePatterns: ["dist/**", '*.js', 'test/unitTests/projectParser/**'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    "plugin:@typescript-eslint/strict"
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'check-file'],
  root: true,
  rules: {
    'no-useless-rename': 'error',
    'no-invalid-this': 'error',
    'semi': 'warn',
    'curly': 'warn',
    'no-implicit-coercion': [
      'warn', {
        disallowTemplateShorthand: true
      }],
    "indent": ["warn", 2],
    '@typescript-eslint/no-base-to-string': 'error',
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    "@typescript-eslint/strict-boolean-expressions": ["error",
      {
        allowNullableBoolean: true,
        allowNumber: false,
        allowString: false
      }],
    'check-file/filename-naming-convention': [
      'error',
      {
        '**/*.ts': 'CAMEL_CASE',
        '**/*.vhd': 'SNAKE_CASE'
      },
      { ignoreMiddleExtensions: true, }],
    'check-file/folder-naming-convention': [
      'error',
      {
        'lib/**/': 'CAMEL_CASE',
        'test/**/': 'CAMEL_CASE'
      },
    ],

  }
};