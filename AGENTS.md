# AGENTS.md — working in this repo

Guidance for AI agents (and humans) editing **0xZ** (`posts.oztamir.com`), a static Astro
blog. This file is the source of truth for conventions; read it before making changes.

## What this is

- **Astro 6**, `output: "static"` — prerendered HTML, no server runtime. Deployed to
  **Cloudflare Workers Static Assets** (`./dist`).
- TypeScript (strict), **Tailwind v4** (CSS-first `@theme`), content collections.
- Design intent: **preserve the established look**. Do **not** redesign, restyle, or
  "modernize." When unsure about a visual detail, match what is already there.

Full docs: [`docs/building-and-content.md`](./docs/building-and-content.md),
[`docs/design-system.md`](./docs/design-system.md),
[`docs/deployment.md`](./docs/deployment.md).

## Where things live

| Need to… | Go to |
| --- | --- |
| Add/edit a post | `src/content/posts/<slug>.md` (filename = URL slug) |
| Change the schema | `src/content.config.ts` |
| Change site title/domain/social/analytics | `src/config.ts` (`SITE`) |
| Edit author bio/avatar/social | `src/data/authors.ts` |
| Change a route/page | `src/pages/**` |
| Change layout/chrome | `src/layouts/**`, `src/components/**` |
| Change design tokens / dark mode | `src/styles/global.css` |
| Change post-body / card styling | `src/styles/content.css` |
| Images & video | `public/content/images/**`, `public/content/media/**` |
| Deploy config | `wrangler.jsonc`, `public/_redirects`, `public/_headers` |

## Adding content (the common task)

1. New file `src/content/posts/<slug>.md`; the **filename is the slug/URL**.
2. Frontmatter must satisfy `src/content.config.ts` (`title`, `pubDate` required;
   `excerpt`, `tags: [{slug,name}]`, `author: oz`, `featureImage`, SEO overrides optional).
   `tags[0]` is the primary tag (shown on cards + OpenGraph).
3. Body is Markdown; raw HTML is allowed and used for image captions, native video, and
   social embeds — copy the patterns in existing posts (`kg-card` classes).
4. Put images in `public/content/images/<path>` and reference them with that **absolute**
   path (`/content/images/...`). `public/` is served as-is — no build-time image
   processing (this preserves animated GIFs and keeps image URLs stable).
5. Tags and the author archive update automatically — nothing else to register.

## Conventions

- **URLs use trailing slashes** (`trailingSlash: "always"`, `build.format: "directory"`).
  Posts at `/<slug>/`, tags `/tag/<slug>/`, author `/author/oz/`, home pagination
  `/page/N/`. Don't change URL shapes — they're load-bearing for SEO and existing links.
- **Styling:** use Tailwind utilities bound to `@theme` tokens; for theme-flipping colors
  use the runtime `--*-color` variables. Don't hardcode hex/px that duplicate a token.
  Mobile-first; `md:` (768px) is the desktop breakpoint.
- **SEO** lives in `src/components/Head.astro` (canonical, OG, Twitter card, JSON-LD).
  Keep it intact when touching layouts.
- This is a **static content blog**. Members, newsletter, comments, and server-side search
  were intentionally dropped — do not reintroduce them.

## Build & verify

```bash
npm run build          # must succeed → ./dist
npm run check          # astro check: keep at 0 errors
npm run preview        # eyeball at http://localhost:4321 before claiming done
```

Always run `build` (and ideally render `preview`) before asserting a change works. For
visual changes, check at both mobile and desktop widths.

## Do NOT touch (unless that's explicitly the task)

- `astro.config.mjs`, `tsconfig.json`, `wrangler.jsonc` — infra; change deliberately.
- URL structure and the trailing-slash config — see above.

## Gotchas

- Don't run `npm run dev` unless asked; use `npm run build` + `npm run preview`.
- Code blocks are highlighted by Shiki with the **nord** theme (set in `astro.config.mjs`).
- `updatedDate` in frontmatter is intentionally not shown in the UI; ordering and dates use `pubDate`.
