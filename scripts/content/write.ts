import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, sep } from 'node:path';

/**
 * Orders strings by UTF-16 code unit. Output order and hashes must never depend on the host's collation
 * (`localeCompare` sorts differently under Lithuanian or Czech locales).
 */
export function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Deterministic JSON: object keys sorted, 2-space indent, LF line endings, trailing newline. */
export function stableStringify(value: unknown): string {
  const json = JSON.stringify(
    value,
    (_key, current: unknown) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(current).sort(byCodeUnit)) {
          sorted[key] = (current as Record<string, unknown>)[key];
        }
        return sorted;
      }
      return current;
    },
    2,
  );
  if (json === undefined) throw new Error('stableStringify: value is not serialisable');
  return `${json}\n`;
}

export interface OutputFile {
  /** Posix path relative to the output directory, e.g. `en/docs/core__register.json`. */
  path: string;
  data: unknown;
}

function listJsonFiles(root: string, prefix: string): string[] {
  const dir = join(root, prefix);
  if (!existsSync(dir)) return [];
  if (!prefix.endsWith('/')) return existsSync(dir) ? [prefix] : [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join(posix.sep))
    .sort(byCodeUnit);
}

/** Files currently on disk under the managed prefixes (`en/`, `af/`, `manifest.json`). */
export function managedFiles(outDir: string, managedPrefixes: readonly string[]): string[] {
  return managedPrefixes.flatMap((prefix) => listJsonFiles(outDir, prefix)).sort(byCodeUnit);
}

export interface WriteResult {
  written: string[];
  removed: string[];
}

/**
 * A folder is safe to write into when it is empty, or when a previous build left its `manifest.json`
 * there. `--out` otherwise points at somebody else's folder, whose files this build would delete.
 */
export function assertSafeOutDir(outDir: string): void {
  if (!existsSync(outDir) || readdirSync(outDir).length === 0) return;
  const manifest = join(outDir, 'manifest.json');
  if (existsSync(manifest)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed as { version?: unknown }).version === 1
      )
        return;
    } catch {
      // A manifest that cannot be read is not this pipeline's, so fall through to the refusal.
    }
  }
  throw new Error(
    `${outDir} is not empty and holds no generated manifest.json (version 1), so it is not a content output folder. Point --out at an empty folder, or at one an earlier content build wrote; writing here would delete files this build does not own.`,
  );
}

export function writeOutputs(
  outDir: string,
  files: readonly OutputFile[],
  managedPrefixes: readonly string[],
): WriteResult {
  assertSafeOutDir(outDir);
  const wanted = new Set(files.map((file) => file.path));
  const removed: string[] = [];
  for (const existing of managedFiles(outDir, managedPrefixes)) {
    if (!wanted.has(existing)) {
      rmSync(join(outDir, existing));
      removed.push(existing);
    }
  }
  const written: string[] = [];
  for (const file of [...files].sort((a, b) => byCodeUnit(a.path, b.path))) {
    const target = join(outDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    const text = stableStringify(file.data);
    if (!existsSync(target) || readFileSync(target, 'utf8') !== text) {
      writeFileSync(target, text, 'utf8');
      written.push(file.path);
    }
  }
  return { written, removed };
}

export interface DiffResult {
  changed: string[];
  missing: string[];
  extra: string[];
}

/** Compares what a build would write with what is on disk, without writing anything. */
export function diffOutputs(
  outDir: string,
  files: readonly OutputFile[],
  managedPrefixes: readonly string[],
): DiffResult {
  const wanted = new Map(files.map((file) => [file.path, stableStringify(file.data)]));
  const changed: string[] = [];
  const missing: string[] = [];
  for (const [path, text] of [...wanted].sort(([a], [b]) => byCodeUnit(a, b))) {
    const target = join(outDir, path);
    if (!existsSync(target)) missing.push(path);
    else if (readFileSync(target, 'utf8') !== text) changed.push(path);
  }
  const extra = managedFiles(outDir, managedPrefixes).filter((path) => !wanted.has(path));
  return { changed, missing, extra };
}
