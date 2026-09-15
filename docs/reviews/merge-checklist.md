# Merge checklist

Tasks the orchestrator committed to doing when work packages merge into `main`. Tick each one when done and note the commit.

## When WP-22a (test harness) merges

- [ ] Switch `tests/e2e/smoke.spec.ts` to import `test` and `expect` from `tests/e2e/fixtures.ts`, and remove its entry from `KNOWN_DIRECT_PLAYWRIGHT_IMPORTS` in `tests/unit/e2e-harness.test.ts`.
- [ ] Check that `pnpm test` passes after the merge; the "no direct `@playwright/test` import" check must stay green.

## When WP-11 (design system) and WP-22a have both merged

- [ ] Switch `tests/e2e/design-system.spec.ts` to import from `tests/e2e/fixtures.ts`.
- [ ] Give the placeholder home page a meta description through `Base.astro`, so the Lighthouse SEO assertion passes.
- [ ] Remove the home-page entry from `tests/e2e/helpers/exceptions.ts` once the home page renders through `Base.astro`; the stale-exception check will fail until it is removed.

## When WP-12 (i18n) merges

- [ ] Add `tsc --noEmit -p .` to `gate:fast` in `package.json` (WP-12 pass 1 nit n6).
- [ ] Fix the three deferred nits recorded in `docs/reviews/backlog.md` (P1–P3) in a small follow-up commit.
- [ ] Add UI strings for the per-page AI notice and verification status required by build plan D5: the notice sentence with `{date}`, "AI-checked", "Checked by {reviewer}", "Sources for this page", and the source-note text for pages without their own sources. Both `en.json` and `af.json`, regenerate `ParamNames`, and run the i18n tests.

## When WP-10 (content pipeline) merges

- [ ] Merge `main` into the WP-10 branch first, so it picks up the content corrections in `34175e9` and `745e387`, then run `pnpm content:build` and commit the regenerated `src/data`. `pnpm content:drift` must be clean.
- [ ] Squash-merge with a `feat(content):` message, replacing the `chore(content): wip checkpoint` subject.
- [ ] Rebase or merge `content/af-glossary` onto the merged pipeline, drop its `scripts/translate/TERMS-af.json` changes in favour of the pipeline branch's version, then start the glossary fix round (review `WP-40-glossary-pass1.md`, `’n`, notes file rename, fidelity over glossary definitions, stale `sourceHash` after the English corrections).
- [ ] Start the accuracy review phase (build plan P4a): the WP-45 fact inventory first, then the topic reviewers.

## Before any page package starts

- [ ] Page and component briefs must include build plan D5: the AI notice near the top of every content page, the "Sources for this page" section from `doc.sources`, dated facts, and no overclaiming.
