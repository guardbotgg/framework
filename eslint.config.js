import tseslint from 'typescript-eslint';
import globals from 'globals';
import js from '@eslint/js';


export default tseslint.config(
  { ignores: ['build', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      'eqeqeq': ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  {
    files: ['tests/**/*.{ts,js}'],
    languageOptions: { globals: { calls: 'writable' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
