# Building the site & working with content

This is **0xZ** (`posts.oztamir.com`) — a personal blog built as a fully static **Astro**
site, deployed on **Cloudflare Workers Static Assets**. There is no server runtime: every
page is prerendered to HTML at build time.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | [Astro](https://astro.build) 6 (`output: "static"`) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) + custom theme CSS |
| Content | Astro content collections (Markdown + the `glob` loader) |
| Hosting | Cloudflare Workers Static Assets (see [deployment.md](./deployment.md)) |
| Runtime | Node 20+ / npm |

## Project structure

```
.
├── astro.config.mjs        # static output, trailing-slash:always, Tailwind, Shiki(nord)
├── wrangler.jsonc          # Cloudflare Workers Static Assets config
├── tsconfig.json           # extends astro/tsconfigs/strict
├── src/
│   ├── config.ts           # SITE config (title, domain, social, analytics) — single source of truth
│   ├── content.config.ts   # posts collection schema (Zod)
│   ├── data/authors.ts     # author info (bio, avatar, social sameAs)
│   ├── content/posts/*.md  # ONE Markdown file per post (filename = URL slug)
│   ├── pages/              # routes (see "Routes" below)
│   ├── layouts/            # BaseLayout, PostLayout
│   ├── components/         # Head, SiteHeader, SiteFooter, PostCard, Pagination, …, icons/
│   ├── styles/             # global.css (tokens + dark mode), content.css (post prose + cards)
│   └── utils/              # format (dates/reading-time), posts, tags, imageSize
├── public/
│   ├── content/images/**   # all post/feature images
│   ├── content/media/**     # videos + posters
│   ├── fonts/              # self-hosted Mulish + Lora woff2/woff
│   ├── _redirects          # Cloudflare redirects
│   ├── _headers            # Cloudflare cache headers
│   └── sitemap.xsl         # styled sitemap stylesheet
```

## Commands

```bash
npm install            # install deps
npm run dev            # local dev server (http://localhost:4321)  ⚠ rarely needed
npm run build          # production build → ./dist
npm run preview        # serve the built ./dist locally (production-like)
npm run check          # astro check (type-check .astro + TS)
```

The deployable artifact is **`./dist`** — a plain folder of static files.

## Content collection schema

Defined in [`src/content.config.ts`](../src/content.config.ts). Each post is
`src/content/posts/<slug>.md`; **the filename is the URL slug** (`post.id`), so
`hello-world.md` is served at `/hello-world/`.

Frontmatter fields (all but `title`/`pubDate` optional):

| Field | Meaning |
| --- | --- |
| `title` | Post title |
| `excerpt` | Short summary (cards + meta description) |
| `pubDate` | Publish date (ISO) |
| `updatedDate` | Last-updated date (not surfaced in the UI) |
| `tags` | `[{ slug, name }]` in display order; `tags[0]` is the **primary tag** |
| `author` | Author key (`oz`) — looked up in `src/data/authors.ts` |
| `featureImage` | Absolute path, e.g. `/content/images/2020/07/x.png` (or omit) |
| `featureImageAlt`, `featureImageCaption` | Optional |
| `featured` | Boolean (no post is currently featured) |
| `metaTitle`, `metaDescription`, `ogTitle/Description/Image`, `twitterTitle/Description/Image`, `canonicalUrl` | Per-post SEO overrides |

## Adding or editing a post

1. Create `src/content/posts/my-new-post.md`. The slug/URL = the filename.
2. Add frontmatter, e.g.:

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
3. Write the body in Markdown. Raw HTML is allowed for things Markdown can't express
   (image captions, video, embeds) — match the existing posts' conventions:
   - Image with caption: `<figure class="kg-card kg-image-card">…<figcaption>…</figcaption></figure>`
   - Native video: `<figure class="kg-card kg-video-card"><video src="/content/media/…mp4" poster="…" controls preload="metadata" playsinline></video></figure>`
   - Code blocks: fenced with a language (```` ```ts ````) — highlighted by Shiki (nord theme).
4. **Images/media**: drop the file into `public/content/images/<path>` (any structure)
   and reference it with that absolute path. Files in `public/` are served verbatim at
   the same URL — no build-time image transforms are applied (preserves animated GIFs
   and keeps image URLs stable).
5. `npm run build` to verify, `npm run preview` to eyeball.

Tags and the author archive are derived automatically from the posts at build time —
there is nothing else to register.

## Routes

| URL | Source |
| --- | --- |
| `/` and `/page/2/` … `/page/9/` | `src/pages/index.astro`, `src/pages/page/[page].astro` |
| `/<slug>/` | `src/pages/[slug].astro` |
| `/tag/<slug>/` (+ `/page/N/`) | `src/pages/tag/[tag]/…` |
| `/author/oz/` (+ `/page/N/`) | `src/pages/author/[author]/…` |
| `/rss/` → `/rss.xml` | `src/pages/rss.xml.ts` (+ redirect in `_redirects`) |
| `/sitemap.xml` (+ `-posts/-pages/-authors/-tags.xml`) | `src/pages/sitemap*.xml.ts` |
| `/robots.txt` | `src/pages/robots.txt.ts` |
| 404 | `src/pages/404.astro` |

Trailing slashes are enforced globally (`trailingSlash: "always"` + `build.format:
"directory"`).

See also: [design-system.md](./design-system.md) and [deployment.md](./deployment.md).
