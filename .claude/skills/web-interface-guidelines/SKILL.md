---
name: web-interface-guidelines
description: Review UI code (Astro components, CSS, custom elements) against Vercel's Web Interface Guidelines, with this project's overrides. Use when asked to review UI, audit a page or component, check interaction details, or before handing a design change to review.
argument-hint: <file-or-pattern>
---

# Web Interface Guidelines review

Review the files the user names (or ask which files) against the rules in [guidelines.md](guidelines.md), a pinned local copy of Vercel's Web Interface Guidelines. Do not fetch the rules from the web: the local copy is the one this project reviewed and agreed to. To update it, follow `UPSTREAM.md`.

Read `.claude/skills/stoep-design/SKILL.md` first. Where the two disagree, the Stoep rules win.

## Project overrides

Apply every rule in `guidelines.md` except these:

| Upstream rule | In this project |
| --- | --- |
| Title Case for headings and buttons (Chicago) | Sentence case everywhere, in English and Afrikaans. Title Case does not exist in Afrikaans and reads as shouting in plain-language copy. |
| Curly quotes, not straight | Follow the source markdown. Content text is generated from `docs/`; never hand-edit quotes in `src/data/**`. UI strings in `src/i18n/*.json` may use curly quotes. |
| `<link rel="preconnect">` for CDN or asset domains | Not applicable. The site makes no third-party requests at runtime (CLAUDE.md, CSP). Flag any new external origin as a finding. |
| Detect language via `Accept-Language` or `navigator.languages` | Not applicable. Language is chosen by the URL (`/af/`) and the language switcher, never detected. |
| `autocomplete="off"` on non-auth fields | Keep the existing pattern: template fields that hold the reader's own business details get a real `autocomplete` token (`AUTOCOMPLETE` in `TemplateField.astro`), and the rest are `off`. Flag a new field that breaks it. |
| Hydration safety section | Not applicable. There is no UI framework and no hydration; pages are server-rendered HTML enhanced by `st-*` custom elements. |
| `focus-visible:ring-*`, `min-w-0`, `truncate`, `line-clamp-*` | These are Tailwind names. Read them as the CSS they stand for (`:focus-visible` outline from `--st-focus`, `min-inline-size: 0`, and so on). Never truncate translated text: let it wrap. |
| Virtualise lists over 50 items (`virtua`) | Use `content-visibility: auto` if a list is slow; no new runtime libraries. |
| URL reflects state (nuqs) | Same principle, without a library: filters, tabs and open panels that matter belong in the query string or the hash, and the page must work without JavaScript. |
| `prefers-reduced-motion`: provide a reduced variant | The current rule in `src/styles/base.css` and `tokens.css` sets durations to near zero. Keep that until the design revamp (WP-50) decides otherwise. |

## Output

Use the output format at the end of `guidelines.md`: findings grouped by file, `file:line - issue`, terse. Add a final line naming any rule you skipped because of an override above, so a reader can tell "passed" from "not checked".
