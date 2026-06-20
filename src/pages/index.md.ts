/**
 * Homepage Markdown at /index.md — what the Worker serves for `/` when an agent
 * sends `Accept: text/markdown`. A compact site index (title, summary, every
 * post) so an agent landing on the root gets a usable map in one request.
 */
import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET() {
  const all = (await getCollection('posts')).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  const list = all
    .map((p) => {
      const url = `${SITE.url}/${p.id}/`;
      return `- [${p.data.title}](${url})${p.data.excerpt ? `: ${p.data.excerpt}` : ''}`;
    })
    .join('\n');

  const md = `# ${SITE.title}

> ${SITE.metaDescription}

${SITE.title} (${SITE.url}) is the personal blog of Oz Tamir. Request any page
with the \`Accept: text/markdown\` header to get its Markdown representation.

## Posts

${list}
`;

  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
