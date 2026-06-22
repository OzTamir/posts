# 0xZ — posts.oztamir.com

The source for **0xZ**, a personal blog (`# cat /dev/brain >> posts`). Fully static
**Astro** site deployed on **Cloudflare Workers Static Assets** — prerendered HTML,
no server runtime, and only the interactive bits ship JS (React islands).

## Quick start

```bash
npm install
npm run build      # → ./dist
npm run preview    # http://localhost:4321
```

> **Editing posts in Obsidian?** The VaultCMS Obsidian plugin *code* isn't committed (only
> its config), so after a fresh clone run `npx create-vaultcms` once to restore the plugin
> bundles before opening `src/content` as a vault. This is only for the Obsidian editing
> workflow — building, previewing, and deploying the site need none of it. See
> [AGENTS.md → Editing in Obsidian / VaultCMS](./AGENTS.md).

## Docs

- **[docs/building-and-content.md](./docs/building-and-content.md)** — stack, project
  structure, content schema, how to add/edit posts, routes, commands.
- **[docs/design-system.md](./docs/design-system.md)** — design system as Tailwind
  tokens: fonts, colors, dark mode, components, how to extend.
- **[docs/deployment.md](./docs/deployment.md)** — Cloudflare Workers deploy via the
  GitHub integration, `wrangler.jsonc`, redirects/headers, CI, rollback.
- **[AGENTS.md](./AGENTS.md)** — conventions for anyone (incl. AI agents) editing the repo.
- **[.claude/skills/creating-blog-posts](./.claude/skills/creating-blog-posts/SKILL.md)** —
  a skill that walks an agent through adding a post (layout, frontmatter, assets, verify);
  for the prose itself it defers to the `oz-skills:blog-post-writer` skill.

## At a glance

| | |
| --- | --- |
| Framework | Astro 6 (`output: "static"`) |
| UI | React `.tsx` components (static HTML; hydrated as islands where interactive) |
| Styling | Tailwind v4 (`@theme` tokens) + `@tailwindcss/typography` |
| Content | Markdown content collections (`src/content/posts/<slug>/index.md`), editable in Obsidian via VaultCMS |
| Images | Co-located in each post folder → Astro asset pipeline (WebP + srcset; GIFs preserved); videos copied to `dist/<slug>/` at build |
| Hosting | Cloudflare Workers Static Assets (`./dist`) |
| Posts | Single author · trailing-slash URLs · Shiki `nord` code highlighting |
