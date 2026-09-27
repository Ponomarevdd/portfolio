import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ponomarevdd.github.io',
  base: process.env.GITHUB_ACTIONS ? '/portfolio' : '/',
  // Preserve both backdrop-filter declarations across browsers.
  vite: { build: { cssMinify: false } },
  devToolbar: { enabled: false },
});
