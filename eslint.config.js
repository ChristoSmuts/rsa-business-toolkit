import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  {
    ignores: [
      '.claude/',
      'dist/',
      '.astro/',
      'node_modules/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.lighthouseci/',
      'src/data/',
      'public/search/',
      'docs/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{ts,astro}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use src/lib/store.ts or src/lib/storage/.' },
      ],
    },
  },
  {
    files: ['src/lib/store.ts', 'src/lib/storage/**', 'tests/**'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['src/**/*.astro'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name=/^(href|src|action)$/] > Literal[value=/^\\/(?!\\/)/]',
          message:
            'Root-relative URLs break under the GitHub Pages base path. Use href() from src/lib/paths.ts.',
        },
      ],
    },
  },
  prettier,
);
