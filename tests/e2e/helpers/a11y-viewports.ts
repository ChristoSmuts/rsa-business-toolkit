/**
 * The viewport of each project that runs the per-page axe sweep (`tests/e2e/a11y.spec.ts`), in one
 * place. `playwright.config.ts` builds the two a11y projects from it, and the sweep checks the page
 * against it by project name, so the check does not depend on what the project happens to declare:
 * a project that lost its override would declare its device's default (Pixel 7: 412px) and pass a
 * check made against itself.
 *
 * This module has no Playwright import, so the unit tests can load it.
 */
export const A11Y_VIEWPORTS = {
  /** Desktop Chrome's own size, stated so the sweep can check it. */
  a11y: { width: 1280, height: 720 },
  /** The narrowest common Android phone. */
  'a11y-phone': { width: 360, height: 740 },
} as const;

export type A11yProject = keyof typeof A11Y_VIEWPORTS;

/** The viewport the sweep expects in `project`, or an error for a project it does not know. */
export function a11yViewport(project: string): { width: number; height: number } {
  if (!Object.hasOwn(A11Y_VIEWPORTS, project)) {
    throw new Error(
      `The axe sweep has no expected viewport for project "${project}". ` +
        'Add it to A11Y_VIEWPORTS in tests/e2e/helpers/a11y-viewports.ts.',
    );
  }
  return A11Y_VIEWPORTS[project as A11yProject];
}
