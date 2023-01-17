module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    'no-useless-rename': 'error',
    'no-invalid-this': 'error',
    'semi': 'warn'
  }
};