Local SVG icons go here.

The project uses Lucide through astro-icon (`astro.config.ts`), so this folder is empty.
It exists because astro-icon reads its `iconDir` on every build and warned
`Failed to load icons from "src/icons": ENOENT` on every run, which is noise in CI logs.
Drop an `icon.svg` here to use it as `<Icon name="local:icon" />`.
