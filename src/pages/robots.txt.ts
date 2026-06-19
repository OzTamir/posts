/**
 * robots.txt — allow all crawlers and point them to the sitemap index
 * emitted by @astrojs/sitemap (/sitemap-index.xml).
 */
import { SITE } from '../config';

export async function GET() {
  const content = `User-agent: *
Allow: /

Sitemap: ${SITE.url}/sitemap-index.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
