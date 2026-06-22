/**
 * llms.txt at /llms.txt — the llmstxt.org standard: a Markdown index that
 * gives LLMs/agents a curated, low-overhead map of the site.
 *
 * H1 (site name) + blockquote summary, then a "Posts" file list (every post,
 * newest-first) and a "Feeds & metadata" list pointing at the machine-readable
 * surfaces. Built at request/build time from the same content collection the
 * RSS and /posts.json feeds use, so it never drifts from the published posts.
 *
 * Served as text/plain (the .txt extension; static builds derive content type
 * from the extension and drop endpoint response headers), which is the
 * conventional type for llms.txt.
 */

import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET() {
  const all = await getCollection('posts');

  const posts = all
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((post) => {
      const url = `${SITE.url}/${post.id}/`; // content layer: id = filename stem = slug
      const excerpt = post.data.description?.trim();
      return `- [${post.data.title}](${url})${excerpt ? `: ${excerpt}` : ''}`;
    })
    .join('\n');

  const content = `# ${SITE.title}

> ${SITE.metaDescription}

${SITE.title} (${SITE.url}) is the personal blog of Oz Tamir. Every post is
listed below, newest first; each link resolves to the full article as HTML.

## Posts

${posts}

## Feeds & metadata

- [Latest posts (JSON)](${SITE.url}/posts.json): machine-readable feed of the 10 most recent posts
- [RSS feed](${SITE.url}/rss.xml): full syndication feed
- [Sitemap](${SITE.url}/sitemap-index.xml): every indexable URL
- [API catalog](${SITE.url}/.well-known/api-catalog): RFC 9727 linkset of the above
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
