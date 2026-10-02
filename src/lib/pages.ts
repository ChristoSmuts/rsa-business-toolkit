/**
 * The page model for WP-20 milestone 2: which routes the site builds from the manifest, in which
 * languages, in what reading order, and what each one's `<head>` says.
 *
 * Pure: the manifest and documents are passed in, so `tests/unit/site/pages.test.ts` checks every
 * rule here without Astro. The page files under `src/pages/[...locale]/` only call these.
 */
import type { Translator } from '../i18n';
import { DEFAULT_LOCALE, ENABLED_LOCALES, type Locale } from '../i18n/locales';
import { docHref, docTitle, docTitleLang, orderedSections, sectionTitle } from './content/manifest';
import { EffortSchema, type Doc, type Effort, type Manifest } from './content/schema';
import { hasOwnSources } from './content/trust';
import { href } from './paths';
import { APP_ROUTES } from './routes';

/** A route generated from the manifest: a document, or a section landing with no document. */
export type ContentPage =
  | {
      readonly kind: 'doc';
      readonly route: string;
      readonly docId: string;
      readonly sectionId: string;
    }
  | { readonly kind: 'section'; readonly route: string; readonly sectionId: string };

/**
 * Every document route and every section landing, in reading order.
 *
 * A section whose route is also a document's route (`business-types/` is the "Pick your business
 * type" document) gets no separate landing: the document is the landing. A route that collides
 * with an app route (`templates/`, `about/` …) or with another content route throws, because two
 * pages cannot be built at one URL and the build would otherwise keep whichever came last.
 */
export function contentPages(manifest: Manifest): ContentPage[] {
  const pages: ContentPage[] = [];
  const docRoutes = new Set(Object.values(manifest.docs).map((doc) => doc.route));
  for (const section of orderedSections(manifest)) {
    if (!docRoutes.has(section.route)) {
      pages.push({ kind: 'section', route: section.route, sectionId: section.id });
    }
    for (const docId of section.docs) {
      const entry = manifest.docs[docId];
      if (!entry)
        throw new Error(`Section ${section.id} lists ${docId}, which the manifest lacks.`);
      pages.push({ kind: 'doc', route: entry.route, docId, sectionId: section.id });
    }
  }
  const listed = new Set(pages.flatMap((page) => (page.kind === 'doc' ? [page.docId] : [])));
  const unlisted = Object.keys(manifest.docs).filter((id) => !listed.has(id));
  if (unlisted.length > 0) {
    throw new Error(
      `No section lists these documents, so no page would show them: ${unlisted.join(', ')}`,
    );
  }
  const reserved = new Set<string>(Object.values(APP_ROUTES));
  const seen = new Set<string>();
  for (const page of pages) {
    if (reserved.has(page.route)) {
      throw new Error(`Content route "${page.route}" is also an app route in src/lib/routes.ts.`);
    }
    if (seen.has(page.route)) throw new Error(`Two content pages share the route "${page.route}".`);
    seen.add(page.route);
  }
  return pages;
}

/** `core/register/` → `core/register`, the form a `[...route]` param takes. */
export function routeParam(route: string): string {
  return route.replace(/^\/+|\/+$/g, '');
}

export interface ContentStaticPath {
  params: { locale: string | undefined; route: string };
  props: { locale: Locale; page: ContentPage };
}

/** `getStaticPaths` for `src/pages/[...locale]/[...route].astro`: every content page, every locale. */
export function contentStaticPaths(manifest: Manifest): ContentStaticPath[] {
  const pages = contentPages(manifest);
  return ENABLED_LOCALES.flatMap((locale) =>
    pages.map((page) => ({
      params: {
        locale: locale === DEFAULT_LOCALE ? undefined : locale,
        route: routeParam(page.route),
      },
      props: { locale, page },
    })),
  );
}

/**
 * The languages a document has its own text in, in `ENABLED_LOCALES` order. Used to choose the
 * language the blocks render in (`docContentLang`). It does not decide `hreflang`: every page is
 * listed in every enabled locale, as the sitemap lists it (see `Page.astro`).
 */
export function docLocales(manifest: Manifest, docId: string): Locale[] {
  const langs = new Set(manifest.docs[docId]?.langs ?? []);
  return ENABLED_LOCALES.filter((locale) => langs.has(locale));
}

/** The language the blocks of a document are rendered in for a reader's locale. */
export function docContentLang(manifest: Manifest, docId: string, locale: Locale): Locale {
  return docLocales(manifest, docId).includes(locale) ? locale : DEFAULT_LOCALE;
}

export interface PagerLink {
  readonly href: string;
  readonly title: string;
  /** `lang` of the title when it is not in the reader's language. */
  readonly lang: string | undefined;
  readonly docId: string;
}

export interface Pager {
  readonly previous: PagerLink | undefined;
  readonly next: PagerLink | undefined;
}

/**
 * Previous and next document in reading order across the whole guide (build plan B2: section
 * order when there is no personalised path). The last page of one section leads to the first of
 * the next, so a reader who reads straight through never hits a dead end mid-guide.
 */
export function docPager(manifest: Manifest, docId: string, locale: Locale): Pager {
  const order = orderedSections(manifest).flatMap((section) => section.docs);
  const index = order.indexOf(docId);
  const link = (id: string | undefined): PagerLink | undefined => {
    if (id === undefined) return undefined;
    const url = docHref(manifest, id, locale);
    return url === undefined
      ? undefined
      : {
          href: url,
          title: docTitle(manifest, id, locale),
          lang: docTitleLang(manifest, id, locale),
          docId: id,
        };
  };
  if (index === -1) return { previous: undefined, next: undefined };
  return { previous: link(order[index - 1]), next: link(order[index + 1]) };
}

/**
 * A translated sentence split around one of its parameters, so the parameter's text can carry its
 * own `lang` (an English title inside "Vorige: {title}"). `render` is the translator call with the
 * parameter set to the marker this function passes in.
 */
export function splitAroundParam(render: (marker: string) => string): [string, string] {
  const marker = '\u0000';
  const text = render(marker);
  const index = text.indexOf(marker);
  if (index === -1) return [text, ''];
  return [text.slice(0, index), text.slice(index + marker.length)];
}

/** `<title>`: "Doc · Section · SA Business Toolkit", or "Page · SA Business Toolkit" (B5). */
export function pageTitle(t: Translator, page: string, section?: string | undefined): string {
  const site = t('site.name');
  return section === undefined || section === page
    ? t('site.titleTemplateShort', { page, site })
    : t('site.titleTemplate', { page, section, site });
}

/** The `<title>` of a content page. */
export function contentPageTitle(
  manifest: Manifest,
  page: ContentPage,
  locale: Locale,
  t: Translator,
): string {
  const section = sectionTitle(manifest, page.sectionId, locale);
  return page.kind === 'doc'
    ? pageTitle(t, docTitle(manifest, page.docId, locale), section)
    : pageTitle(t, section);
}

/**
 * Build plan D5: every document page shows its own sources, or a note saying why it has none.
 * Throws, so `astro build` fails, rather than publishing a guide, template, checklist or
 * business-type page whose "Sources for this page" section would be empty.
 */
export function assertDocTrust(doc: Pick<Doc, 'id' | 'sources' | 'sourceNote'>): void {
  if (hasOwnSources(doc.sources)) return;
  if (doc.sourceNote && doc.sourceNote.reason.trim() !== '') return;
  throw new Error(
    `${doc.id} has no sources of its own and no source note, so its page cannot show ` +
      '"Sources for this page" (build plan D5). Map its sources in the content pipeline or give it a note.',
  );
}

/** The `canonical` URL of a page: itself, absolute, under the base. */
export function canonicalUrl(locale: Locale, route: string, site: string | URL): string {
  return new URL(href(locale, route), site).href;
}

/** A business type's effort word as the 1–5 the meter shows, lowest first (schema order). */
export function effortLevel(effort: Effort): 1 | 2 | 3 | 4 | 5 {
  return (EffortSchema.options.indexOf(effort) + 1) as 1 | 2 | 3 | 4 | 5;
}

/** The design system's short name for a section's hue (`business-types` is `types`). */
export type SectionHue = 'start' | 'core' | 'branding' | 'paperwork' | 'types' | 'lookup';

export function sectionHue(sectionId: string): SectionHue | undefined {
  const hues: Record<string, SectionHue> = {
    start: 'start',
    core: 'core',
    branding: 'branding',
    paperwork: 'paperwork',
    'business-types': 'types',
    lookup: 'lookup',
  };
  return hues[sectionId];
}

/**
 * The most recent `verification.checkedOn` among some documents (`YYYY-MM-DD` sorts as a date).
 * Pages that summarise many documents say "most recently on {date}" with this, because the
 * documents were not all checked on one day (review WP-20 pass 4).
 */
export function latestCheck(docs: readonly Pick<Doc, 'verification'>[]): string | undefined {
  return docs
    .map((doc) => doc.verification.checkedOn)
    .sort()
    .at(-1);
}
