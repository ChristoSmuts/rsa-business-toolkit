# Agent skills

Claude Code loads every folder here that holds a `SKILL.md`. ADR 0007 records why these were chosen and the rules for adding or updating one.

| Skill | Owner | What it is for |
| --- | --- | --- |
| `stoep-design` | this project | House rules for any UI change. Overrides the others. |
| `frontend-design` | Anthropic, Apache-2.0 | Design direction: plan, check against the brief, build, critique |
| `web-interface-guidelines` | Vercel rules, MIT; wrapper by this project | Terse review of components and pages |
| `accessibility` | Addy Osmani, MIT | WCAG 2.2 audit and fixes |
| `review-animations` | Emil Kowalski, MIT | Motion review; runs only when asked for by name |

Each vendored folder has an `UPSTREAM.md` with the pinned commit and the project notes. Don't edit vendored files; put differences in `UPSTREAM.md`, in a project wrapper, or in `stoep-design`. Never vendor a skill that fetches remote content, installs packages or runs scripts.

Prettier and ESLint ignore `.claude/` (`.prettierignore`, `eslint.config.js`), so vendored files stay byte-identical to upstream.
