# AGENTS.md — working in this repo

Guidance for AI agents (and humans) editing **0xZ** (`posts.oztamir.com`), a static Astro
blog. This file is the source of truth for conventions; read it before making changes.

## What this is

- **Astro 6**, `output: "static"` — prerendered HTML. Deployed to **Cloudflare Workers
  Static Assets** (`./dist`). A thin Worker (`worker/index.ts`) sits in front purely for
  `Accept: text/markdown` content negotiation; everything else is static. Fingerprinted
  assets are still served directly (see `run_worker_first` in `wrangler.jsonc`).
- TypeScript (strict), **Tailwind v4** (CSS-first `@theme`), MDX content collections.
- UI components are **React `.tsx`**; route files are thin **`.astro` shells**
  (`BaseLayout.astro` owns the `<html>`/`<head>` shell + inline theme script). Most of the
  UI renders to **static HTML with no client JS**; interactive pieces hydrate as **React
  islands** via `client:*` (today: the feed pager, `Feed.tsx`). Small inline scripts cover
  the theme toggle + social embeds. Reach for an island when something needs to be
  interactive — don't contort it to avoid JS.
- Design intent: **preserve the established look**. Do **not** redesign, restyle, or
  "modernize." When unsure about a visual detail, match what is already there.

Full docs: [`docs/building-and-content.md`](./docs/building-and-content.md),
[`docs/design-system.md`](./docs/design-system.md),
[`docs/deployment.md`](./docs/deployment.md).

## Where things live

| Need to… | Go to |
| --- | --- |
| Add/edit a post | `src/content/posts/<slug>.mdx` (filename = URL slug) |
| Change the schema | `src/content.config.ts` |
| Change site title/domain/social/analytics | `src/config.ts` (`SITE`) |
| Edit author bio/avatar/social | `src/data/authors.ts` |
| Change a route/page | `src/pages/**` |
| Change the html/head/body shell | `src/layouts/BaseLayout.astro` |
| Change the post scaffold | `src/layouts/PostLayout.tsx` |
| Change chrome (header/footer/cards) | `src/components/**` |
| Change MDX embed components | `src/components/mdx/` |
| Change design tokens / dark mode | `src/styles/global.css` (single CSS entry — no `content.css`) |
| Source images for posts | `src/assets/content/images/**` (goes through the optimizer) |
| Deploy config | `wrangler.jsonc`, `public/_redirects`, `public/_headers` |
| Edit the markdown-negotiation Worker | `worker/index.ts` (+ `src/utils/post-markdown.ts`) |
| CI config | `.github/workflows/ci.yml`, `.lighthouserc.json` |

## Adding content (the common task)

1. New file `src/content/posts/<slug>.mdx`; the **filename is the slug/URL**.
2. Frontmatter must satisfy `src/content.config.ts` (`title`, `pubDate` required;
   `excerpt`, `tags: [{slug,name}]`, `author: oz`, `featureImage`, SEO overrides optional).
   `tags[0]` is the primary tag (shown on cards + OpenGraph).
3. Body is **MDX** (Markdown + JSX). Import the component kit at the top of the file:
   `Figure`, `Video`, `Tweet`, `Instagram` from `../../components/mdx/*.astro`.
4. Put images under `src/assets/content/images/<year>/<file>` (same tree the optimizer
   globs). Reference them by tree-relative path (`"2024/01/x.png"`) in `<Figure src="…">`.
   The build converts non-GIFs to WebP with a responsive `srcset`; GIFs are preserved.
5. Tags and the author archive update automatically — nothing else to register.

### Sample MDX post

```mdx
---
title: My New Post
excerpt: One-line summary shown on cards and in meta descriptions.
pubDate: 2026-07-01T09:00:00.000Z
tags:
  - { slug: ai, name: ai }
  - { slug: projects, name: Projects }
author: oz
featureImage: /content/images/2026/07/cover.png
featureImageAlt: "A screenshot showing the tool in action"
---

import Figure from '../../components/mdx/Figure.astro';
import Video from '../../components/mdx/Video.astro';
import Tweet from '../../components/mdx/Tweet.astro';
import Instagram from '../../components/mdx/Instagram.astro';

Introductory paragraph in plain Markdown.

<Figure
  src="2026/07/demo.png"
  alt="The demo running"
  caption="The tool in action"
/>

<Figure
  src="2026/07/wide-diagram.png"
  alt="Architecture diagram"
  wide
/>

<Video src="2026/07/screencast.mp4" poster="2026/07/screencast-thumb.png" title="Demo screencast" />

<Tweet width="550">
  <p lang="en">Tweet body text here.</p>
  &mdash; Author (@handle) <a href="https://twitter.com/handle/status/123">Date</a>
</Tweet>

<Instagram permalink="https://www.instagram.com/p/XXXX/?utm_source=ig_embed">
  <a href="https://www.instagram.com/p/XXXX/" target="_blank" rel="noopener noreferrer">View this post on Instagram</a>
</Instagram>

Code blocks use fenced syntax (Shiki highlights with the **nord** theme):

```ts
const x: number = 42;
```
```

### MDX component props

| Component | Required props | Optional props | Notes |
| --- | --- | --- | --- |
| `Figure` | `src` | `alt`, `caption`, `wide` | `src`: tree-relative `"YYYY/MM/x.png"` or legacy `/content/images/…`; `wide` expands to the wider grid column |
| `Video` | `src` | `poster`, `title` | `src`: media-tree `"YYYY/MM/x.mp4"` or legacy `/content/media/…`; `poster` accepts an images-tree path |
| `Tweet` | — (slot) | `width` | Inner blockquote markup passed as children |
| `Instagram` | `permalink` | `captioned`, `version` | Inner attribution markup passed as children |

## Conventions

- **URLs use trailing slashes** (`trailingSlash: "always"`, `build.format: "directory"`).
  Posts at `/<slug>/`, tags `/tag/<slug>/`, author `/author/oz/`, home pagination
  `/page/N/`. Don't change URL shapes — they're load-bearing for SEO and existing links.
- **Styling:** single entry in `src/styles/global.css` (no `content.css`). Use Tailwind
  utilities bound to `@theme` tokens in `.tsx`; post-body structural CSS lives in
  `@layer components`. Mobile-first; `md:` (768px) is the desktop breakpoint.
- **No `kg-*` classes.** Post content is authored with the MDX component kit (`Figure`,
  `Video`, `Tweet`, `Instagram`) — not raw HTML with Ghost-era class names.
- **Dark mode follows `prefers-color-scheme` by default.** A persisted localStorage
  choice wins; the footer toggle flips and persists the choice. No forced-dark default.
- **SEO** lives in `src/components/Head.tsx` (canonical, OG, Twitter card, JSON-LD).
  Keep it intact when touching layouts.
- **OG / Twitter image precedence** (per post): `ogImage`/`twitterImage` → `featureImage`
  → a **generated card**. Posts with no explicit OG image and no `featureImage` fall back
  to a 1200×630 card baked at build time by `src/pages/og/[slug].png.ts` (satori → sharp,
  JetBrains Mono from `src/assets/fonts/`); the template lives in `src/utils/og-card.ts`.
  Posts that have a feature image keep using it — nothing is generated for them.
- **Sitemaps** are emitted by `@astrojs/sitemap` at `/sitemap-index.xml` and
  `/sitemap-0.xml`. `robots.txt` points at `/sitemap-index.xml`. There are no hand-rolled
  `sitemap*.xml.ts` endpoints.
- **RSS** feed is at `/rss.xml`; `public/_redirects` keeps `/rss/ → /rss.xml` (301)
  forever so old subscribers never break.
- **Agent discovery** is intentionally minimal, matching a static content blog:
  `/llms.txt` (the llmstxt.org standard, generated by `src/pages/llms.txt.ts`) is a
  Markdown index of every post + the feeds, built from the same content collection
  as RSS/`posts.json`; `robots.txt` carries a `Content-Signal` line (search/AI-input
  yes, AI-training no);
  `public/.well-known/api-catalog` is an RFC 9727 `linkset+json` advertising the real
  feeds (`/posts.json`, `/rss.xml`) + sitemap; `_headers` adds a `Link:` header
  (`rel="api-catalog"`, `rel="sitemap"`) on every response and sets the catalog's
  content type. We deliberately do **not** publish OAuth/OIDC, MCP, `auth.md`, or
  WebMCP metadata — there are no APIs, auth, or tools behind them to advertise.
- **Markdown for Agents** is served natively (Cloudflare's zone feature needs a paid plan):
  `worker/index.ts` answers `Accept: text/markdown` with the build-time Markdown sibling of
  a page (`Content-Type: text/markdown`, `x-markdown-tokens`, `Vary: Accept`); HTML stays
  the browser default. The Markdown is generated at build by `src/pages/[slug].md.ts` and
  `src/pages/index.md.ts` (via `src/utils/post-markdown.ts`, which rewrites the MDX body's
  `<Figure>/<Video>/<Tweet>/<Instagram>` to Markdown using the real asset resolvers). Each
  post is also directly fetchable at `/<slug>.md`.
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

## CI

`.github/workflows/ci.yml` runs on every push and PR:

1. `npm run check` — `astro check` (TypeScript + .astro type errors)
2. `npm run build` — full production build
3. `npm run check:links` — broken-link check via `scripts/check-links.mjs`
4. `npm run lhci` — Lighthouse budget (`.lighthouserc.json`): performance ≥ 0.9,
   accessibility ≥ 0.9, SEO ≥ 0.9

CI does **not** deploy; Cloudflare's Git integration deploys on push to `main`.

## Do NOT touch (unless that's explicitly the task)

- `astro.config.mjs`, `tsconfig.json`, `wrangler.jsonc` — infra; change deliberately.
- URL structure and the trailing-slash config — see above.

## Gotchas

- Don't run `npm run dev` unless asked; use `npm run build` + `npm run preview`.
- Code blocks are highlighted by Shiki with the **nord** theme (set in `astro.config.mjs`).
- `updatedDate` in frontmatter is intentionally not shown in the UI; ordering and dates use `pubDate`.
- Post images live under `src/assets/content/images/**` (not `public/`). They are imported
  at build time and come out as hashed `/_astro/*` URLs. The `_headers` file long-caches
  `/_astro/*` and `/fonts/*`.
- `SITE.social` is the single source of truth for twitter/facebook/linkedin/rss links;
  `src/data/authors.ts` derives social fields from it.
- `SiteHeader` renders `SITE.navigation`; the default empty array means no nav links show.
- The `PostFeed` component and `paginatePosts`/`pageCount` helpers (in `src/utils/posts.ts`)
  are shared by all paginated routes (home, tag, author).
- The feed pager is progressive enhancement: a section's first page renders the `Feed`
  island (`client:visible`), which is handed the whole feed and reveals more posts in
  place. "Load more" is a real link to `/…/page/N/`, so without JS it just navigates
  there — those static `/page/N/` routes are the no-JS / crawler fallback, so keep them.
