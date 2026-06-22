# CLAUDE.md

This is a static **Astro** blog (`posts.oztamir.com`, "0xZ"), deployed on Cloudflare Workers Static Assets.

**Read [`AGENTS.md`](./AGENTS.md) — it is the source of truth** for conventions, where
things live, how to add content, how to build/verify, and what not to touch.

Quick reference:

```bash
npm run build      # → ./dist  (must pass)
npm run check      # astro check (keep at 0 errors)
npm run preview    # serve ./dist at http://localhost:4321
```

- Add a post: `src/content/posts/<slug>/index.md` (folder name = URL slug). Schema in
  `src/content.config.ts`.
- Site config: `src/config.ts`. Styling/tokens: `src/styles/global.css` (single entry).
- Detailed docs: [`docs/`](./docs/) — building & content, design system, deployment.
- Design intent is **consistent with the established look** — don't redesign. Don't run
  `npm run dev` unless asked.
