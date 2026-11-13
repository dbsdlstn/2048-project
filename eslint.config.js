// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Conflicts with strict's no-non-null-assertion; we prefer explicit `as T` casts
      // at the few places where an index is known to be in range.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
    },
  },
  {
    // Plain JS config files are not part of the type-aware project.
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  // Must stay last: turns off rules that conflict with Prettier formatting.
  prettier,
);
