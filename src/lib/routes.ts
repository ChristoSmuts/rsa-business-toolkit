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

/** Document ids that the navigation links to by name. */
export const NAV_DOC_IDS = {
  checklist: 'lookup/checklist',
  glossary: 'lookup/glossary',
  sources: 'lookup/sources',
  howThisWasMade: 'start/how-this-was-made',
  startHere: 'start/start-here',
} as const;
