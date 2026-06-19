# Deployment & CI/CD (Cloudflare Workers)

The site ships as **static assets on Cloudflare Workers** (Workers Static Assets). There
is **no Worker script** — Cloudflare serves the prerendered files in `./dist` directly,
so there's no server runtime and asset requests don't count as Worker invocations.

Deploys are driven by the **Cloudflare Workers ↔ GitHub (Git) integration**: push to the
repo, Cloudflare builds it and deploys.

## `wrangler.jsonc`

```jsonc
{
  "name": "oz-blog",
  "compatibility_date": "2026-06-19",
  // NO "main" — purely static, no Worker script.
  "assets": {
    "directory": "./dist",                  // Astro's build output
    "not_found_handling": "404-page",        // serve dist/404.html with HTTP 404
    "html_handling": "auto-trailing-slash"   // /slug → /slug/ (trailing-slash canonical)
  }
}
```

- `not_found_handling: "404-page"` serves the prerendered `404.html` with a real 404
  status. (Switch to `"single-page-application"` only if the site ever becomes an SPA.)
- `html_handling: "auto-trailing-slash"` pairs with Astro's `trailingSlash: "always"` so
  every URL canonicalises to a trailing slash.

## Build settings

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output | `./dist` (via `assets.directory` — no separate "output dir" field needed) |
| Production deploy command | `npx wrangler deploy` |
| Preview (non-prod) deploy command | `npx wrangler versions upload` |
| Node version | 20+ |

## First-time setup: connect the GitHub repo

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository**
   (or open an existing Worker → **Settings → Builds → Connect**). Authorize the
   **"Cloudflare Workers and Pages"** GitHub app for the repo.
   > The Worker **name** in the dashboard must match `name` in `wrangler.jsonc` (`oz-blog`).
3. Set the **Build command** to `npm run build`. Leave the **Deploy command** at the
   default `npx wrangler deploy`. Root directory: blank.
4. **Production branch:** `main` (Settings → Build → Branch control).
5. **Preview deployments (optional):** enable "Builds for non-production branches" to get
   a preview URL + PR comment for every non-`main` push (deployed via
   `wrangler versions upload`).
6. **Custom domain:** Worker → **Settings → Domains & Routes → Add → Custom domain** →
   `posts.oztamir.com`. Cloudflare creates the DNS record and TLS cert automatically (the
   `oztamir.com` zone must be active on Cloudflare). Equivalent in config:
   ```jsonc
   "routes": [{ "pattern": "posts.oztamir.com", "custom_domain": true }]
   ```
   The production domain is also set in `astro.config.mjs` (`site`) and `src/config.ts`
   (`SITE.url`) — update both if the domain ever changes (they drive canonical URLs,
   OpenGraph, sitemaps, and RSS).

After that, every push to `main` triggers: install → `npm run build` → `wrangler deploy`.

## Redirects — `public/_redirects`

Files in `public/` are copied verbatim into `dist/`. Workers Static Assets honors
`_redirects`:

```
/rss/                       /rss.xml               301   # legacy feed URL → /rss.xml endpoint
/page/1/                    /                      301
/tag/:tag/page/1/           /tag/:tag/             301
/author/:author/page/1/     /author/:author/       301
```

(The RSS endpoint emits `/rss.xml`; the `<link rel="alternate">` and footer still point at
`/rss/`, so existing subscribers are 301'd through.)

## Cache headers — `public/_headers`

```
/content/images/*   Cache-Control: public, max-age=31536000, immutable
/content/media/*    Cache-Control: public, max-age=31536000, immutable
/fonts/*            Cache-Control: public, max-age=31536000, immutable
/_astro/*           Cache-Control: public, max-age=31536000, immutable
```

HTML is intentionally left to Cloudflare's defaults so content updates are picked up.

> Note: `_redirects`/`_headers` apply to static-asset responses. They'd be bypassed only
> if a Worker script (`main`) were added later — there isn't one.

## Rollback

Workers stores a full snapshot per deploy:

- **Dashboard:** Worker → **Deployments** → **Version History** → pick a previous version →
  **Deploy**.
- **CLI:** `npx wrangler versions list`, then `npx wrangler versions deploy` and select.
- **Via Git:** revert the offending commit and push — the integration rebuilds.

## Local production check

```bash
npm run build && npm run preview   # serves ./dist exactly as it will be served in prod
```

## What is NOT deployed

Only `./dist` is uploaded — the prerendered HTML, CSS, JS, and public assets.
