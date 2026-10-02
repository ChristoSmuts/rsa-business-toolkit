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
 * Whether the wizard (`find-my-path/`) and My path (`my-path/`) are built. They are WP-31. Until
 * then no page links to them: not the Tools menu, not the drawer, not the home page's primary
 * button, and not the trust line about "your answers", because a link to a page that does not
 * exist is a 404 on the deployed site, whatever the link audit allows (review WP-20 pass 2).
 * WP-31 sets this to `true` in the change that builds the two routes.
 */
export const WIZARD_AVAILABLE: boolean = false;

/**
 * Whether the search client (WP-33) is built. Until then `/search/` and the 404 page show no search
 * form, because a form whose submission only reloads the page is a control that does nothing, and
 * the home page does not offer search as its main action (review WP-20 pass 3). The search page
 * still lists the common questions and links the contents.
 */
export const SEARCH_AVAILABLE: boolean = false;

/**
 * Whether the templates can be filled in and printed (WP-32). Until then every description says
 * what the template pages are now: what each document must show, with a sample layout.
 */
export const TEMPLATES_FILLABLE: boolean = false;

/** Document ids that the navigation links to by name. */
export const NAV_DOC_IDS = {
  checklist: 'lookup/checklist',
  glossary: 'lookup/glossary',
  sources: 'lookup/sources',
  howThisWasMade: 'start/how-this-was-made',
  startHere: 'start/start-here',
} as const;
