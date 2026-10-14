import { defineConfig } from 'astro/config';
import typograph from './integrations/typograph.mjs';

export default defineConfig({
  site: 'https://ponomarevdd.github.io',
  base: process.env.GITHUB_ACTIONS ? '/portfolio' : '/',
  // Preserve both backdrop-filter declarations across browsers.
  vite: { build: { cssMinify: false } },
  devToolbar: { enabled: false },
  integrations: [typograph()],
});
