import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    sitemap({
      serialize(item) {
        if (item.url.endsWith('/terms')) {
          item.changefreq = 'monthly';
          item.priority = 0.5;
        } else {
          item.changefreq = 'weekly';
          item.priority = 1.0;
        }
        return item;
      },
    })
  ],
  site: 'https://packbridge.manpuc.me',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'ko', 'zh', 'tl', 'tok', 'es', 'fr', 'de'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
