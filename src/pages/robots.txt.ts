/**
 * robots.txt — allow all crawlers and point them to the sitemap index
 * emitted by @astrojs/sitemap (/sitemap-index.xml).
 *
 * The `Content-Signal` line declares AI-usage preferences for this content
 * (contentsignals.org): allow search indexing and use as AI-answer input
 * (RAG/grounding), but opt out of model training. It is advisory metadata,
 * not enforcement.
 */
import { SITE } from '../config';

export async function GET() {
  const content = `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /

Sitemap: ${SITE.url}/sitemap-index.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
