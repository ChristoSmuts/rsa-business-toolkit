/**
 * `tsc -p .` (in `pnpm gate:fast`) does not read `.astro` files; `astro check` types them. This
 * lets a test import a component to render it with Astro's container API.
 */
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  const component: AstroComponentFactory;
  export default component;
}
