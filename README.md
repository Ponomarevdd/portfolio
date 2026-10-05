# Портфолио Дмитрия

Полный проект: сайт, концепты и исходные графические материалы.

- `site/` — сайт на Astro.
- `concepts/` — дизайн-концепты.
- `assets-generated/` — исходные изображения.

## Запуск на другом компьютере

Установите Node.js 24 и pnpm 11.19.0, затем:

```sh
git clone https://github.com/Ponomarevdd/portfolio.git
cd portfolio/site
pnpm install --frozen-lockfile
pnpm dev
```

Сайт откроется на http://127.0.0.1:4321/.

GitHub Pages автоматически публикуется из `site/` при обновлении `main`:
https://ponomarevdd.github.io/portfolio/
