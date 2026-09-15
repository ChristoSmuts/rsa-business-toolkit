import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

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
    defaultLocale: 'en',
    locales: ['en', 'af'],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    icon({ include: { lucide: ['*'] } }),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en-ZA', af: 'af-ZA' } },
      filter: (page) => !page.includes('/design-system/'),
    }),
  ],
});
