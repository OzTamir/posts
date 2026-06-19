/**
 * robots.txt — allow all crawlers and point them to the sitemap index.
 */

export async function GET() {
  const content = `User-agent: *
Allow: /

Sitemap: https://posts.oztamir.com/sitemap.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
