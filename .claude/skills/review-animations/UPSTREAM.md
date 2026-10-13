# Upstream

| | |
| --- | --- |
| Source | `emilkowalski/skills`, folder `skills/review-animations/` |
| Commit | `e8a175de22ae1e49370fc144c1f3bb9aeedf988d` (2026-10-02) |
| Licence | MIT, Copyright (c) 2026 Emil Kowalski (`LICENSE`, copied from the repository root) |
| Vendored | 2026-10-07 |

All files are unmodified. `disable-model-invocation: true` means it runs only when someone asks for it (`/review-animations`). It reviews and never edits.

Project notes:

- Framer Motion, `useSpring` and `useReducedMotion` examples do not apply: there is no UI framework. Read them as the CSS or WAAPI equivalent.
- Easing curves and durations become tokens in `src/styles/tokens.css` (`--st-ease`, `--st-duration-*`), not literals in components.
- Its reduced-motion rule ("gentler, not zero") is now the project rule too (WP-50 decision D3, 13 October 2026): under `prefers-reduced-motion` opacity, colour and shadow changes stay at 120ms or less and every movement goes. `base.css` enforces it; `docs/design-system.md` ("Motion") has the details.
- The two easing websites it names are for a human to browse. Agents must not fetch them.

To update: copy the folder at a named commit, diff it, read every change, and commit it with this table updated in one `chore(deps)` commit.
