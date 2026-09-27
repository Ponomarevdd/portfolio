import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ponomarevdd.github.io',
  base: process.env.GITHUB_ACTIONS ? '/portfolio' : '/',
  devToolbar: { enabled: false },
});
