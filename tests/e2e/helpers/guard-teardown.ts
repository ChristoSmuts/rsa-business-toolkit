/**
 * globalTeardown: fail the run when `guard-reporter.ts` did not run. Command-line `--reporter`
 * replaces the reporters from `playwright.config.ts`, which would silently drop the check that every
 * test ran the guards. Add it back explicitly, for example:
 *
 *     pnpm exec playwright test --reporter=list,html,./tests/e2e/helpers/guard-reporter.ts
 */
import { GUARD_REPORTER_FLAG } from './guard-policy';

export default function guardTeardown(): void {
  if ((globalThis as Record<symbol, unknown>)[Symbol.for(GUARD_REPORTER_FLAG)] === true) return;
  throw new Error(
    '[e2e guards] tests/e2e/helpers/guard-reporter.ts did not run, so nothing checked that every test ran the ' +
      'console, CSP and network guards (this also appears when no test matched the filter: the ' +
      '"No tests found." line above is then the real cause). If you pass --reporter, include it: ' +
      '--reporter=list,./tests/e2e/helpers/guard-reporter.ts',
  );
}
