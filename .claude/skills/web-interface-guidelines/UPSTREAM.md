# Upstream

| | |
| --- | --- |
| Source | `vercel-labs/web-interface-guidelines`, file `command.md` |
| Commit | `434b7f91364665f2f733b310ec54809bf8f37937` (2026-10-05) |
| Licence | MIT, Copyright (c) 2025 Vercel Labs (`LICENSE`) |
| Vendored | 2026-10-07 |

`guidelines.md` is `command.md` byte for byte. `SKILL.md` is written for this project. It replaces Vercel's wrapper (`vercel-labs/agent-skills/skills/web-design-guidelines/SKILL.md`), which fetches the rules from `raw.githubusercontent.com` on every run, so an unpinned file would become instructions to the agent. That wrapper is not copied here, so its licence does not apply.

To update: download `command.md` at a named commit, diff it against `guidelines.md`, read every changed rule, check it against the overrides table in `SKILL.md`, then replace the file and this table in one `chore(deps)` commit.
