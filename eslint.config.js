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
    files: ['src/lib/store.ts', 'src/lib/storage/**', 'src/scripts/**', 'tests/**'],
    rules: { 'no-restricted-globals': 'off' },
  },
  // e2e specs and helpers must use the guarded `test` from tests/e2e/fixtures.ts. The runtime check
  // in tests/e2e/helpers/guard-reporter.ts is the primary control; this fails at edit time.
  // `ignores` must equal KNOWN_UNGUARDED_SPECS in tests/e2e/helpers/guard-policy.ts (unit-tested).
  {
    files: ['tests/e2e/**/*.{ts,mts,cts,js,mjs,cjs,tsx,jsx}'],
    // Only fixtures.ts may import Playwright values. KNOWN_UNGUARDED_SPECS is empty, so no spec is
    // exempt; a spec added there (and only there) must be added here too (unit-tested).
    ignores: ['tests/e2e/fixtures.ts'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: ['@playwright/test', 'playwright/test', 'playwright', 'playwright-core'].map(
            (name) => ({
              name,
              allowTypeImports: true,
              message:
                'Import test and expect from tests/e2e/fixtures.ts; only type imports from Playwright are allowed here.',
            }),
          ),
          patterns: [
            {
              // `!@playwright/test`: the `paths` entry above already reports that one, and without
              // the exclusion every offending line would be flagged twice.
              group: [
                '@playwright/test/*',
                'playwright/*',
                'playwright-core/*',
                '@playwright/*',
                '!@playwright/test',
              ],
              allowTypeImports: true,
              message:
                'Import test and expect from tests/e2e/fixtures.ts; only type imports from Playwright are allowed here.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Use static imports in tests/e2e (require can bypass the fixture import rule).',
        },
        {
          selector: 'ImportExpression',
          message: 'Use static imports in tests/e2e (import() can bypass the fixture import rule).',
        },
        {
          selector: 'TSImportEqualsDeclaration, Identifier[name="createRequire"]',
          message: 'Use static imports in tests/e2e (require can bypass the fixture import rule).',
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(route|unroute|unrouteAll|routeFromHAR|routeWebSocket)$/]',
          message:
            'Intercept requests only with routeSameOrigin() from tests/e2e/helpers/network.ts, so the network guard keeps seeing them.',
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(removeAllListeners|removeListener|off)$/]',
          message:
            'Do not remove page or context listeners: the guards in tests/e2e/fixtures.ts rely on them.',
        },
        {
          selector:
            'MemberExpression[property.name=/^(launch|launchPersistentContext|launchServer|connect|connectOverCDP)$/]',
          message:
            'Use the page, context or browser fixtures; a browser launched by a spec is not guarded.',
        },
        {
          // Style only, and trivially bypassed by a helper function: the guards themselves patch
          // browser.newContext at worker scope, so a hook's context IS guarded (see fixtures.ts).
          selector:
            'CallExpression[callee.property.name=/^(beforeAll|afterAll)$/] CallExpression[callee.property.name=/^(newPage|newContext)$/]',
          message:
            'A page or context created in beforeAll/afterAll is guarded, but what it does is reported against the first test that follows (afterAll: against the worker), and it is shared state between tests. Create it in the test body, or use the page/context fixtures.',
        },
        {
          selector: 'CallExpression[callee.property.name=/^(fail|fixme)$/]',
          message:
            'test.fail()/test.fixme() reports a guard-only failure as passing (or drops the test). Fix the page, or declare an opt-out on the test (tests/e2e/fixtures.ts).',
        },
        {
          // Early signal only; an alias (`const target = page`) walks past it. The guards wrap the
          // sending methods of every guarded context's APIRequestContext, which is the real control.
          selector:
            "MemberExpression[object.name=/^(page|context|playwright|apiRequest)$/][property.name='request']",
          message:
            'APIRequestContext (page.request, context.request) raises no context "request" event and skips context routes. The guards wrap it so it cannot leave the preview origin, but a page-driven request is what the suites should use.',
        },
        {
          // Early signal; the runtime control is the `request` fixture override in fixtures.ts,
          // which fails the test whatever name the spec destructures it under.
          selector:
            "ArrowFunctionExpression > ObjectPattern > Property[key.name='request'], FunctionExpression > ObjectPattern > Property[key.name='request']",
          message:
            "Playwright's `request` fixture is an APIRequestContext outside every browser context, so no guard can observe it. tests/e2e/fixtures.ts replaces it with one that fails: drive the request through the page.",
        },
        {
          // playwright.request.newContext() builds an APIRequestContext the guards never see. No
          // runtime control exists for it, so this lint rule is the only one: see docs/testing.md.
          selector:
            "CallExpression[callee.object.property.name='request'][callee.property.name='newContext']",
          message:
            'An APIRequestContext built with request.newContext() is invisible to the network guard and nothing at run time can see it. Drive the request through the page.',
        },
        {
          selector: "CallExpression[callee.property.name='extend']",
          message:
            'Extend test only in tests/e2e/fixtures.ts, so the guard fixture cannot be overridden.',
        },
        {
          selector:
            "CallExpression[callee.property.name='use'] Property[key.name=/^(harnessGuards|consoleErrors|sameOriginGuard|javaScriptEnabled|baseURL)$/]",
          message: 'Do not override the guard fixtures (or the options they read) with test.use.',
        },
      ],
    },
  },
  {
    files: ['tests/e2e/helpers/network.ts'],
    rules: { 'no-restricted-syntax': 'off' },
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
