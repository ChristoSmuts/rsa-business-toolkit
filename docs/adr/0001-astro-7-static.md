# 0001: Astro 7 static site on GitHub Pages

- Status: accepted
- Date: 2026-09-15

## Context

The toolkit is about 68,500 words of guidance that changes a few times a year. It must be hosted on GitHub Pages for now, with data kept in JSON files and no backend. The brief asked for Astro.

## Decision

Use Astro 7.3.2 with `output: 'static'`, `trailingSlash: 'always'` and `build.format: 'directory'`. The base path comes from the `BASE_PATH` environment variable and defaults to `/business-toolkit/`. The site origin comes from `SITE_URL`. Every internal link is built by `href()` in `src/lib/paths.ts`, and ESLint rejects root-relative URLs in `.astro` files.

The plan text mentioned Astro 5. Astro 7 was the current stable release when the build started, and nothing in the plan depends on version 5.

## Consequences

- GitHub Pages serves `dir/index.html` and redirects `/dir` to `/dir/`, so trailing slashes avoid a redirect hop and keep canonical URLs stable.
- The Astro 7 compiler rejects invalid HTML, which catches markup errors at build time.
- Changing to a custom domain later means changing two repository variables.
