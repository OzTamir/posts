# Building the site & working with content

This is **0xZ** (`posts.oztamir.com`) — a personal blog built as a fully static **Astro**
site, deployed on **Cloudflare Workers Static Assets**. There is no server runtime: every
page is prerendered to HTML at build time. The site ships **zero client JS** — the theme
toggle and social-embed loaders are tiny inline `<script is:inline>` blocks, not bundles.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | [Astro](https://astro.build) 6 (`output: "static"`) |
| Language | TypeScript (strict) |
| UI components | React `.tsx` (static, un-hydrated — rendered to HTML at build time) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) + `@tailwindcss/typography` |
| Content | Astro MDX content collections (`src/content/posts/*.mdx`) |
| Images | Astro asset pipeline — source in `src/assets/content/images/**`; output to hashed `/_astro/*` URLs as WebP + responsive `srcset` (GIFs preserved) |
| Hosting | Cloudflare Workers Static Assets (see [deployment.md](./deployment.md)) |
| Runtime | Node 22+ / npm |

## Project structure

```
.
├── astro.config.mjs         # static output, trailing-slash:always, Tailwind, Shiki(nord), sitemap, MDX, React
├── wrangler.jsonc           # Cloudflare Workers Static Assets config
├── tsconfig.json            # extends astro/tsconfigs/strict
├── .github/workflows/ci.yml # CI: astro check + build + link check + Lighthouse
├── .lighthouserc.json       # Lighthouse performance/a11y/SEO budget
├── scripts/check-links.mjs  # internal broken-link checker (runs in CI)
├── src/
│   ├── config.ts            # SITE config (title, domain, social, analytics) — single source of truth
│   ├── content.config.ts    # posts collection schema (Zod)
│   ├── data/
│   │   ├── authors.ts       # author info (bio, avatar, social — derived from SITE.social)
│   │   └── site-images.ts   # optimized site logo/icon assets
│   ├── content/posts/*.mdx  # ONE MDX file per post (filename = URL slug)
│   ├── assets/
│   │   └── content/images/**  # source post images (optimized at build time → /_astro/*)
│   ├── pages/               # thin Astro shells: load content, pass props to React components
│   │   ├── index.astro      # home (page 1)
│   │   ├── [slug].astro     # single post
│   │   ├── page/[page].astro
│   │   ├── tag/[tag]/       # tag archive + pagination
│   │   ├── author/[author]/ # author archive + pagination
│   │   ├── rss.xml.ts       # RSS feed at /rss.xml
│   │   ├── robots.txt.ts    # points sitemap at /sitemap-index.xml
│   │   └── 404.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro # thin html/head/body shell + inline theme script
│   │   └── PostLayout.tsx   # single-post article scaffold (React)
│   ├── components/
│   │   ├── Head.tsx         # all <head> SEO (title/meta/OG/JSON-LD/RSS/Plausible)
│   │   ├── SiteHeader.tsx   # header (renders SITE.navigation)
│   │   ├── SiteFooter.tsx   # footer (social links + theme toggle)
│   │   ├── Cover.tsx        # home hero (logo + tagline)
│   │   ├── PostCard.tsx     # feed row (title, excerpt, date, reading time)
│   │   ├── PostFeed.tsx     # shared feed grid (used by all paginated routes)
│   │   ├── Pagination.tsx   # "Load more" pager
│   │   ├── AuthorCard.tsx   # author archive header
│   │   ├── RelatedPosts.tsx # related-posts block on single posts
│   │   ├── icons/           # inline SVGs (Twitter, LinkedIn, RSS, Sun, Moon, Facebook)
│   │   └── mdx/             # MDX component kit for post bodies
│   │       ├── Figure.astro     # optimized image with optional caption
│   │       ├── Video.astro      # native HTML5 video player
│   │       ├── Tweet.astro      # Twitter/X embed
│   │       ├── Instagram.astro  # Instagram embed
│   │       ├── images.ts        # eager glob → resolveImage() used by Figure + routes
│   │       └── media.ts         # video/poster asset resolution
│   ├── integrations/
│   │   └── prune-unused-js.mjs  # build integration: drops the orphan React chunk
│   ├── styles/
│   │   └── global.css       # SINGLE CSS entry: @theme tokens, dark mode, @layer components
│   └── utils/
│       ├── format.ts        # date formatting + reading-time helpers
│       ├── posts.ts         # getSortedPosts, paginatePosts, pageCount, getRelated
│       ├── images.ts        # optimizeFeatureImage + socialImageUrl (used by routes)
│       └── tags.ts          # tag helpers
├── public/
│   ├── fonts/              # self-hosted Mulish + Lora woff2/woff
│   ├── content/images/**   # legacy public images (referenced by featureImage paths in frontmatter)
│   ├── content/media/**    # videos + posters (legacy paths)
│   ├── _redirects          # Cloudflare redirects (/rss/ → /rss.xml, /page/1/ → /)
│   └── _headers            # long-cache for /_astro/* and /fonts/*
```

## Commands

```bash
npm install             # install deps
npm run build           # production build → ./dist
npm run preview         # serve the built ./dist locally (production-like)
npm run check           # astro check (type-check .astro + TS)
npm run check:links     # internal broken-link check
npm run lhci            # Lighthouse budget check
```

The deployable artifact is **`./dist`** — a plain folder of static files.

## Content collection schema

Defined in [`src/content.config.ts`](../src/content.config.ts). Each post is
`src/content/posts/<slug>.mdx`; **the filename is the URL slug** (`post.id`), so
`hello-world.mdx` is served at `/hello-world/`.

Frontmatter fields (all but `title`/`pubDate` optional):

| Field | Meaning |
| --- | --- |
| `title` | Post title |
| `excerpt` | Short summary (cards + meta description fallback) |
| `pubDate` | Publish date (ISO) |
| `updatedDate` | Last-updated date (not surfaced in the UI) |
| `tags` | `[{ slug, name }]` in display order; `tags[0]` is the **primary tag** |
| `author` | Author key (`oz`) — looked up in `src/data/authors.ts` |
| `featureImage` | Path, e.g. `/content/images/2022/10/cover.png` (or omit) |
| `featureImageAlt`, `featureImageCaption` | Optional |
| `featured` | Boolean |
| `metaTitle`, `metaDescription`, `ogTitle/Description/Image`, `twitterTitle/Description/Image`, `canonicalUrl` | Per-post SEO overrides |

## Adding or editing a post

1. Create `src/content/posts/my-new-post.mdx`. The slug/URL = the filename stem.
2. Add frontmatter:

   ```yaml
   ---
   title: My New Post
   excerpt: A one-line summary.
   pubDate: 2026-07-01T09:00:00.000Z
   tags:
     - { slug: ai, name: ai }
     - { slug: projects, name: Projects }
   author: oz
   featureImage: /content/images/2026/07/cover.png
   ---
   ```

3. The MDX component kit (`Figure`, `Video`, `Tweet`, `Instagram`) is **auto-registered**
   for every post by the route (`src/pages/[slug].astro` passes it via the `<Content>`
   `components` prop). Use the tags directly — **no per-post `import` lines**.

4. Write the body in Markdown + MDX. Use the component kit for media:

   ```mdx
   Plain paragraph text.

   <Figure
     src="2026/07/screenshot.png"
     alt="Screenshot of the tool"
     caption="The tool running in production"
   />

   <Figure src="2026/07/diagram.png" alt="Architecture diagram" wide />

   <Video src="2026/07/demo.mp4" poster="2026/07/demo-thumb.png" title="Demo video" />

   <Tweet>
     <p lang="en">Tweet text here.</p>
     &mdash; Author (@handle) <a href="https://twitter.com/handle/status/123">Date</a>
   </Tweet>

   <Instagram permalink="https://www.instagram.com/p/XXXX/?utm_source=ig_embed">
     <a href="https://www.instagram.com/p/XXXX/" target="_blank" rel="noopener noreferrer">View this post on Instagram</a>
   </Instagram>
   ```

   Code blocks use fenced Markdown syntax with a language tag — Shiki (nord theme)
   highlights them at build time:

   ````md
   ```ts
   const x: number = 42;
   ```
   ````

5. **Images:** drop the source file into `src/assets/content/images/<year>/<file>` (the
   asset glob picks it up automatically). Reference it with the tree-relative path
   (`"2026/07/x.png"`) in `<Figure src="…">`. The build converts non-GIFs to WebP with a
   responsive `srcset`; animated GIFs are imported but not re-encoded. Every output URL is
   a fingerprinted `/_astro/*` path (long-cached by `_headers`).

6. Run `npm run build` to verify, `npm run preview` to eyeball.

Tags and the author archive are derived automatically from the posts at build time —
there is nothing else to register.

## Routes

| URL | Source |
| --- | --- |
| `/` (page 1) | `src/pages/index.astro` |
| `/page/2/` … `/page/N/` | `src/pages/page/[page].astro` |
| `/<slug>/` | `src/pages/[slug].astro` |
| `/tag/<slug>/` (+ `/page/N/`) | `src/pages/tag/[tag]/` |
| `/author/oz/` (+ `/page/N/`) | `src/pages/author/[author]/` |
| `/rss.xml` | `src/pages/rss.xml.ts` (15 most-recent posts; `/rss/ → /rss.xml` 301 in `_redirects`) |
| `/sitemap-index.xml`, `/sitemap-0.xml` | `@astrojs/sitemap` (auto-generated, inherits `trailingSlash: "always"`) |
| `/robots.txt` | `src/pages/robots.txt.ts` (points sitemap at `/sitemap-index.xml`) |
| 404 | `src/pages/404.astro` |

Trailing slashes are enforced globally (`trailingSlash: "always"` + `build.format:
"directory"`). `/page/1/`, `/tag/:tag/page/1/`, and `/author/:author/page/1/` redirect
to their canonical base via `public/_redirects`.

See also: [design-system.md](./design-system.md) and [deployment.md](./deployment.md).
