# AGENTS.md — working in this repo

Guidance for AI agents (and humans) editing **0xZ** (`posts.oztamir.com`), a static Astro
blog. This file is the source of truth for conventions; read it before making changes.

## What this is

- **Astro 7**, `output: "static"` — prerendered HTML. Deployed to **Cloudflare Workers
  Static Assets** (`./dist`). A thin Worker (`worker/index.ts`) sits in front purely for
  `Accept: text/markdown` content negotiation; everything else is static. Fingerprinted
  assets are still served directly (see `run_worker_first` in `wrangler.jsonc`).
- TypeScript (strict), **Tailwind v4** (CSS-first `@theme`), Markdown content collections.
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
| Add/edit a post | `src/content/posts/<slug>/index.md` (folder name = URL slug) |
| Add images to a post | co-locate in the post folder (e.g. `src/content/posts/<slug>/photo.png`) |
| Add video to a post | co-locate in the post folder (`src/content/posts/<slug>/video.mp4` + poster); the `copy-post-media` integration emits it to `dist/<slug>/` |
| Change the schema | `src/content.config.ts` |
| Change site title/domain/social/analytics | `src/config.ts` (`SITE`) |
| Edit author bio/avatar/social | `src/data/authors.ts` |
| Change a route/page | `src/pages/**` |
| Change the html/head/body shell | `src/layouts/BaseLayout.astro` |
| Change the post scaffold | `src/layouts/PostLayout.tsx` |
| Change chrome (header/footer/cards) | `src/components/**` |
| Change design tokens / dark mode | `src/styles/global.css` (single CSS entry — no `content.css`) |
| Change the image-caption remark plugin | `src/plugins/remark-image-captions.mjs` |
| Change the video-embed remark plugin | `src/plugins/remark-video-embeds.mjs` |
| Deploy config | `wrangler.jsonc`, `public/_redirects`, `public/_headers` |
| Edit the markdown-negotiation Worker | `worker/index.ts` (+ `src/utils/post-markdown.ts`) |
| CI config | `.github/workflows/ci.yml`, `.lighthouserc.json` |

## Adding content (the common task)

> There's a project skill, **`creating-blog-posts`** (`.claude/skills/`), that walks an
> agent through this end to end (layout, frontmatter, assets, verification). For the prose
> itself, defer to the `oz-skills:blog-post-writer` skill. The steps below are the summary.

1. Create a folder `src/content/posts/<slug>/` and put `index.md` inside it. The **folder
   name is the slug/URL** (`/<slug>/`, trailing slash).
2. Frontmatter must satisfy `src/content.config.ts` (`title`, `date` required; everything
   else optional). Key fields:
   - `date` — ISO publish date
   - `description` — short summary (cards + meta description fallback)
   - `image` — basename of the feature image co-located in the folder (e.g. `featured.png`)
   - `imageAlt`, `imageCaption` — optional
   - `tags` — array of display-name strings (e.g. `["automation", "Home Assistant"]`);
     `tags[0]` is the primary tag (shown on cards + OpenGraph). Tag URL slugs are derived
     via `slugify(name)` at build time (`src/utils/slug.ts`).
   - `author` — author key (`oz`)
   - `draft: true` — exclude from all feeds/routes
   - SEO overrides: `metaTitle`, `metaDescription`, `ogTitle/Description/Image`,
     `twitterTitle/Description/Image`, `canonicalUrl`
3. Body is **plain Markdown** (`.md`) — no JSX, no imports. Obsidian/VaultCMS editable.
4. **Images**: drop files into the post folder and reference by **basename**:
   `![alt text](photo.png)`. The build optimizes non-GIFs to WebP with a responsive
   `srcset`; GIFs are preserved. Output URLs are fingerprinted `/_astro/*`.
5. **Captions**: put an emphasis line `*caption text*` on the line **immediately after** the
   image (no blank line between). The `remark-image-captions` plugin wraps the pair in a
   `<figure>` with a `<figcaption>`. A caption may contain a Markdown link `[text](url)`.
6. **Wide images**: append `{wide}` to the image line (or to the alt text):
   `![alt](photo.png){wide}` — expands to the wider grid column.
7. **Videos**: use Obsidian wiki-embed syntax in a lone paragraph:
   `![[clip.mp4|poster=thumb.png|title=Caption]]`
   Video files and poster images are **co-located in the post folder** (e.g.
   `src/content/posts/<slug>/clip.mp4`), referenced by basename. They aren't handled by
   Astro's asset pipeline, so the `copy-post-media` integration copies them into
   `dist/<slug>/` at build (served at `/<slug>/clip.mp4`). `autoplay` is also a supported
   attribute (implies loop + muted). The `remark-video-embeds` plugin rewrites the embed to
   a `<figure><video>` block.
8. **Tweets / Instagram**: paste raw HTML embed blocks directly in the `.md`. They render
   on the site; they won't preview in Obsidian (a full auto-embed plugin is a future
   follow-up).
9. Tags and the author archive update automatically — nothing else to register.

### Sample post

```
src/content/posts/my-new-post/
├── index.md
├── featured.png
├── screenshot.png
└── diagram.png
```

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

Code blocks use fenced syntax (Shiki highlights with the **nord** theme):

```ts
const x: number = 42;
```
```

Video files go in `public/my-new-post/` (not the content folder):

```
public/my-new-post/
└── screencast.mp4
```

## Conventions

- **URLs use trailing slashes** (`trailingSlash: "always"`, `build.format: "directory"`).
  Posts at `/<slug>/`, tags `/tag/<slug>/`, author `/author/oz/`, home pagination
  `/page/N/`. Don't change URL shapes — they're load-bearing for SEO and existing links.
- **Styling:** single entry in `src/styles/global.css` (no `content.css`). Use Tailwind
  utilities bound to `@theme` tokens in `.tsx`; post-body structural CSS lives in
  `@layer components`. Mobile-first; `md:` (768px) is the desktop breakpoint.
- **Post body is plain Markdown.** No `kg-*` classes and no MDX component imports.
  Images, captions, wide images, and videos are all handled by remark plugins at build time.
- **Dark mode follows `prefers-color-scheme` by default.** A persisted localStorage
  choice wins; the footer toggle flips and persists the choice. No forced-dark default.
- **SEO** lives in `src/components/Head.tsx` (canonical, OG, Twitter card, JSON-LD).
  Keep it intact when touching layouts.
- **OG / Twitter image precedence** (per post): `ogImage`/`twitterImage` → `image`
  (feature image basename) → a **generated card**. Posts with no explicit OG image and no
  `image` field fall back to a 1200×630 card baked at build time by
  `src/pages/og/[slug].png.ts` (satori → sharp, JetBrains Mono from `src/assets/fonts/`);
  the template lives in `src/utils/og-card.ts`. Posts that have a feature image keep using
  it — nothing is generated for them.
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
- **Markdown for Agents** is served natively: `worker/index.ts` answers
  `Accept: text/markdown` with the build-time Markdown sibling of a page
  (`Content-Type: text/markdown`, `x-markdown-tokens`, `Vary: Accept`); HTML stays
  the browser default. The Markdown is generated at build by `src/pages/[slug].md.ts` and
  `src/pages/index.md.ts` (via `src/utils/post-markdown.ts`). Since posts are now native
  Markdown, the body is simpler to serve. Each post is also directly fetchable at
  `/<slug>.md`.
- This is a **static content blog**. Members, newsletter, comments, and server-side search
  were intentionally dropped — do not reintroduce them.

## Editing in Obsidian / VaultCMS

Posts under `src/content/posts/` form a plain-Markdown vault editable in Obsidian.
Each post is a folder (`<slug>/index.md`) with its images co-located alongside it —
the standard Obsidian "folder note" layout. The VaultCMS vault config lives in the repo
at `src/content/.obsidian/` (plus the CMS home view in `src/content/_bases/`); per-user
workspace files are gitignored. Open `src/content` as a vault and use VaultCMS's
"new post" command to scaffold a post from the template. The bundled **`0xZ` Obsidian
theme** (`src/content/.obsidian/themes/0xZ/`) mirrors the site's palette and fonts (gold
accent, Mulish, IBM Plex Mono) so editing looks like the blog.

**Fresh-clone setup (only if you want to edit in Obsidian).** The third-party Obsidian
plugin *code* (`.obsidian/plugins/*/main.js`, `styles.css`) is intentionally NOT committed
— only each plugin's `manifest.json` + `data.json` (which plugin + its configured
settings) are. So a fresh clone has the vault config but not the plugin binaries. Before
editing in Obsidian, restore them by re-running the VaultCMS installer from the repo root:

```bash
npx create-vaultcms        # target src/content; follow its prompts to restore the existing vault
```

It re-fetches the plugin bundles; the committed `manifest.json`/`data.json` keep your
configured setup (content types, mappings, theme). This step is **not** needed to build,
preview, or deploy the site — the build never touches the vault. It's purely for the
Obsidian editing workflow.
When editing in Obsidian, image references (`![alt](file.png)`) and video embeds
(`![[clip.mp4|...]]`) preview correctly. Raw HTML embed blocks (tweets, Instagram) are
visible as raw HTML in Obsidian but render correctly on the site.

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
- `updatedDate` in frontmatter is intentionally not shown in the UI; ordering and dates use `date`.
- Post images live in their post folder (`src/content/posts/<slug>/`) and are optimized at
  build time to hashed `/_astro/*` URLs. The `_headers` file long-caches `/_astro/*` and
  `/fonts/*`. Video files and poster images are co-located in the post folder too and
  copied to `dist/<slug>/` at build by the `copy-post-media` integration (served raw, not
  fingerprinted).
- `SITE.social` is the single source of truth for twitter/facebook/linkedin/rss links;
  `src/data/authors.ts` derives social fields from it.
- `SiteHeader` renders `SITE.navigation`; the default empty array means no nav links show.
- The `PostFeed` component and `paginatePosts`/`pageCount` helpers (in `src/utils/posts.ts`)
  are shared by all paginated routes (home, tag, author).
- The feed pager is progressive enhancement: a section's first page renders the `Feed`
  island (`client:visible`), which is handed the whole feed and reveals more posts in
  place. "Load more" is a real link to `/…/page/N/`, so without JS it just navigates
  there — those static `/page/N/` routes are the no-JS / crawler fallback, so keep them.
- Astro 7's default Markdown processor is **Sätteri** (Rust). This blog opts back
  into the **unified (remark/rehype)** pipeline because its remark plugins are
  unified plugins: `markdown.processor: unified({ remarkPlugins: [...] })` in
  `astro.config.mjs`, with `unified` imported from the explicitly-installed
  **`@astrojs/markdown-remark`** dependency (Astro 7 no longer bundles it).
  `shikiConfig` stays at the top-level `markdown` key. `compressHTML: true` is
  pinned to keep v6 whitespace behavior (Astro 7's default is `'jsx'`).
