import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import sentry from '@sentry/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), sitemap({
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
  }), sentry({
    project: "packbridge",
    org: "student-yfr",
    authToken: process.env.SENTRY_AUTH_TOKEN,
  })],
  site: 'https://packbridge.manpuc.me',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'ko', 'zh', 'tl', 'tok', 'es', 'fr', 'de'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});