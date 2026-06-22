# Design system

The look is a **dark terminal aesthetic** — monospace IBM Plex Mono feed, yellow accent,
dark default. Values here are expressed as Tailwind v4 tokens + a small amount of
hand-crafted CSS, all in a **single CSS entry**: `src/styles/global.css`.

## Where styling lives

There is **one** CSS file: `src/styles/global.css`. It owns everything:

- The remote IBM Plex Mono `@import` (must precede `@import "tailwindcss"`)
- `@import "tailwindcss"` and `@plugin "@tailwindcss/typography"`
- `@custom-variant dark` (class-based: `.theme-dark`)
- `@theme` tokens (fonts, colors, spacing) — generate the utilities used in `.tsx` JSX
- `@font-face` blocks (self-hosted Mulish/Lora; jsDelivr Literata/Press Start 2P)
- Runtime `--*-color` custom properties that flip per theme (`:root`, `.theme-dark:root`,
  `.theme-light:root`, and a `prefers-color-scheme: dark` fallback)
- `@layer base` — preflight-adjacent resets + base typography
- `@layer components` — the named-grid, post-body (`.gh-content`/figure/table/code), and
  structural site chrome (header, feed cards, single post, tag archive) that cannot be
  cleanly expressed as inline utilities in JSX

**There is no `content.css`.** Component chrome (header, footer, feed cards, cover,
author card, related) is styled with Tailwind utility classes directly in the `.tsx`
files, bound to the `@theme` tokens.

## Fonts

| Family | Use | Source |
| --- | --- | --- |
| **Mulish** | sans / body + headings (`--font-sans`) | self-hosted `public/fonts/*.woff2` |
| **Lora** | serif (`--font-serif`) | self-hosted `public/fonts/*.woff2` |
| **IBM Plex Mono** | code + the terminal-style feed (`--font-mono`) | Google Fonts `@import` |
| **Literata Variable**, **press-start-2p** | specific posts only | jsDelivr fontsource |

## Color system (two layers)

Because the theme flips between light and dark, colors use **two coordinated layers**:

1. **Tailwind `@theme` tokens** (in `global.css`) — generate utilities and expose
   `--color-*` custom properties. Use these for new components in JSX:
   `bg-bg`, `text-primary-text`, `text-secondary-text`, `font-mono`, `text-accent`,
   `text-brand`, `text-twitter`, `text-rss`, etc.
2. **Runtime `--*-color` variables** (in `:root` + `.theme-dark:root` / `.theme-light:root`)
   — the values that actually **change per theme**. The `@theme` tokens point at these, so
   dark/light swaps happen by re-pointing the runtime variables, not by editing components.

Key palette:

| Role | Light (`:root`) | Dark (`.theme-dark:root`) |
| --- | --- | --- |
| Accent (`--accent-color`) | `#997700` | `#ffd102` |
| Primary text | `#1a1a1a` | `#e8e8e8` |
| Secondary text | `#666` | `#a0a0a0` |
| Background (`--white-color`) | `#fff` | `#1a1a1a` |
| Black surface (`--black-color`) | `#000` | `#0f0f0f` |

`--site-accent-color` is the single source of truth for the accent; it is defined in
`:root` (light: `#970`) and overridden in `.theme-dark:root` (dark: `#ffd102`). The
`@theme` tokens point at the runtime variables, so utilities like `text-brand` and
`text-accent` flip automatically.

Social brand colors (`--facebook-color`, `--twitter-color`, `--linkedin-color`,
`--rss-color`, …) are defined once and reused by the footer icons and author card.

## Dark mode

The site **follows the visitor's OS `prefers-color-scheme` by default**:

- An inline script in `BaseLayout.astro` runs before first paint (no flash). It reads
  `localStorage['theme']` if set, otherwise falls back to `prefers-color-scheme`.
- The footer toggle (sun/moon) flips `.theme-dark` / `.theme-light` on `<html>` and
  **persists the choice** in `localStorage` — but only on an explicit click. First-time
  visitors continue to follow the OS preference until they choose.
- A `prefers-color-scheme` listener updates the theme live while no choice is stored.

Dark/light values live in `global.css` under `.theme-dark:root` and `.theme-light:root`
(and a `@media (prefers-color-scheme: dark)` fallback for systems without forced class).

## Layout tokens & breakpoints

- `--navbar-height: 80px`, `--content-font-size: 1.7rem` (mobile) / `1.8rem` (desktop),
  `--header-spacing: 60px` (`30px` on mobile via `@media (max-width: 767px)`).
- Content width comes from the **named-grid system** (`.gh-canvas`):
  - `[main]` column — the standard prose width (720 px, responsive)
  - `[wide]` column — wider bleed (`.content-wide`), used by the `{wide}` image marker
  - `[full]` column — edge-to-edge (`.content-full`)
- **Breakpoint:** primary cutoff is **768 px** = Tailwind's `md:`. Styling is mobile-first.

## Components

| Component | File | Props | Role |
| --- | --- | --- | --- |
| `Head` | `src/components/Head.tsx` | `{ type, title, description, canonical, og*, twitter*, jsonLd inputs, … }` | All `<head>` SEO: title, meta, canonical, OG, Twitter card, JSON-LD, favicon, RSS link, Plausible |
| `BaseLayout` | `src/layouts/BaseLayout.astro` | `{ head, bodyClass, isHome?, isPost? }` + slot | `<html>`/`<head>`/body shell + inline theme script (stays `.astro` — owns the document root) |
| `PostLayout` | `src/layouts/PostLayout.tsx` | `{ post, readingTime, related, feature?, children }` | Single-post article scaffold (React) |
| `SiteHeader` | `src/components/SiteHeader.tsx` | — | Header with logo; renders `SITE.navigation` items if any |
| `SiteFooter` | `src/components/SiteFooter.tsx` | `{ isPost? }` | Social links (Twitter/LinkedIn/RSS from `SITE.social`) + theme toggle |
| `Cover` | `src/components/Cover.tsx` | — | Home hero (site icon + `# cat /dev/brain >> posts`) |
| `PostCard` | `src/components/PostCard.tsx` | `{ data: PostCardData }` | Feed row: title, excerpt, date, reading time (flat, serializable shape) |
| `PostFeed` | `src/components/PostFeed.tsx` | `{ posts: PostCardData[] }` | Shared `.post-feed` grid of `PostCard`s |
| `Feed` | `src/components/Feed.tsx` | `{ posts, perPage, nextHref? }` | Client island (`client:visible`): renders the feed and reveals more posts in place on "Load more" |
| `Pagination` | `src/components/Pagination.tsx` | `{ nextUrl? }` | Plain "Load more" link (the no-JS `/page/N/` fallback) |
| `AuthorCard` | `src/components/AuthorCard.tsx` | `{ author }` | Author archive header (avatar, name, bio, social links) |
| `RelatedPosts` | `src/components/RelatedPosts.tsx` | `{ related }` | "Hungry for more?" related-posts block under a post |
| `icons/*.tsx` | `src/components/icons/` | — | Inline SVGs (Twitter, LinkedIn, RSS, Sun, Moon, Facebook) |

## Post-body content (Markdown + remark plugins)

Post bodies are plain Markdown (`src/content/posts/<slug>/index.md`) — no JSX, no imports.
Two remark plugins (`src/plugins/`) turn Obsidian-friendly Markdown into the same figure
markup the old `<Figure>`/`<Video>` component kit produced, so the rendered look is
unchanged — only the authoring syntax differs.

| Syntax | Plugin | Renders |
| --- | --- | --- |
| `![alt](file.png)`, optionally an italic `*caption*` on the very next line; `{wide}` appended for the wide column | `remark-image-captions.mjs` | `figure.image-card` (`.has-caption` / `.content-wide` as applicable) wrapping an Astro-optimized `<img>` (WebP + srcset; GIFs preserved) |
| `![[clip.mp4\|poster=thumb.jpg\|title=…\|autoplay]]` on its own line | `remark-video-embeds.mjs` | `figure.video-card` wrapping `<video controls preload="metadata" playsinline>` (or muted/looping when `autoplay`) |
| Raw embed HTML pasted into the Markdown | — | `.twitter-tweet` / `.instagram-media` blockquotes; the page's inline embed-loader injects the third-party script only when the class is present |

Images live beside the post and go through Astro's optimizer; videos and their posters are
co-located too and copied to `dist/<slug>/` at build by the `copy-post-media` integration
(Astro's pipeline doesn't handle raw video). Authoring details: [building-and-content.md](./building-and-content.md).

## Post body styling

Rendered post Markdown is wrapped in `<div class="single-content gh-content gh-canvas">`.
Styling inside `.gh-content` (in `@layer components` in `global.css`):

- Headings (`h2`–`h4`), paragraphs, links (brand accent + underline), lists (disc/decimal
  restored after Tailwind Preflight reset), blockquotes, tables (horizontally scrollable),
  `hr`, inline `code`, and `pre` code blocks.
- Code blocks: IBM Plex Mono on a Nord background (`#2e3440`) — Shiki's `nord` theme
  supplies per-token colors via inline `<span style="color:…">`.
- Image figures: `figure.image-card` (from `remark-image-captions`), `.content-wide`
  (from the `{wide}` marker); video: `figure.video-card` (from `remark-video-embeds`).
  Consecutive captionless figures get tight spacing.
- Social embeds: `.twitter-tweet` and `.instagram-media` are centered before/while
  their third-party scripts upgrade them.

## Extending it consistently

- **New color or size:** add a token to `@theme` in `global.css`. If the value must flip
  with the theme, also add it under `:root` + `.theme-dark:root` / `.theme-light:root`.
- **New component:** build with Tailwind utilities bound to the `@theme` tokens
  (`text-accent`, `font-mono`, `bg-bg`, …). Don't hardcode hex/px values that duplicate
  a token.
- **New post-body element:** style it under `.gh-content` in `@layer components` in
  `global.css`, reusing the runtime `--*-color` variables.
- Keep the **768 px** mental model: write mobile styles first, layer desktop under `md:`.
