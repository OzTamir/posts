# CLAUDE.md

This is a static **Astro** blog (`posts.oztamir.com`, "0xZ"), migrated 1:1 from Ghost and
deployed on Cloudflare Workers Static Assets.

**Read [`AGENTS.md`](./AGENTS.md) — it is the source of truth** for conventions, where
things live, how to add content, how to build/verify, and what not to touch.

Quick reference:

```bash
npm run build      # → ./dist  (must pass)
npm run check      # astro check (keep at 0 errors)
npm run preview    # serve ./dist at http://localhost:4321
```

- Add a post: `src/content/posts/<slug>.md` (filename = URL slug). Schema in
  `src/content.config.ts`.
- Site config: `src/config.ts`. Styling/tokens: `src/styles/global.css` (+ `content.css`).
- Detailed docs: [`docs/`](./docs/) — building & content, design system, deployment.
- Design intent is **parity with the original Ghost theme** — don't redesign. Don't run
  `npm run dev` unless asked.
