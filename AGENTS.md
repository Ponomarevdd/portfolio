# Project conventions

- Use Iconsax for all interface icons in this project. Do not substitute Unicode symbols, emoji, or icons from other libraries.
- Use the existing `site/src/components/Iconsax.astro` component and SVG assets in `site/src/assets/iconsax/`. Add missing Iconsax SVGs to this set when needed.
- Use Bold icons for project category pills and Linear icons for buttons and contact actions, unless the user explicitly requests another Iconsax variant.
- Preserve SVG viewBox and use currentColor for consistent sizing and color.

# Site and case style

- Before building or changing a case or any site page, read `docs/case-guide.md`: copy rules, case structure, spacing (proximity rule, visual not mathematical), radii, colors, typography, fonts-as-curves and the publish checklist.
