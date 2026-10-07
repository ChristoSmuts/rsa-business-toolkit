/**
 * The routes that are not generated from a document (build plan B1). Document and section routes
 * come from the manifest; these are the tool and utility pages the app adds around them.
 *
 * Site-relative, always with a trailing slash, never with a leading one: they are passed to
 * `href()`, which adds the base path and the locale prefix.
 */
export const APP_ROUTES = {
  home: '',
  wizard: 'find-my-path/',
  myPath: 'my-path/',
  search: 'search/',
  contents: 'contents/',
  templates: 'templates/',
  about: 'about/',
  designSystem: 'design-system/',
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/**
 * Whether the wizard (`find-my-path/`, with its pre-rendered result pages) and My path
 * (`my-path/`) are built. WP-31 built them. While this was `false` no page linked to them (the
 * Tools menu, the drawer, the home page's primary button, the trust line about "your answers"),
 * because a link to a page that does not exist is a 404 on the deployed site (review WP-20 pass 2).
 * On, those links are back, and the personalisation WP-31 adds is rendered: the top bar's path
 * ring, the home page's "Your path" card, "Only what applies to me", the path-following pager and
 * "Fill from my profile".
 */
export const WIZARD_AVAILABLE: boolean = true;

/**
 * Whether the search client (WP-33) is built. Until then `/search/` and the 404 page show no search
 * form, because a form whose submission only reloads the page is a control that does nothing, and
 * the home page does not offer search as its main action (review WP-20 pass 3). The search page
 * still lists the common questions and links the contents.
 */
export const SEARCH_AVAILABLE: boolean = false;

/**
 * Whether the templates can be filled in and printed (WP-32, built). On, each template page is a
 * form with a live preview (`TemplateTool`), and the templates index and the Tools menu say "fill in
 * and print". Off, every description says what the pages would then be: what each document must
 * show, with a sample layout, and the template pages render as plain documents.
 */
export const TEMPLATES_FILLABLE: boolean = true;

/**
 * Whether checklist ticks are saved on the device. WP-30 built it (`<st-checklist>`, the `checks`
 * store). Off, the checkboxes work but a reload clears them: the wording says "print and tick" and
 * every checklist page says ticks are not saved yet (review WP-20 pass 4). On, the Tools menu says
 * "Tick each item when you finish it", `/checklist/` gets its progress, filter and reset, and the
 * first checklist on a page says ticks are saved on this device (or, without JavaScript, that they
 * are not saved). `tests/e2e/pages.spec.ts` checks the line for whichever value is set.
 */
export const CHECKLIST_SAVES: boolean = true;

/** Document ids that the navigation links to by name. */
export const NAV_DOC_IDS = {
  checklist: 'lookup/checklist',
  glossary: 'lookup/glossary',
  sources: 'lookup/sources',
  howThisWasMade: 'start/how-this-was-made',
  startHere: 'start/start-here',
} as const;
