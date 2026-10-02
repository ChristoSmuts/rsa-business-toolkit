/**
 * The navigation model: the Read menu (the six sections) and the Tools menu (build plan B2).
 *
 * Pure functions over the manifest and a translator, so the header, the mobile drawer and the
 * footer all show the same links and `tests/unit/site/nav.test.ts` can check them without a browser.
 * A link whose target the manifest does not know is dropped rather than rendered dead.
 */
import type { TranslationKey, Translator } from '../i18n';
import type { Locale } from '../i18n/locales';
import { docHref, docTitle, docTitleLang, orderedSections, sectionHref } from './content/manifest';
import type { Manifest, SectionId } from './content/schema';
import { href } from './paths';
import {
  APP_ROUTES,
  CHECKLIST_SAVES,
  NAV_DOC_IDS,
  SEARCH_AVAILABLE,
  TEMPLATES_FILLABLE,
  WIZARD_AVAILABLE,
} from './routes';
import { DEFAULT_LOCALE } from '../i18n/locales';

export interface NavLink {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly description?: string | undefined;
  /** Site-relative route (no locale prefix, no base), for the current-page comparison. */
  readonly route: string;
}

/** `true` when this link is the page the reader is on. */
export function isCurrent(link: NavLink, route: string): boolean {
  return link.route === route;
}

/** The six sections, in reading order, with the one-line descriptions from `nav.sections`. */
export function sectionLinks(manifest: Manifest, locale: Locale, t: Translator): NavLink[] {
  const links: NavLink[] = [];
  for (const section of orderedSections(manifest)) {
    const url = sectionHref(manifest, section.id, locale);
    if (url === undefined) continue;
    const id = section.id as SectionId;
    links.push({
      id,
      href: url,
      route: section.route,
      label:
        section.titles[locale] ?? section.titles[DEFAULT_LOCALE] ?? t(`nav.sections.${id}.name`),
      description: t(`nav.sections.${id}.description`),
    });
  }
  return links;
}

/** My path (once `WIZARD_AVAILABLE`), Checklist, Templates, Glossary, Sources (B2, Tools menu). */
export function toolLinks(manifest: Manifest, locale: Locale, t: Translator): NavLink[] {
  const fromDoc = (
    id: string,
    labelKey: TranslationKey,
    descriptionKey: TranslationKey,
  ): NavLink | undefined => {
    const url = docHref(manifest, id, locale);
    const route = manifest.docs[id]?.route;
    if (url === undefined || route === undefined) return undefined;
    return { id, href: url, route, label: t(labelKey), description: t(descriptionKey) };
  };
  const links: (NavLink | false | undefined)[] = [
    WIZARD_AVAILABLE && {
      id: 'my-path',
      href: href(locale, APP_ROUTES.myPath),
      route: APP_ROUTES.myPath,
      label: t('nav.myPath'),
      description: t('nav.toolDescriptions.myPath'),
    },
    fromDoc(
      NAV_DOC_IDS.checklist,
      'nav.checklist',
      CHECKLIST_SAVES ? 'nav.toolDescriptions.checklist' : 'nav.toolDescriptions.checklistStatic',
    ),
    {
      id: 'templates',
      href: href(locale, APP_ROUTES.templates),
      route: APP_ROUTES.templates,
      label: t('nav.templates'),
      description: t(
        TEMPLATES_FILLABLE
          ? 'nav.toolDescriptions.templates'
          : 'nav.toolDescriptions.templatesStatic',
      ),
    },
    fromDoc(NAV_DOC_IDS.glossary, 'nav.glossary', 'nav.toolDescriptions.glossary'),
    fromDoc(NAV_DOC_IDS.sources, 'nav.sources', 'nav.toolDescriptions.sources'),
  ];
  return links.filter((link): link is NavLink => link !== undefined && link !== false);
}

/** Contents, Common questions (until search is built), About and "How this was made". */
export function footerLinks(manifest: Manifest, locale: Locale, t: Translator): NavLink[] {
  const howMade = docHref(manifest, NAV_DOC_IDS.howThisWasMade, locale);
  const howMadeRoute = manifest.docs[NAV_DOC_IDS.howThisWasMade]?.route;
  const links: (NavLink | false | undefined)[] = [
    {
      id: 'contents',
      href: href(locale, APP_ROUTES.contents),
      route: APP_ROUTES.contents,
      label: t('nav.contents'),
    },
    // While search is not built, its page is what it holds: the common questions (WP-33 restores
    // the header link instead).
    !SEARCH_AVAILABLE && {
      id: 'common-questions',
      href: href(locale, APP_ROUTES.search),
      route: APP_ROUTES.search,
      label: t('search.commonQuestions'),
    },
    {
      id: 'about',
      href: href(locale, APP_ROUTES.about),
      route: APP_ROUTES.about,
      label: t('nav.about'),
    },
    howMade === undefined || howMadeRoute === undefined
      ? undefined
      : {
          id: NAV_DOC_IDS.howThisWasMade,
          href: howMade,
          route: howMadeRoute,
          label: t('site.howThisWasMade'),
        },
  ];
  return links.filter((link): link is NavLink => link !== undefined && link !== false);
}

/** Breadcrumb trail for a document page: home › section › document. */
export interface Crumb {
  readonly href: string | undefined;
  readonly label: string;
  /** Set when the label is not in the page's language (an untranslated document's title). */
  readonly lang?: string | undefined;
}

export function documentCrumbs(
  manifest: Manifest,
  docId: string,
  locale: Locale,
  t: Translator,
): Crumb[] {
  const entry = manifest.docs[docId];
  const crumbs: Crumb[] = [{ href: href(locale, APP_ROUTES.home), label: t('nav.home') }];
  if (!entry) return crumbs;
  const section = orderedSections(manifest).find((item) => item.id === entry.section);
  if (section) {
    crumbs.push({
      href: sectionHref(manifest, section.id, locale),
      label: section.titles[locale] ?? section.titles[DEFAULT_LOCALE] ?? section.id,
    });
  }
  crumbs.push({
    href: undefined,
    label: docTitle(manifest, docId, locale),
    lang: docTitleLang(manifest, docId, locale),
  });
  return crumbs;
}
