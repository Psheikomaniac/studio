// Flat ESLint config for ESLint v9
// Minimal setup using TypeScript plugin to avoid legacy config/patched module issues.
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  // JS files: enable Node/CommonJS globals (for config files like lighthouserc.js)
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        // Avoid project lookup to keep lint fast and compatible with all test/e2e files
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.commonjs,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-case-declarations': 'off',
      'no-redeclare': 'off',
      'no-prototype-builtins': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  // Tests/E2E: relax a few rules to reduce false positives in asynchronous patterns
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    rules: {
      'no-async-promise-executor': 'off',
      'no-useless-catch': 'off',
    },
  },
  {
    ignores: [
      'node_modules',
      '.next',
      'out',
      'coverage',
      'dist',
      'playwright-report',
      'test-results',
      'firebase-debug.log',
      'firestore-debug.log',
    ],
  },
];
