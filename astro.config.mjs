import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), sitemap()],
  site: 'https://packbridge.manpuc.me',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'ko', 'zh', 'tl', 'tok'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
