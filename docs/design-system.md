# Design system

The look is a faithful 1:1 port of the site's Ghost theme — a **customized "Dawn"**
(internally `dawn-with-prism`) with a dark terminal aesthetic. The goal was visual
parity with the live site, not a redesign. Values here were extracted from the live
compiled theme CSS, then expressed as Tailwind v4 tokens + a small amount of ported CSS.

## Where styling lives

| File | Responsibility |
| --- | --- |
| `src/styles/global.css` | Font `@font-face`s, Tailwind v4 `@theme` tokens, the runtime `--*-color` variables, **dark-mode** definitions, base typography, and the ported layout/component CSS |
| `src/styles/content.css` | Everything inside a rendered post body (`.gh-content`): prose rhythm, code blocks, and the Ghost Koenig cards (image/figcaption/video/embeds) |

`global.css` imports `content.css`. The remote IBM Plex Mono `@import` is kept first so
it precedes Tailwind's rules (a CSS requirement).

## Fonts

| Family | Use | Source |
| --- | --- | --- |
| **Mulish** | sans / body + headings (`--font-sans`) | self-hosted `public/fonts/*.woff2` |
| **Lora** | serif (`--font-serif`) | self-hosted `public/fonts/*.woff2` |
| **IBM Plex Mono** | code + the terminal-style titles/labels (`--font-mono`) | Google Fonts `@import` |
| **Literata Variable**, **press-start-2p** | specific posts only | jsDelivr fontsource |

These mirror exactly what the live site loaded.

## Color system (two layers)

Because the theme flips between light and dark, colors use **two coordinated layers**:

1. **Tailwind `@theme` tokens** (in `global.css`) — generate utilities and expose
   `--color-*` custom properties. Use these for new components:
   `bg-bg`, `text-primary-text`, `text-secondary-text`, `font-mono`, `text-accent`,
   `text-twitter`, `text-rss`, etc.
2. **Runtime `--*-color` variables** (in `:root`, `.theme-dark:root`, `.theme-light:root`)
   — consumed by the ported component/content CSS. These are what actually **change per
   theme**, so dark/light swaps happen by re-pointing them, not by rewriting components.

Key palette (dark = the default):

| Role | Dark (default) | Light |
| --- | --- | --- |
| Accent (`--accent-color`) | `#ffd102` | `#e3b900` / `#970` |
| Primary text | `#e8e8e8` | `#1a1a1a` |
| Secondary text | `#a0a0a0` | `#666` |
| Background (`--white-color`) | `#1a1a1a` | `#fff` |
| Black surface | `#0f0f0f` | `#000` |

The accent is also published as `--ghost-accent-color` via a tiny `<style>` in `<head>`
(`#ffd102`), exactly as Ghost did.

Social brand colors (`--facebook-color`, `--twitter-color`, `--linkedin-color`,
`--rss-color`, …) are defined once and reused by the footer icons.

## Dark mode

The site **defaults to dark** and is sticky — a faithful reproduction of the live theme:

- `<html class="theme-dark">` is rendered by default (Ghost's `color_scheme: "Auto"`
  fell through to the theme's dark default).
- An inline script in `BaseLayout.astro` reads `localStorage['theme']`; on first visit it
  initialises from the `theme-dark`/`theme-light` class and **persists the choice**.
- The footer toggle (sun/moon) flips `.theme-dark`/`.theme-light` on `<html>` and updates
  `localStorage`. A `prefers-color-scheme` listener only applies when no choice is stored.

Dark/light values live in `global.css` under `.theme-dark:root` and `.theme-light:root`.

## Layout tokens & breakpoints

- `--navbar-height: 80px`, `--content-font-size: 1.7rem`, `--header-spacing: 60px`
  (`30px` on mobile via `@media (max-width: 767px)`).
- Content width comes from the ported `.gh-inner` / `.gh-canvas` grid (Dawn's named grid),
  which also drives `.kg-width-wide` / `.kg-width-full` image bleed.
- **Breakpoint:** Dawn's cutoff is **768px**, which equals Tailwind's default `md:`.
  Styling is mobile-first; `md:` = desktop. (Tailwind's other breakpoints remain available
  but the theme primarily uses this one.)

## Components

| Component | Props | Role |
| --- | --- | --- |
| `Head.astro` | `{ type, title, description, canonical, og*, twitter*, jsonLd inputs, … }` | All `<head>` SEO: title, meta, canonical, OpenGraph, Twitter card, JSON-LD, favicon, RSS link, accent style, Plausible |
| `BaseLayout.astro` | `{ head, bodyClass, isHome?, isPost? }` + slot | `<html>`/`<head>`/header/footer shell + theme script |
| `PostLayout.astro` | `{ post, readingTime, related, head }` + slot | Single-post article scaffold |
| `SiteHeader.astro` | — | Centered `0xZ` logo (nav is empty) |
| `SiteFooter.astro` | `{ isPost? }` | Social links (Twitter/LinkedIn/RSS) + theme toggle |
| `Cover.astro` | — | Home hero (logo + `# cat /dev/brain >> posts`) |
| `PostCard.astro` | `{ post, readingTime }` | Feed row: title, excerpt, date, reading time |
| `Pagination.astro` | `{ nextUrl? }` | "Load more" link to the next page |
| `AuthorCard.astro` | `{ author }` | Author header (avatar, name, bio) |
| `RelatedPosts.astro` | `{ related }` | Related-posts block under a post |
| `icons/*.astro` | — | Inline SVGs (Twitter, LinkedIn, RSS, Sun, Moon, Facebook, Search) |

## Post body (`content.css`)

Rendered Markdown is wrapped in `<div class="single-content gh-content gh-canvas">`.
`content.css` styles, under `.gh-content`: headings (h2–h4), paragraphs, links, lists,
blockquotes, tables, `hr`, inline `code`, and `pre` code blocks (IBM Plex Mono on a Nord
background — Shiki's `nord` theme supplies token colors). Ghost cards covered:
`kg-image-card` (+ `img` + `figcaption`), `kg-gallery-*`, `kg-video-card > video`,
`kg-embed-card`, `.twitter-tweet`, `.instagram-media`, plus bookmark/callout/button card
classes for forward-compatibility.

## Extending it consistently

- **New color or size:** add a token to `@theme` in `global.css`. If a component that uses
  the ported `--*-color` variables needs it to flip with the theme, also add it under
  `:root` + `.theme-dark:root` / `.theme-light:root`.
- **New component:** build with Tailwind utilities bound to the `@theme` tokens
  (`text-accent`, `font-mono`, …). Don't hardcode hex values or px sizes that duplicate a
  token — reference the token so light/dark and future tweaks stay consistent.
- **New post-body element / Ghost card:** style it under `.gh-content` in `content.css`,
  reusing the runtime variables.
- Keep the **768px** mental model: write mobile styles first, layer desktop under `md:`.
