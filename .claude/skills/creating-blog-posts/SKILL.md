---
name: creating-blog-posts
description: >-
  Use when creating, adding, scaffolding, or publishing a new blog post in this
  repo (oz-blog / posts.oztamir.com, "0xZ") — even if the user only says "add a
  post", "write up X as a post", "draft a new article", or "put this on the
  blog". Covers the exact on-disk mechanics: the folder-per-post layout, the
  frontmatter schema, how images/video/captions/tags/embeds work, and how to
  verify the build. For the PROSE itself (voice, structure, tone), defer to the
  oz-skills:blog-post-writer skill — this skill is the companion that gets that
  draft into the repo correctly. Trigger this whenever a new post file needs to
  exist in src/content/posts, not just when "skill" is mentioned.
---

# Creating a blog post in this repo

This blog is a static **Astro** site (`posts.oztamir.com`). Posts are plain
Markdown, authored in this repo (and editable in Obsidian via VaultCMS). This
skill is the mechanics of getting a correct, building post onto disk. It does
**not** write the prose for you.

## Division of labor: this skill vs. the writing skill

- **`oz-skills:blog-post-writer`** owns the *content*: Oz's first-person
  tinkerer voice, the interview-first workflow, section structure, headline.
  If the user wants help *writing* the post (turning a project/experiment into
  prose), invoke that skill first — it produces the body text.
- **This skill** owns the *container*: where the file goes, what frontmatter it
  needs, how to reference images/video, and how to confirm it builds. Use it to
  place a draft (whether the writer skill produced it, the user pasted it, or
  you're scaffolding a stub) into the repo correctly.

A common flow: run `oz-skills:blog-post-writer` to get the Markdown body, then
use this skill to create the folder, frontmatter, and assets and verify the build.

## Where a post lives

One folder per post, with the post body always named `index.md`:

```
src/content/posts/<slug>/index.md      ← the post; folder name IS the URL slug
src/content/posts/<slug>/cover.png     ← co-located images (any name)
src/content/posts/<slug>/demo.mp4      ← co-located video + its poster
```

- The **folder name is the slug and the URL**: `src/content/posts/my-post/` →
  `https://posts.oztamir.com/my-post/` (root-level, trailing slash — NOT `/posts/...`).
- Choose a slug that's lowercase, hyphenated, and stable — it's load-bearing for
  SEO and inbound links. Don't rename an existing post's folder without a redirect.
- Everything a post needs (text + images + video) lives in its folder. The build
  optimizes images and (via the `copy-post-media` integration) copies videos to
  `dist/<slug>/`. You never put post assets in `public/`.

## Frontmatter

The schema is `src/content.config.ts` (read it if unsure). Required: `title`
and `date`. Everything else is optional. Use this as the starting template:

```yaml
---
title: "My New Post"
date: 2026-07-01
description: "One-line summary shown on cards and as the meta description."
image: cover.png            # co-located filename; omit/empty for a generated OG card
imageAlt: "What the cover shows"
tags:
  - Home Assistant          # display-name strings; tags[0] is the primary tag
  - automation
author: "oz"
featured: false
draft: false
---
```

Field notes (where the obvious guess is wrong):

- **`date`** is required and is a real date — `2026-07-01` or an ISO datetime.
  Ordering and the displayed date use `date` (there's also an optional
  `updatedDate`, which is intentionally NOT shown in the UI).
- **Never write `updatedDate: ""`** (or any date field as an empty string). The
  schema coerces dates, and `""` becomes an Invalid Date and **breaks the build**.
  Omit a date field entirely rather than leaving it blank.
- **`tags`** are plain strings (the display name), not objects. `tags[0]` is the
  primary tag (shown on cards + OpenGraph). The tag-page URL is derived by
  `slugify(name)` (`src/utils/slug.ts`), so "Home Assistant" → `/tag/home-assistant/`.
  Reuse existing tag spellings where possible — check other posts so you don't
  fork "AI" vs "ai".
- **`image`** is a co-located filename (e.g. `cover.png`), not a path. If a post
  has no `image`, a 1200×630 OG card is generated for it at build — that's fine
  and often preferable for text-only posts.
- **`author`** defaults to `oz`; keep it `"oz"`. An empty string drops the post
  from the `/author/oz/` archive (the default only applies when the key is absent).
- **`draft: true` does NOT currently hide a post** — there's no draft filter in
  the routes yet, so a `draft: true` post still builds and publishes. Treat
  `draft` as a marker only; if a post genuinely shouldn't go live, don't commit
  it (or ask before relying on `draft` to hide it).
- SEO overrides (`metaTitle`, `metaDescription`, `ogTitle`/`ogDescription`,
  `ogImage`, `twitter*`, `canonicalUrl`) are all optional — only add one to
  override a specific default.

## Writing the body (Markdown conventions)

The body is plain Markdown. Custom syntax is handled by remark plugins in
`src/plugins/` — author the source exactly as below and it renders to the
established look.

**Images** — co-locate the file, reference it by **basename**:

```markdown
![Alt text describing the image](wiring-diagram.png)
*An optional caption goes on the very next line, in italics.*
```

- The caption MUST be the italic line **immediately after** the image, with **no
  blank line between** — that's how the caption plugin attaches it as a
  `<figcaption>`. A blank line breaks the association.
- A caption may contain a link: `*Source: [esp32io](https://esp32io.com/…)*`.
- For a wide (full-bleed) image, append `{wide}` to the image line:
  `![Architecture](diagram.png){wide}`.
- Always use Markdown images (`![]()`). A raw HTML `<img src="local.png">`
  pointing at a co-located file will **404** — only Markdown image nodes go
  through Astro's optimizer. GIFs are preserved; other formats become WebP.

**Video** — co-locate the `.mp4` (+ an optional poster image) and embed it with
Obsidian wiki-embed syntax on its own line:

```markdown
![[demo.mp4|poster=demo-poster.jpg|title=Short description of the clip]]
```

- Attributes: `poster=<filename>`, `title=<text>`, and `autoplay` (implies muted
  + loop, for silent GIF-style clips). Reference files by basename; they're
  copied into `dist/<slug>/` at build by the `copy-post-media` integration. A
  video that isn't embedded won't be copied/served.

**Tweets / Instagram** — there's no native syntax yet; paste the platform's
embed HTML (the `<blockquote class="twitter-tweet">…` / `instgrm` block) directly
into the Markdown. It renders on the site but won't preview inside Obsidian.

**Code blocks** use fenced Markdown; Shiki highlights them with the **nord** theme.

**Internal links** to other posts are plain absolute Markdown links:
`[see my earlier post](/some-other-slug/)` (with the trailing slash).

## House style (defer to the writer skill for voice)

Two concrete constraints the writer skill enforces, repeated here because they
also bind a hand-authored post: **no em dashes**, and **no manual "FIN"/sign-off
line**; keep captions short. For anything beyond these mechanics — tone,
structure, how a Oz post should *read* — use `oz-skills:blog-post-writer`.

## Authoring in Obsidian (VaultCMS) — optional

The repo is also a VaultCMS vault: open `src/content` in Obsidian and use the
**"new post"** command, which scaffolds `posts/<slug>/index.md` from the
configured template and lets you drop images straight into the post folder. Use
plain `Ctrl/Cmd+N` only carefully — a bare note has empty frontmatter (no
`title`) and will fail the schema. When working as an agent in the terminal,
just create the files directly per the conventions above.

## Verify before claiming done

Run these and confirm they're clean — a new post is the most common cause of a
broken build (bad frontmatter, missing image):

```bash
npm run check          # astro check — keep at 0 errors
npm run build          # must succeed; watch for InvalidContentEntryDataError
npm run check:links    # no broken internal links
npm run preview        # eyeball the post at http://localhost:4321/<slug>/
```

Do **not** run `npm run dev` unless explicitly asked (use build + preview). If
`npm run build` reports `InvalidContentEntryDataError` for your post, the
frontmatter doesn't match the schema — most often a missing `title` or an empty
date string.

## Worked example

Creating a post at `/wled-desk-lamp/`:

```
src/content/posts/wled-desk-lamp/
├── index.md
├── cover.png
└── soldering-closeup.jpg
```

`index.md` (the body is plain Markdown — fenced code blocks, lists, etc. all
work as usual; only the frontmatter + image/caption mechanics are shown here):

```markdown
---
title: "Turning a Thrift-Store Lamp into a WLED Desk Light"
date: 2026-07-04
description: "A cheap lamp, an ESP32, and WLED: a weekend smart-lighting hack."
image: cover.png
imageAlt: "The finished lamp glowing purple on a desk"
tags:
  - projects
  - Home Assistant
author: "oz"
featured: false
draft: false
---

I found a sad little lamp at a thrift store and decided it needed an ESP32.

![The ESP32 wired to the lamp's LED strip](soldering-closeup.jpg)
*Soldering the strip to the ESP32, about as neat as my soldering gets.*

(...the rest of the post, including any fenced code blocks, follows here.)
```

Then: `npm run check && npm run build && npm run check:links`, and preview
`/wled-desk-lamp/`.

## Where to look for more

- `AGENTS.md` — the repo's full conventions (URLs, SEO, RSS, sitemap, deploy).
- `docs/building-and-content.md` — the detailed authoring workflow.
- `src/content.config.ts` — the authoritative frontmatter schema.
- `src/plugins/remark-image-captions.mjs`, `remark-video-embeds.mjs` — the
  image-caption and video-embed syntax, if you need the exact rules.
