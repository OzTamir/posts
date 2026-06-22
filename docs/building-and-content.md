# Building the site & working with content

This is **0xZ** (`posts.oztamir.com`) — a personal blog built as a fully static **Astro**
site, deployed on **Cloudflare Workers Static Assets**. Every page is prerendered to HTML
at build time; a thin Worker (`worker/index.ts`) handles only `Accept: text/markdown`
content negotiation. Most of the site ships **no client JS**;
interactivity comes from React islands hydrated with `client:*` (the feed pager,
`Feed.tsx`), plus a couple of tiny inline `<script is:inline>` blocks (theme toggle,
social-embed loaders).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | [Astro](https://astro.build) 6 (`output: "static"`) |
| Language | TypeScript (strict) |
| UI components | React `.tsx` — rendered to static HTML; interactive pieces hydrate as islands (`client:*`) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) + `@tailwindcss/typography` |
| Content | Astro content collections — plain Markdown (`src/content/posts/<slug>/index.md`) |
| Images | Co-located in post folder; Astro asset pipeline optimizes to hashed `/_astro/*` URLs as WebP + responsive `srcset` (GIFs preserved) |
| Videos | Co-located in post folder; the `copy-post-media` integration copies them (+ posters) to `dist/<slug>/` at build (served raw, not fingerprinted) |
| Hosting | Cloudflare Workers Static Assets (see [deployment.md](./deployment.md)) |
| Runtime | Node 22+ / npm |

## Project structure

```
.
├── astro.config.mjs         # static output, trailing-slash:always, Tailwind, Shiki(nord), sitemap, React, remark plugins
├── wrangler.jsonc           # Cloudflare Workers Static Assets config (+ markdown Worker)
├── worker/index.ts          # thin Worker: Accept: text/markdown content negotiation
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
│   ├── content/posts/       # ONE folder per post; folder name = URL slug
│   │   └── <slug>/
│   │       ├── index.md     # post body + frontmatter (plain Markdown)
│   │       ├── featured.png # feature image (basename referenced in `image` frontmatter field)
│   │       └── *.png/jpg/…  # other post images (referenced by basename in the body)
│   ├── plugins/
│   │   ├── remark-image-captions.mjs  # image + *caption* → <figure><figcaption>; {wide} marker
│   │   └── remark-video-embeds.mjs    # ![[video.mp4|...]] → <figure><video>
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
│   │   ├── PostCard.tsx     # feed row (serializable PostCardData: title, excerpt, date)
│   │   ├── PostFeed.tsx     # shared `.post-feed` grid of PostCards
│   │   ├── Feed.tsx         # client island: feed + in-place "Load more"
│   │   ├── Pagination.tsx   # plain "Load more" link (static /page/N/ fallback)
│   │   ├── AuthorCard.tsx   # author archive header
│   │   ├── RelatedPosts.tsx # related-posts block on single posts
│   │   └── icons/           # inline SVGs (Twitter, LinkedIn, RSS, Sun, Moon, Facebook)
│   ├── integrations/
│   │   └── strip-image-metadata.mjs  # build integration: strip EXIF/XMP from images
│   ├── styles/
│   │   └── global.css       # SINGLE CSS entry: @theme tokens, dark mode, @layer components
│   └── utils/
│       ├── format.ts        # date formatting + reading-time helpers
│       ├── posts.ts         # getSortedPosts, paginatePosts, pageCount, getRelated
│       ├── images.ts        # optimizeFeatureImage + socialImageUrl (used by routes)
│       ├── slug.ts          # slugify() — tag display names → URL slugs
│       └── tags.ts          # tag helpers
├── public/
│   ├── fonts/              # self-hosted Mulish + Lora woff2/woff
│   ├── <slug>/             # per-post video files + poster images (verbatim, not optimized)
│   ├── content/images/**   # legacy public images (some old posts reference these paths)
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

Defined in [`src/content.config.ts`](../src/content.config.ts). Each post lives at
`src/content/posts/<slug>/index.md`; **the folder name is the URL slug** (`post.id`), so
a folder `hello-world/` is served at `/hello-world/`.

Frontmatter fields (`title` and `date` required; everything else optional):

| Field | Meaning |
| --- | --- |
| `title` | Post title |
| `date` | Publish date (ISO) |
| `updatedDate` | Last-updated date (not surfaced in the UI) |
| `description` | Short summary (cards + meta description fallback) |
| `image` | Basename of the feature image in the post folder (e.g. `featured.png`) |
| `imageAlt`, `imageCaption` | Optional alt text / caption for the feature image |
| `tags` | Array of display-name strings (e.g. `["automation", "Home Assistant"]`); `tags[0]` is the **primary tag**. Tag URL slugs are derived via `slugify(name)`. |
| `author` | Author key (`oz`) — looked up in `src/data/authors.ts` |
| `featured` | Boolean |
| `draft` | Boolean — excluded from all feeds/routes when `true` |
| `metaTitle`, `metaDescription`, `ogTitle/Description/Image`, `twitterTitle/Description/Image`, `canonicalUrl` | Per-post SEO overrides |

## Adding or editing a post

1. Create a folder `src/content/posts/my-new-post/` and add `index.md`. The folder name
   is the slug/URL (`/my-new-post/`).

2. Add frontmatter:

   ```yaml
   ---
   title: My New Post
   description: A one-line summary.
   date: 2026-07-01T09:00:00.000Z
   tags:
     - ai
     - Projects
   author: oz
   image: featured.png
   imageAlt: "The tool in action"
   ---
   ```

3. Write the body in **plain Markdown** — no JSX, no imports. The post is editable
   directly in Obsidian (see "Editing in Obsidian / VaultCMS" below).

4. **Images**: drop files into the post folder. Reference by basename:

   ```md
   ![Screenshot of the tool](screenshot.png)
   ```

   To add a caption, put an `*emphasis*` line **immediately after** (no blank line):

   ```md
   ![Screenshot of the tool](screenshot.png)
   *The tool running in production*
   ```

   The `remark-image-captions` plugin wraps the pair in `<figure><figcaption>`. A caption
   may contain a Markdown link `[text](url)`.

   For a wide image (expands to the wider grid column), append `{wide}`:

   ```md
   ![Architecture diagram](diagram.png){wide}
   *Caption is still optional here*
   ```

   The build converts non-GIFs to WebP with a responsive `srcset`; animated GIFs are
   preserved as-is. Every output URL is a fingerprinted `/_astro/*` path (long-cached
   by `_headers`).

5. **Videos**: use Obsidian wiki-embed syntax as a lone paragraph:

   ```md
   ![[demo.mp4|poster=demo-thumb.png|title=Demo video]]
   ```

   Supported attributes: `poster=<filename>`, `title=<string>`, `autoplay` (implies
   loop + muted). **Co-locate the video file and poster in the post folder** (e.g.
   `src/content/posts/<slug>/clip.mp4`), referenced by basename. The `copy-post-media`
   integration copies them to `dist/<slug>/` at build (Astro's asset pipeline doesn't
   handle raw video). The `remark-video-embeds` plugin rewrites the embed to a
   `<figure><video>` block.

6. **Tweets / Instagram**: paste raw HTML embed blocks directly in the `.md`. They render
   on the site; they won't preview in Obsidian. Example (Twitter/X):

   ```html
   <blockquote class="twitter-tweet">
     <p lang="en">Tweet text here.</p>
     &mdash; Author (@handle) <a href="https://twitter.com/handle/status/123">Date</a>
   </blockquote>
   <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
   ```

   Code blocks use fenced Markdown syntax with a language tag — Shiki (nord theme)
   highlights them at build time:

   ````md
   ```ts
   const x: number = 42;
   ```
   ````

7. Run `npm run build` to verify, `npm run preview` to eyeball.

Tags and the author archive are derived automatically from the posts at build time —
there is nothing else to register.

### Full example

Post folder layout:

```
src/content/posts/my-new-post/
├── index.md
├── featured.png
├── screenshot.png
└── diagram.png

public/my-new-post/
└── screencast.mp4
```

`index.md`:

```md
---
title: My New Post
description: One-line summary shown on cards and in meta descriptions.
date: 2026-07-01T09:00:00.000Z
tags:
  - ai
  - Projects
author: oz
image: featured.png
imageAlt: "A screenshot showing the tool in action"
---

Introductory paragraph in plain Markdown.

![The demo running](screenshot.png)
*The tool in action*

![Architecture diagram](diagram.png){wide}

![[screencast.mp4|poster=screencast-thumb.png|title=Demo screencast]]

```ts
const x: number = 42;
```
```

## Editing in Obsidian / VaultCMS

Posts under `src/content/posts/` form a plain-Markdown vault editable in Obsidian. Each
post is a folder (`<slug>/index.md`) with its images co-located — the standard Obsidian
"folder note" layout. The vault is configured for VaultCMS (`.obsidian/` config installed
separately — see VaultCMS setup docs for details).

When editing in Obsidian:
- Image references (`![alt](file.png)`) preview correctly.
- Video wiki-embeds (`![[clip.mp4|...]]`) preview correctly.
- Raw HTML embed blocks (tweets, Instagram) appear as raw HTML in Obsidian but render
  correctly on the site.

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
