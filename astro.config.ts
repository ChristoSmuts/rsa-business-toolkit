import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { normaliseBase } from './scripts/base-path';
import { plainSearchImport } from './scripts/search/plain-import';
import { DEFAULT_LOCALE, ENABLED_LOCALES, sitemapLocales } from './src/i18n/locales';

const site = process.env.SITE_URL ?? 'https://example.github.io';
const base = normaliseBase(process.env.BASE_PATH);

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: { format: 'directory', assets: '_astro', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  vite: {
    // The search dialog's script is imported without Vite's preload wrapper (WP-33 pass 21).
    plugins: [plainSearchImport()],
    build: {
      // Never inline processed <script> bundles or `?url` assets (data: URIs): the meta CSP is
      // `script-src 'self'`, so every script must be an external same-origin file. Stylesheets
      // are different: `style-src` allows 'unsafe-inline', and a few hundred bytes of scoped
      // page CSS is better inlined than fetched as an extra render-blocking request on a slow
      // phone. Vite's function form says exactly that: `false` never inlines, `undefined` falls
      // back to the default size limit, which is what Astro's `inlineStylesheets: 'auto'` uses.
      assetsInlineLimit: (filePath: string) => (filePath.endsWith('.css') ? undefined : false),
      rollupOptions: {
        output: {
          /*
           * Only the chunk carrying the design tokens is `stoep.*`; page CSS and fonts keep
           * Rollup's own name, so DevTools and budget reports can tell the shared design system
           * from one page's styles.
           *
           * Match on the chunk's content, not on `originalFileNames`: Vite merges the layout's
           * stylesheets into a single asset whose `originalFileNames` points at whichever
           * component it happened to see first, which is how the shared file came out named
           * `Logo.*.css`. `--st-tint-strength` only ever comes from `tokens.css`.
           */
          assetFileNames: (asset) => {
            const source = typeof asset.source === 'string' ? asset.source : '';
            const hasTokens =
              source.includes('--st-tint-strength') ||
              asset.originalFileNames.some((name) => /src[\\/]styles[\\/]tokens\.css$/.test(name));
            return hasTokens ? '_astro/stoep.[hash][extname]' : '_astro/[name].[hash][extname]';
          },
        },
      },
    },
  },
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...ENABLED_LOCALES],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    icon({ include: { lucide: ['*'] } }),
    sitemap({
      i18n: { defaultLocale: DEFAULT_LOCALE, locales: sitemapLocales() },
      // The wizard's no-JavaScript result pages are `noindex`: they repeat the guide for one reader.
      filter: (page) =>
        !page.includes('/design-system/') && !page.includes('/find-my-path/result/'),
    }),
  ],
});
