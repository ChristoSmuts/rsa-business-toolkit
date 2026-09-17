/**
 * Content pipeline CLI (Part A of docs/build-plan.md).
 *
 *   pnpm content:build [--report] [--lang af]    regenerate src/data/** from the markdown
 *   pnpm content:check [--lang af]               regenerate in memory and fail on drift
 *   pnpm content:drift                           regenerate, then fail if git sees changes in src/data
 *   pnpm content:fidelity --lang af [--doc id]   EN/AF fidelity check only
 *
 * English is always built; `--lang` limits the translated languages. Other flags:
 *   --source-root <lang>=<dir>   read that language's markdown from <dir> (for a scratch copy)
 *   --out <dir>                  write the JSON to <dir> instead of src/data
 *   --allow-partial              English fallback for missing docs and <<TODO>> blocks
 *   --allow-stale                accept translations of an older English block
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContent, type BuildOptions } from './content/build';
import { parseCliArgs } from './content/cli';
import { ContentError, formatIssue } from './content/errors';
import { formatFinding } from './content/fidelity';
import { formatReport, formatSummary } from './content/report';
import { diffOutputs, writeOutputs } from './content/write';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main(): number {
  const cli = parseCliArgs(process.argv.slice(2));
  const common: BuildOptions = {
    repoRoot,
    allowPartial: cli.allowPartial,
    allowStale: cli.allowStale,
    sourceRoots: cli.sourceRoots,
    ...(cli.outDir === undefined ? {} : { outDir: cli.outDir }),
  };

  if (cli.fidelityOnly) {
    const lang = cli.lang ?? 'af';
    const result = buildContent({ ...common, mode: 'fidelity', langs: [lang], doc: cli.doc });
    const missing = result.missingRoots.find((root) => root.lang === lang);
    if (missing) {
      console.log(`No ${lang} source tree at ${missing.root}. Nothing to check.`);
      return 0;
    }
    const build = result.langs.find((candidate) => candidate.lang === lang);
    console.log(`Checking ${lang} markdown in ${build?.root ?? '?'}`);
    for (const finding of result.findings) console.log(formatFinding(finding));
    console.log(
      `Fidelity ${lang}: ${build?.docs.length ?? 0} docs faithful, ${result.findings.length} findings, ${build?.skipped.length ?? 0} docs not translated yet.`,
    );
    return result.findings.length > 0 ? 1 : 0;
  }

  const result = buildContent({
    ...common,
    ...(cli.lang === undefined ? {} : { langs: [cli.lang] }),
  });

  if (cli.check) {
    const diff = diffOutputs(result.outDir, result.files, result.managedPrefixes);
    const drift = [
      ...diff.changed.map((p) => `changed  ${p}`),
      ...diff.missing.map((p) => `missing  ${p}`),
      ...diff.extra.map((p) => `extra    ${p}`),
    ];
    if (drift.length > 0) {
      console.error(
        `Content drift: src/data does not match the markdown (${drift.length} files). Run pnpm content:build.`,
      );
      for (const line of drift) console.error(`  ${line}`);
      return 1;
    }
    console.log(`Content check: ${result.files.length} files match the markdown.`);
    if (cli.report) console.log(formatReport(result));
    return 0;
  }

  const written = writeOutputs(result.outDir, result.files, result.managedPrefixes);
  console.log(formatSummary(result));
  console.log(
    `Wrote ${written.written.length} changed files, removed ${written.removed.length}, ${result.files.length} files in total.`,
  );
  if (cli.report) console.log(`\n${formatReport(result)}`);

  if (cli.drift) {
    const status = execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=all', '--', 'src/data'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    ).trim();
    if (status !== '') {
      console.error(
        'Content drift: regenerated src/data differs from git. Commit the regenerated files.',
      );
      console.error(status);
      return 1;
    }
    console.log('Content drift: none.');
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  if (error instanceof ContentError) {
    console.error(`Content build failed with ${error.issues.length} problem(s):`);
    for (const issue of error.issues) console.error(`  ${formatIssue(issue)}`);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
}
