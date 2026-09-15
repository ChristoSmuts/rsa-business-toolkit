import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { DEFAULT_LOCALE, ENABLED_LOCALES, sitemapLocales } from './src/i18n/locales';

function normaliseBase(raw: string | undefined): string {
  const value = (raw ?? '/business-toolkit/').trim();
  if (value === '' || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

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
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...ENABLED_LOCALES],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    icon({ include: { lucide: ['*'] } }),
    sitemap({
      i18n: { defaultLocale: DEFAULT_LOCALE, locales: sitemapLocales() },
      filter: (page) => !page.includes('/design-system/'),
    }),
  ],
});
