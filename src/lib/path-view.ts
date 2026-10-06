/**
 * The reader's path as the top bar, the home card and the pager need it: the steps, and the route
 * and titles of each page on them (review WP-31 pass 1, major 1).
 *
 * Those three are on every page, and the rules plus the engine are about 3 KB gzipped. So the path
 * is worked out once (`makePathView`, from `buildPath`) and kept on the device under
 * `st.pathView.v1`, with the content version and the answers it was built for. While both still
 * match (`viewFor`), a page reads the stored view and loads nothing more. When the content changes
 * or the answers do, the next page loads the rules lazily, rebuilds the view and stores it again.
 *
 * Pure and dependency-free, so every page can afford it.
 */
import type { Schema } from './storage/migrate';

export interface PathViewDoc {
  /** Site-relative route (`core/register/`). */
  readonly route: string;
  /** Title per language code. */
  readonly titles: Readonly<Record<string, string>>;
}

export interface PathView {
  /** The rules version (the hash of `paths.json`) the path was built from. */
  readonly version: string;
  /** The answers it is for, as their query string (`profileQuery`). */
  readonly profile: string;
  /** Per step, its pages: `doc` or `doc#anchor`. */
  readonly steps: readonly (readonly string[])[];
  readonly docs: Readonly<Record<string, PathViewDoc>>;
}

export interface ViewItem {
  readonly doc: string;
  readonly anchor: string | undefined;
}

function item(ref: string): ViewItem {
  const hash = ref.indexOf('#');
  return hash === -1
    ? { doc: ref, anchor: undefined }
    : { doc: ref.slice(0, hash), anchor: ref.slice(hash + 1) };
}

const isString = (value: unknown): value is string => typeof value === 'string';

function isDoc(value: unknown): value is PathViewDoc {
  if (typeof value !== 'object' || value === null) return false;
  const { route, titles } = value as Record<string, unknown>;
  return (
    isString(route) &&
    typeof titles === 'object' &&
    titles !== null &&
    Object.values(titles).every(isString)
  );
}

/** A stored view that is not this shape, or names a page it has no route for, is dropped. */
export const pathViewSchema: Schema<PathView> = {
  safeParse(data) {
    if (typeof data !== 'object' || data === null) return { success: false };
    const { version, profile, steps, docs } = data as Record<string, unknown>;
    if (!isString(version) || !isString(profile)) return { success: false };
    if (typeof docs !== 'object' || docs === null || !Object.values(docs).every(isDoc))
      return { success: false };
    const known = docs as Record<string, PathViewDoc>;
    const valid =
      Array.isArray(steps) &&
      steps.every(
        (step) =>
          Array.isArray(step) &&
          step.length > 0 &&
          step.every((ref) => isString(ref) && item(ref).doc in known),
      );
    return valid
      ? { success: true, data: { version, profile, steps: steps as string[][], docs: known } }
      : { success: false };
  },
};

/** The view for a built path. `docs` holds at least every page on it. */
export function makePathView(
  steps: readonly { readonly items: readonly { doc: string; anchor?: string | undefined }[] }[],
  docs: Readonly<Record<string, { readonly route: string; readonly titles: object }>>,
  version: string,
  profile: string,
): PathView {
  const used: Record<string, PathViewDoc> = {};
  const refs = steps.map((step) =>
    step.items.map((entry) => {
      const doc = docs[entry.doc];
      if (doc)
        used[entry.doc] = {
          route: doc.route,
          titles: { ...(doc.titles as Record<string, string>) },
        };
      return entry.anchor ? `${entry.doc}#${entry.anchor}` : entry.doc;
    }),
  );
  return { version, profile, steps: refs, docs: used };
}

/** The stored view when it is for this content and these answers, otherwise `undefined`. */
export function viewFor(
  view: PathView | null,
  version: string,
  profile: string,
): PathView | undefined {
  return view && view.version === version && view.profile === profile ? view : undefined;
}

/** `{ [docId]: ISO date-time }`, the pages marked as read (`st.path.v1`). */
type Done = Readonly<Record<string, string>>;

/** Steps done (every page marked), and the first one that is not. */
export function viewProgress(
  view: PathView,
  done: Done,
): { done: number; total: number; next: { n: number; first: ViewItem } | undefined } {
  let count = 0;
  let next: { n: number; first: ViewItem } | undefined;
  view.steps.forEach((step, index) => {
    if (step.every((ref) => item(ref).doc in done)) count++;
    else if (!next && step[0] !== undefined) next = { n: index + 1, first: item(step[0]) };
  });
  return { done: count, total: view.steps.length, next };
}

/**
 * The pages before and after `docId` on the path. `last` is true on the path's last page, where
 * the pager leads back to My path.
 */
export function viewNeighbours(
  view: PathView,
  docId: string,
): { previous: ViewItem | undefined; next: ViewItem | undefined; onPath: boolean; last: boolean } {
  const pages = view.steps.flat().map(item);
  const index = pages.findIndex((page) => page.doc === docId);
  if (index === -1) return { previous: undefined, next: undefined, onPath: false, last: false };
  return {
    previous: pages[index - 1],
    next: pages[index + 1],
    onPath: true,
    last: index === pages.length - 1,
  };
}

/** A page's route with its anchor, or `undefined` when the view does not know it. */
export function viewRoute(view: PathView, page: ViewItem): string | undefined {
  const doc = view.docs[page.doc];
  if (!doc) return undefined;
  return page.anchor ? `${doc.route}#${page.anchor}` : doc.route;
}

/** A page's title in a language, falling back to English (then with its `lang`). */
export function viewTitle(
  view: PathView,
  doc: string,
  locale: string,
): { title: string; lang: string | undefined } {
  const titles = view.docs[doc]?.titles ?? {};
  const own = titles[locale];
  if (own) return { title: own, lang: undefined };
  return { title: titles['en'] ?? doc, lang: 'en-ZA' };
}
