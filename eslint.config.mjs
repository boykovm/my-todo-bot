// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import jestPlugin from 'eslint-plugin-jest';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ─── Ignored paths ──────────────────────────────────────────────────────────
  {
    ignores: ['eslint.config.mjs', 'generated/**', 'dist/**', 'node_modules/**'],
  },

  // ─── Base configs ───────────────────────────────────────────────────────────
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ─── Global language options ─────────────────────────────────────────────────
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ─── Source rules (all .ts files) ───────────────────────────────────────────
  {
    rules: {
      // ── Prettier ──────────────────────────────────────────────────────────
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // ── General best practices ────────────────────────────────────────────
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      curly: ['error', 'all'],
      'no-shadow': 'off', // replaced by TS version below

      // ── TypeScript strict (on top of strictTypeChecked) ───────────────────
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',

      // NestJS modules/guards/pipes are intentionally empty decorated classes
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],

      // Allow numbers and booleans in template literals
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],

      // Underscore-prefixed params are intentionally unused
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // ─── Test files ─────────────────────────────────────────────────────────────
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts', 'src/__mocks__/**/*.ts'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // ── Jest recommended ───────────────────────────────────────────────────
      ...jestPlugin.configs['flat/recommended'].rules,

      // ── Jest strict extra rules ────────────────────────────────────────────
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-standalone-expect': 'error',
      'jest/no-duplicate-hooks': 'error',
      'jest/no-conditional-expect': 'error',
      'jest/no-test-return-statement': 'error',
      'jest/expect-expect': 'error',
      'jest/prefer-strict-equal': 'warn',
      'jest/consistent-test-it': ['error', { fn: 'it' }],
      'jest/require-top-level-describe': 'error',
      'jest/prefer-hooks-on-top': 'error',

      // ── Relaxed TypeScript rules for test files ───────────────────────────
      // Jest mock typings inherently produce `any`; these are acceptable in tests.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // Non-null assertions are common after expect().not.toBeNull() guards
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Empty mock implementations are standard jest patterns
      '@typescript-eslint/no-empty-function': 'off',
      // jest/expect-expect: recognise supertest's .expect() as an assertion
      'jest/expect-expect': ['error', { assertFunctionNames: ['expect', 'request.*.expect'] }],
    },
  },

  // ─── Prettier last (overrides formatting rules) ──────────────────────────────
  eslintPluginPrettierRecommended,
);
