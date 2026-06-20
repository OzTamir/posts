/**
 * Content-negotiation Worker in front of the static assets.
 *
 * Default behaviour is unchanged: assets are served as-is (HTML for browsers).
 * When an agent sends `Accept: text/markdown` for a page, we serve the matching
 * build-time Markdown sibling (/<slug>.md, /index.md for the homepage) with
 * `Content-Type: text/markdown` and an `x-markdown-tokens` estimate — the
 * convention from Cloudflare's "Markdown for Agents".
 *
 * Only HTML page routes reach this Worker (assets.run_worker_first in
 * wrangler.jsonc excludes /_astro/*, /fonts/*, /content/* and file types), so
 * fingerprinted assets keep being served directly without a Worker hop.
 */

interface Env {
  ASSETS: { fetch(input: Request | string | URL): Promise<Response> };
}

/** True when the client explicitly prefers Markdown over HTML (RFC 7231 q-values). */
function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const ranked = accept.split(',').map((part) => {
    const [type, ...params] = part.trim().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    return { type: type.trim().toLowerCase(), q: q ? parseFloat(q.slice(2)) : 1 };
  });
  const md = ranked.find((r) => r.type === 'text/markdown');
  if (!md || md.q <= 0) return false;
  const rivals = ranked
    .filter((r) => r.type === 'text/html' || r.type === 'application/xhtml+xml' || r.type === '*/*')
    .reduce((max, r) => Math.max(max, r.q), 0);
  return md.q >= rivals;
}

/** Map a page path to its Markdown sibling: "/" → "/index.md", "/x/" → "/x.md". */
function markdownPathFor(pathname: string): string | null {
  if (pathname === '/') return '/index.md';
  if (pathname.endsWith('/')) return `/${pathname.slice(1, -1)}.md`;
  return null; // not a page-like path (assets, feeds, etc.)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const isRead = request.method === 'GET' || request.method === 'HEAD';
    const url = new URL(request.url);
    const mdPath = isRead ? markdownPathFor(url.pathname) : null;

    if (mdPath && prefersMarkdown(request.headers.get('Accept'))) {
      const md = await env.ASSETS.fetch(new URL(mdPath, url));
      if (md.ok) {
        const text = await md.text();
        return new Response(request.method === 'HEAD' ? null : text, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            Vary: 'Accept',
            'X-Markdown-Tokens': String(Math.ceil(text.length / 4)),
            'Cache-Control': 'public, max-age=600',
          },
        });
      }
      // No Markdown variant for this page — fall through to HTML.
    }

    const response = await env.ASSETS.fetch(request);

    // Page responses are negotiable, so caches must key on Accept.
    if (mdPath) {
      const headers = new Headers(response.headers);
      headers.append('Vary', 'Accept');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  },
};
