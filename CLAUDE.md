# SA Business Toolkit web app

Static Astro 7 site that turns `docs/rsa-business-toolkit/` (markdown, English) and `docs/rsa-business-toolkit-af/` (Afrikaans, machine translated) into a searchable, bilingual, accessible guide for one-person South African businesses. Deployed to GitHub Pages under a configurable base path.

The full approved build plan is `docs/build-plan.md`. Read the part that covers your work package before starting.

## Commands

| Command                           | What it does                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                        | Astro dev server                                            |
| `pnpm content:build`              | Regenerate `src/data/**` JSON from the markdown             |
| `pnpm content:check`              | Schema, link, anchor, forbidden-string and dictionary tests |
| `pnpm content:fidelity --lang af` | EN/AF structural and fact equality check                    |
| `pnpm build`                      | content + search index + `astro build`                      |
| `pnpm test`                       | Vitest unit + dom                                           |
| `pnpm test:e2e`                   | Playwright against `astro preview` under the base path      |
| `pnpm test:a11y`                  | axe over every sitemap URL                                  |
| `pnpm gate:fast`                  | lint, typecheck, unit, content drift, content checks        |
| `pnpm gate`                       | everything CI runs                                          |

## Rules

- Markdown in `docs/` is the source of truth. Never hand-edit `src/data/**`; rerun `pnpm content:build`.
- All internal links go through `href()` from `src/lib/paths.ts`. No `href="/..."` literals.
- `localStorage` only via `src/lib/store.ts` and `src/lib/storage/`. Keys start with `st.`.
- Colours only via `var(--st-*)` tokens. Literal colours are allowed only in `src/styles/tokens.css`.
- No UI framework. Interactive pieces are vanilla TypeScript custom elements (`st-*`) that enhance server-rendered HTML. Every page must work without JavaScript.
- Every UI string lives in `src/i18n/en.json` and `src/i18n/af.json` with identical keys.
- Heading ids are English slugs in every language, so anchors are shared.
- Afrikaans keeps numbers, rand amounts, form codes, URLs and placeholder counts byte-identical to English.
- Every content page shows an "AI-generated" notice near the top and a "Sources for this page" section built from `doc.sources`. See `docs/build-plan.md` D5 and `docs/adr/0006-ai-disclosure-and-accuracy.md`.
- Content that is found to be wrong is fixed in the English markdown under `docs/rsa-business-toolkit/` with a `fix(content):` commit that cites an official source. Never fix facts only in generated JSON or in a translation.
- Only free and open-source libraries. No third-party network requests at runtime.
- Run `pnpm gate:fast` before claiming a change is done. Paste real output, never a summary.

## Windows notes

- Paths with spaces in `docs/`: use `node:fs` and `node:path`, never shell globbing.
- Scripts that set env vars use `cross-env`.
- Playwright browsers are already installed under `%LOCALAPPDATA%\ms-playwright`.
- Line endings are LF everywhere (`.gitattributes`), except `.ps1`.

## Commits

Conventional Commits. Scopes: content, af, design, components, pages, i18n, wizard, search, templates, tests, ci, docs, deps.
