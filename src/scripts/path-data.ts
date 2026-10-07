/*
 * The reading-path rules in the browser (WP-31): `src/data/paths.json` and the engine. My path and
 * the wizard import this directly; every other page loads it lazily, and only when the path stored
 * on the device (`st.pathView.v1`) is missing or out of date (`path-progress.ts`). The pages, the
 * result pages and this module all run the same `buildPath`.
 */
import pathsJson from '../data/paths.json';
import type { PathsFile } from '../lib/content/schema';
import { buildPath, type PathResult } from '../lib/path-engine';
import { makePathView, type PathView } from '../lib/path-view';
import { profileQuery, type Profile } from '../lib/profile';

/**
 * Validated by the pipeline (`scripts/content/paths.ts`) and by the `paths` content collection at
 * build time; a JSON import is typed by its literal shape, so it is cast once here.
 */
export const PATHS = pathsJson as unknown as PathsFile;

/** The reader's path, from the documents listed in `paths.json`. */
export function readerPath(who: Profile): PathResult {
  return buildPath(who, PATHS, PATHS);
}

/** The view other pages read, for these answers and this content version. */
export function viewOf(who: Profile, version: string): PathView {
  return makePathView(readerPath(who).steps, PATHS.docs, version, profileQuery(who));
}
