/**
 * Translation status for translating agents and reviewers.
 *
 *   pnpm translate:status [--lang af] [--source-root af=<dir>]
 *
 * Lists every document with: whether the translated markdown exists, its status in
 * content-meta/translations.json, and the number of fidelity findings (stale blocks counted separately).
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lang } from '../../src/lib/content/schema';
import { buildContent, type BuildResult } from '../content/build';
import { parseCliArgs } from '../content/cli';
import { ContentError, formatIssue } from '../content/errors';
import { formatFinding } from '../content/fidelity';
import { formatTable } from '../content/report';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function statusRows(result: BuildResult, lang: Lang, root: string | undefined): string[][] {
  const { config } = result;
  return config.docsMeta.docs.map((entry) => {
    const present = root !== undefined && existsSync(join(root, ...entry.source.split('/')));
    const docFindings = result.findings.filter((finding) => finding.doc === entry.id);
    const stale = docFindings.filter((finding) => finding.rule === 'stale').length;
    const status =
      config.translations.langs[lang]?.docs[entry.id]?.status ??
      config.translations.langs[lang]?.defaultStatus ??
      '-';
    return [
      entry.id,
      present ? 'yes' : 'no',
      status,
      present ? String(docFindings.length - stale) : '-',
      present ? String(stale) : '-',
    ];
  });
}

function main(): number {
  const cli = parseCliArgs(process.argv.slice(2));
  const lang = cli.lang ?? 'af';
  const result = buildContent({
    repoRoot,
    mode: 'fidelity',
    langs: [lang],
    sourceRoots: cli.sourceRoots,
  });
  const root = result.langs.find((build) => build.lang === lang)?.root;
  const rows = statusRows(result, lang, root);
  console.log(formatTable(['doc', `${lang} file`, 'status', 'findings', 'stale'], rows));
  const present = rows.filter((row) => row[1] === 'yes').length;
  console.log(
    `\n${lang}: ${present}/${rows.length} documents translated, ${result.findings.length} fidelity findings.`,
  );
  for (const finding of result.findings) console.log(`  ${formatFinding(finding)}`);
  if (root === undefined) {
    const missing = result.missingRoots.find((candidate) => candidate.lang === lang);
    console.log(`No ${lang} source tree yet (${missing?.root ?? 'no root configured'}).`);
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  if (error instanceof ContentError) {
    for (const issue of error.issues) console.error(formatIssue(issue));
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
}
