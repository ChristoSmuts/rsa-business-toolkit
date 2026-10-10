---
name: stoep-design
description: House rules for any visual, UX or frontend change in the SA Business Toolkit (the Stoep design system). Use before designing, restyling or reviewing a page, component, token, layout, motion or copy in the UI, and whenever another design skill (frontend-design, web-interface-guidelines, accessibility, review-animations) is in use. Its rules override theirs.
---

# Stoep design: house rules

This site is a free, bilingual (English and Afrikaans) reference guide for people starting a one-person business in South Africa. Readers are often on a cheap Android phone, on prepaid data, reading about tax for the first time and a little anxious about it. The design's job is to make them feel they are in safe, competent hands and to get them to the right paragraph fast. It is not a marketing site.

Read `docs/design-system.md` before changing anything visual. It is the record of every decision, with the measured numbers behind it. `src/styles/tokens.css` is the source of truth for every colour and scale. During the design revamp, also read `docs/work-packages/WP-50-design-revamp.md`.

## The brief, for design skills that ask for one

- **Subject:** small-business admin in South Africa (CIPC, SARS, VAT, UIF, licences, invoices), told in plain words.
- **Audience:** first-time owners, many reading in their second language, on a phone.
- **Primary job:** answer "what do I have to do, and what does it cost?" and let them act on it (a checklist, a template, a path).
- **Tone:** calm, warm, plain, trustworthy. Never salesy, never playful about money or the law, never "government portal" grey.
- **Where boldness may go:** one memorable element per page type, chosen in the revamp plan. Everything else stays quiet.

When `frontend-design` asks you to take aesthetic risk, take it inside this brief. A distinctive layout that slows a nervous reader down is a regression.

## Hard rules (from CLAUDE.md and the build plan; never traded away)

1. **No UI framework.** Server-rendered Astro HTML, enhanced by vanilla TypeScript custom elements named `st-*`. No React, Vue, Svelte, Tailwind, shadcn, GSAP or Framer Motion. Advice written for those means its plain CSS or DOM equivalent.
2. **Every page works without JavaScript.** Enhancement only. `tests/e2e/nojs.spec.ts` guards this.
3. **Colours only through `var(--st-*)`.** Literal colours live only in `src/styles/tokens.css`, and Stylelint enforces it. A palette a skill proposes as "4 to 6 hex values" becomes tokens, with every text, control and focus pair added to `CONTRAST_PAIRS` in `src/scripts/color.ts` and verified (4.5:1 text, 3:1 controls and focus).
4. **No third-party requests at runtime.** No Google Fonts, no CDN scripts or icons, no `preconnect` to another origin. Fonts are self-hosted through `@fontsource-variable/*` packages with metric-matched fallbacks; a new typeface must be free and open-source and come the same way.
5. **Light and dark themes are equal.** Both palette blocks in `tokens.css` must stay identical in shape (a unit test compares them). Print always uses the light palette.
6. **JavaScript budgets** (`pnpm dist:budget`): 25 KB gzipped on document pages, 45 KB on tool pages. The heaviest document page (`/af/business-types/food/`) is at 24.0 KB after WP-50a, 1.0 KB under the limit (the live figure is in `docs/testing.md` and in every `pnpm build`), so new motion or interaction should be CSS first.
7. **WCAG 2.2 AA**, checked by axe on every sitemap URL in both themes (`pnpm test:a11y`). Targets at least 44px (`--st-target`). Links stay underlined. Colour never carries meaning alone: every status has an icon and words.
8. **Translation-proof layout.** Afrikaans runs up to 25% longer. Nothing truncates and nothing gets `white-space: nowrap` if it is translated. Test at 320px with the longest real Afrikaans string. Heading ids are English slugs in both languages.
9. **Every content page** keeps the AI-generated notice near the top and "Sources for this page" (ADR 0006). They can be restyled; they cannot be demoted below the fold or hidden in a disclosure.
10. **Copy:** sentence case in both languages, active voice, plain verbs. UI strings live in `src/i18n/en.json` and `af.json` with identical keys. Guide content comes from the markdown in `docs/`; never hand-edit `src/data/**`.
11. **Print matters.** Checklists and templates are printed. `src/styles/print.css` and the template print tests must keep passing.
12. **Links** go through `href()` from `src/lib/paths.ts`; storage only through `src/lib/store.ts` with `st.` keys.

## How the other design skills fit

| Skill | Use it for | Watch for |
| --- | --- | --- |
| `frontend-design` (Anthropic) | Direction: brainstorm a plan, check it against the brief, build, critique. Its list of generic "AI design" looks and its copy rules. | It pushes risk and novelty. Its first generic look (warm cream background, high-contrast serif, terracotta accent) is close to current Stoep; see WP-50 before deciding anything about it. |
| `web-interface-guidelines` (Vercel, pinned locally) | A terse, checkable review of a component or page: focus, forms, motion, typography, i18n, anti-patterns. | Its own overrides table. |
| `accessibility` (Addy Osmani) | WCAG 2.2 audits and fixes, organised by POUR. | Use `pnpm test:a11y`, never a global install. A clean axe run is not conformance; do the manual checks too. |
| `review-animations` (Emil Kowalski) | Reviewing any motion. Run it by name; it only reviews. | Framework examples; the reduced-motion rule (see its `UPSTREAM.md`). |

Order of work for a design change: this skill, then `frontend-design` for direction, then build, then `web-interface-guidelines` and `accessibility` as review, plus `review-animations` if anything moves.

## Checks before calling a design change done

- `pnpm gate:fast`, `pnpm build` (includes `dist:audit`, `dist:trust`, `dist:budget`), e2e for chromium, mobile and nojs, and `pnpm test:a11y`. Paste real output.
- Look at it: `/design-system/` (every token and component, with a live contrast panel) and the changed pages, at 320px, 768px and 1280px, in light, dark, forced colours, 200% zoom and print preview, in both languages. Take screenshots when the environment allows and compare before and after.
- Update `docs/design-system.md` in the same change: rationale, measured contrast for any new pair, and the do/don't table if a rule changed.
