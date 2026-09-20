/**
 * Playwright reporter that makes the automatic guards a run-level guarantee.
 *
 * `tests/e2e/fixtures.ts` stamps every test it guards with a `harness-guards` annotation. At the end
 * of the run this reporter lists every test that passed without it (a spec that imports `test` from
 * `@playwright/test`, a re-export of it, or overrides the fixture) and every invalid opt-out
 * annotation, and fails the run. Only passing tests need the stamp: a failing, timed-out or skipped
 * test cannot hide an unguarded defect (see guardRunProblems).
 *
 * It also records every attempt of every test, so a guard violation that a retry hid (`retries: 2`
 * in CI would report it as `flaky` and exit 0) still fails the run. Guard errors are recognised by
 * `GUARD_FAILURE_MARKER` at the start of the message the fixture throws, so ordinary retries for
 * infrastructure flakiness (a browser that times out while setting up `page`) keep working.
 *
 * `guard-teardown.ts` (globalTeardown) fails the run when this reporter is not active, for example
 * after `--reporter=html` on the command line replaced the configured reporters.
 */
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import {
  GUARD_FAILURE_MARKER,
  GUARD_REPORTER_FLAG,
  guardRunProblems,
  type AnnotationLike,
  type ExecutedTest,
} from './guard-policy';

export default class GuardReporter implements Reporter {
  private readonly executed: ExecutedTest[] = [];

  onBegin(): void {
    (globalThis as Record<symbol, unknown>)[Symbol.for(GUARD_REPORTER_FLAG)] = true;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testDir = test.parent.project()?.testDir ?? process.cwd();
    const annotations: AnnotationLike[] = [];
    const seen = new Set<string>();
    for (const annotation of [...test.annotations, ...result.annotations]) {
      const key = JSON.stringify(annotation);
      if (seen.has(key)) continue;
      seen.add(key);
      annotations.push(annotation);
    }
    // Every attempt is recorded, with the guard error it reported (if any): a violation that only
    // one attempt saw must fail the run even when a retry turned the test green (CI retries twice).
    this.executed.push({
      // TestCase.id is stable across retries and unique per generated test, so two tests that share
      // a title and a call site never collapse into one attempt group.
      id: test.id,
      title: test.titlePath().filter(Boolean).join(' › '),
      file: path.relative(testDir, test.location.file).replace(/\\/g, '/'),
      location: test.location,
      status: result.status,
      expectedStatus: test.expectedStatus,
      retry: result.retry,
      guardFailure: result.errors
        .map((error) => error.message ?? '')
        .find((message) => message.includes(GUARD_FAILURE_MARKER)),
      annotations,
    });
  }

  async onEnd(result: FullResult): Promise<{ status?: FullResult['status'] } | undefined> {
    const problems = guardRunProblems(this.executed);
    if (problems.length === 0) return undefined;
    process.stderr.write(
      `\n[e2e guards] The run fails: ${problems.length} guard problem(s) (tests/e2e/helpers/guard-reporter.ts):\n` +
        problems.map((problem) => `  - ${problem}`).join('\n') +
        '\n\n',
    );
    return { status: result.status === 'interrupted' ? 'interrupted' : 'failed' };
  }

  printsToStdio(): boolean {
    return false;
  }
}
