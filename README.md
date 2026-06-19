# 0xZ — posts.oztamir.com

The source for **0xZ**, a personal blog (`# cat /dev/brain >> posts`). It was migrated
from **Ghost CMS** to a fully static **Astro** site and is deployed on **Cloudflare
Workers Static Assets** — prerendered HTML, no server runtime.

## Quick start

```bash
npm install
npm run build      # → ./dist
npm run preview    # http://localhost:4321
```

## Docs

- **[docs/building-and-content.md](./docs/building-and-content.md)** — stack, project
  structure, content schema, how to add/edit posts, routes, commands.
- **[docs/design-system.md](./docs/design-system.md)** — the ported theme as Tailwind
  tokens: fonts, colors, dark mode, components, how to extend.
- **[docs/deployment.md](./docs/deployment.md)** — Cloudflare Workers deploy via the
  GitHub integration, `wrangler.jsonc`, redirects/headers, rollback.
- **[AGENTS.md](./AGENTS.md)** — conventions for anyone (incl. AI agents) editing the repo.

## At a glance

| | |
| --- | --- |
| Framework | Astro 6 (`output: "static"`) |
| Styling | Tailwind v4 + ported theme CSS |
| Content | Markdown content collections (`src/content/posts/`) |
| Hosting | Cloudflare Workers Static Assets (`./dist`) |
| Posts | 41 · single author · 1:1 URLs with the old Ghost site |

`ghost-assets/` holds the original Ghost export and theme for reference (the export JSON
is gitignored). `scripts/` holds the one-time migration tooling.
