/// <reference types="vitest/config" />
import { availableParallelism } from 'node:os';
import { getViteConfig } from 'astro/config';

/**
 * Starting and reaping processes is slow on the Windows machine this package is gated on: spawning
 * a Chromium renderer there costs 22 s (see `tests/e2e/helpers/timeouts.ts`), and a Node fork that
 * loads Vite is not cheap either. Vitest's defaults assume otherwise — one fork per core less one
 * (15 here) and 10 s to reap each — and with 22 test files importing at once that produced
 * `[vitest-pool]: Timeout terminating forks worker`, and `Timeout starting forks runner` (Vitest's
 * own hard-coded 90 s), on runs where **nine of the twenty-two files were dropped** and the summary
 * read "13 passed (13)". Such a run does exit non-zero, so it never went green with tests missing,
 * but it failed on the host rather than on the code.
 *
 * So bound the pool rather than trust the host to keep up, and allow a slow machine time to reap a
 * worker. The cap only binds on a many-core machine: a 2- or 4-core CI runner is already below it
 * and keeps Vitest's own value, so this does not change how CI runs.
 *
 * `maxWorkers` and `teardownTimeout` are the Vitest 5 spellings. The `poolOptions.forks` form of
 * earlier versions is not in the Vitest 5 config type: it is accepted silently at run time and does
 * nothing, so `pnpm typecheck` (`astro check`) is what catches a stale spelling here.
 */
const maxWorkers = Math.max(1, Math.min(availableParallelism() - 1, 8));

export default getViteConfig({
  test: {
    pool: 'forks',
    maxWorkers,
    teardownTimeout: 60_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'scripts/**/*.test.ts', 'src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'dom', environment: 'happy-dom', include: ['tests/dom/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'content',
          environment: 'node',
          include: ['tests/content/**/*.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/i18n/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['**/*.test.ts', 'scripts/ci/**'],
      /**
       * The content pipeline decides what ships, so every file it owns has a floor just under the
       * measurement: a floor with slack in it lets code stop being covered without the gate noticing.
       * Branches sit lower than the C5 target of 90 because of `report.ts`, a developer report that is
       * not shipped; `docs/reviews/backlog.md` records that shortfall.
       *
       * The two CLI entry modules are floored at 0 rather than excluded, so they stay measured and
       * visible in the report. Neither can be unit-tested as it stands: importing the module runs
       * `main()` against the whole real corpus at import time, and `content:build` writes `src/data`.
       * Everything they call is covered — `cli.ts` at 100%, `build.ts`, `write.ts` and `report.ts`
       * under the floors above — and `gate:fast` runs both CLIs end to end through `content:check`
       * and `content:drift`. `docs/reviews/backlog.md` records the gap.
       */
      thresholds: {
        'scripts/content/**': { statements: 97, branches: 85, functions: 98, lines: 97 },
        'src/lib/content/**': { statements: 85, branches: 72, functions: 100, lines: 85 },
        'scripts/build-content.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
        'scripts/translate/status.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
      },
    },
  },
});
