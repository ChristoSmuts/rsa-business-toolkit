# Upstream

| | |
| --- | --- |
| Source | `addyosmani/web-quality-skills`, folder `skills/accessibility/` |
| Commit | `afa8da942115f2961fdbfa80807ea0b232ff6c00` (2026-08-24) |
| Licence | MIT, Copyright (c) 2026 Addy Osmani (`LICENSE`, copied from the repository root) |
| Vendored | 2026-10-07 |

All files are unmodified. Read them with these project notes, which `.claude/skills/stoep-design/SKILL.md` repeats:

- The tools section suggests `npx lighthouse` and a global `npm install @axe-core/cli`. Do not install anything. Use `pnpm test:a11y` (axe on every sitemap URL, both themes) and Playwright against `pnpm preview`.
- The code samples use literal colours (`#000`, `#333`, `rgba(...)`). In this project colours come only from `var(--st-*)` tokens.
- The reduced-motion sample matches what `src/styles/base.css` already does.
- The link to `../web-quality-audit/SKILL.md` points at a sibling skill that was not vendored.

To update: copy the folder at a named commit, diff it, read every change, and commit it with this table updated in one `chore(deps)` commit.
