import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { LangSchema, type Lang } from '../../src/lib/content/schema';

export interface CliOptions {
  /** A translated language to build or check. English is always built. */
  lang?: Lang | undefined;
  doc?: string | undefined;
  check: boolean;
  drift: boolean;
  report: boolean;
  fidelityOnly: boolean;
  allowPartial: boolean;
  allowStale: boolean;
  /** `--source-root af=<dir>`: absolute source roots that replace docs.meta.json `sourceRoots`. */
  sourceRoots: Partial<Record<Lang, string>>;
  /** `--out <dir>`: absolute output directory instead of `src/data`. */
  outDir?: string | undefined;
}

function language(value: string, flag: string): Lang {
  const parsed = LangSchema.safeParse(value);
  if (!parsed.success) throw new Error(`${flag}: unknown language "${value}"`);
  return parsed.data;
}

/**
 * Parses the content CLI flags. Relative directories are resolved against `cwd`.
 *
 *   --lang af                     translated language (build, check or fidelity)
 *   --doc <id>                    one document (fidelity only)
 *   --source-root <lang>=<dir>    read that language's markdown from <dir> (repeatable)
 *   --out <dir>                   write JSON to <dir> instead of src/data
 */
export function parseCliArgs(args: readonly string[], cwd: string = process.cwd()): CliOptions {
  const { values } = parseArgs({
    args: [...args],
    options: {
      lang: { type: 'string' },
      doc: { type: 'string' },
      check: { type: 'boolean', default: false },
      drift: { type: 'boolean', default: false },
      report: { type: 'boolean', default: false },
      'fidelity-only': { type: 'boolean', default: false },
      'allow-partial': { type: 'boolean', default: false },
      'allow-stale': { type: 'boolean', default: false },
      'source-root': { type: 'string', multiple: true },
      out: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });
  const lang = values.lang === undefined ? undefined : language(values.lang, '--lang');
  if (lang === 'en') throw new Error('--lang must be a translated language such as af');
  if (values.doc !== undefined && !values['fidelity-only']) {
    throw new Error('--doc is only valid with pnpm content:fidelity (--fidelity-only)');
  }
  if (values.drift && values.out !== undefined) {
    throw new Error('--out cannot be combined with --drift, which checks src/data with git');
  }
  const sourceRoots: Partial<Record<Lang, string>> = {};
  for (const value of values['source-root'] ?? []) {
    const at = value.indexOf('=');
    if (at <= 0 || at === value.length - 1) {
      throw new Error(`--source-root expects <lang>=<directory>, got "${value}"`);
    }
    const rootLang = language(value.slice(0, at), '--source-root');
    if (sourceRoots[rootLang] !== undefined) {
      throw new Error(`--source-root is given twice for ${rootLang}`);
    }
    sourceRoots[rootLang] = resolve(cwd, value.slice(at + 1));
  }
  return {
    lang,
    doc: values.doc,
    check: values.check,
    drift: values.drift,
    report: values.report,
    fidelityOnly: values['fidelity-only'],
    allowPartial: values['allow-partial'],
    allowStale: values['allow-stale'],
    sourceRoots,
    outDir: values.out === undefined ? undefined : resolve(cwd, values.out),
  };
}
