import { posix } from 'node:path';
import type { DocrefRun } from '../../src/lib/content/schema';
import type { DocMetaEntry, DocsMeta, LegacyRefs } from './config';

export interface DocIndex {
  bySource: ReadonlyMap<string, DocMetaEntry>;
  byId: ReadonlyMap<string, DocMetaEntry>;
}

export function createDocIndex(meta: DocsMeta): DocIndex {
  return {
    bySource: new Map(meta.docs.map((doc) => [doc.source, doc])),
    byId: new Map(meta.docs.map((doc) => [doc.id, doc])),
  };
}

export type LinkResolution = { doc: string; anchor?: string | undefined } | { error: string };

/**
 * Resolves a relative markdown link (`../05%20Look%20it%20up/01-glossary.md#tax`) against the linking
 * document's path. `%20` is decoded, `../` resolved; the anchor is kept verbatim.
 */
export function resolveInternalLink(
  url: string,
  fromSource: string,
  index: DocIndex,
): LinkResolution {
  const hashAt = url.indexOf('#');
  const rawPath = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const rawAnchor = hashAt >= 0 ? url.slice(hashAt + 1) : undefined;
  let decoded: string;
  let anchor: string | undefined;
  try {
    decoded = decodeURIComponent(rawPath);
    anchor =
      rawAnchor === undefined || rawAnchor === '' ? undefined : decodeURIComponent(rawAnchor);
  } catch {
    return { error: `cannot decode link target "${url}"` };
  }
  if (decoded === '') return { error: `link "${url}" has no document path` };
  const joined = posix.normalize(posix.join(posix.dirname(fromSource), decoded));
  if (joined.startsWith('../') || posix.isAbsolute(joined)) {
    return { error: `link target "${url}" points outside the toolkit` };
  }
  const entry = index.bySource.get(joined);
  if (!entry)
    return { error: `link target "${url}" (${joined}) is not a document listed in docs.meta.json` };
  return anchor === undefined ? { doc: entry.id } : { doc: entry.id, anchor };
}

/** Old folder scheme used in inline code: `01-core/04`, `02-branding-and-marketing/01a`, `04-business-types/`. */
export const LEGACY_REF_RE = /^(\d{2}-[a-z]+(?:-[a-z]+)*)(?:\/(\d{2}[a-z]?)?)?$/;
const CONTINUATION_RE = /^\d{2}[a-z]?$/;

export type LegacyResolution =
  | { kind: 'none' }
  | { kind: 'docref'; run: DocrefRun; folder: string }
  | { kind: 'error'; message: string };

/**
 * Maps inline code in the old scheme to a docref. A bare `03` right after a ref such as
 * `04-business-types/02` continues that folder. Anything shaped like the old scheme but not in
 * `legacy-refs.json` is an error, so the map is proven complete by every usage in the corpus.
 */
export function resolveLegacyRef(
  code: string,
  legacy: LegacyRefs,
  previousFolder?: string,
): LegacyResolution {
  const match = LEGACY_REF_RE.exec(code);
  if (match) {
    const folder = match[1] ?? '';
    const section = legacy.folders[folder];
    if (!section)
      return { kind: 'error', message: `unknown legacy folder "${folder}" in \`${code}\`` };
    const number = match[2];
    if (number === undefined)
      return { kind: 'docref', run: { t: 'docref', section, label: code }, folder };
    const doc = legacy.refs[`${folder}/${number}`];
    if (!doc)
      return { kind: 'error', message: `legacy ref \`${code}\` is not in legacy-refs.json` };
    return { kind: 'docref', run: { t: 'docref', doc, label: code }, folder };
  }
  if (previousFolder && CONTINUATION_RE.test(code)) {
    const doc = legacy.refs[`${previousFolder}/${code}`];
    if (!doc)
      return {
        kind: 'error',
        message: `continuation \`${code}\` after ${previousFolder} is not in legacy-refs.json`,
      };
    return { kind: 'docref', run: { t: 'docref', doc, label: code }, folder: previousFolder };
  }
  return { kind: 'none' };
}
