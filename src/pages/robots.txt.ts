/**
 * robots.txt — reproduces the live Ghost /robots.txt exactly.
 *
 * The live file disallows Ghost-specific admin/member routes that don't exist
 * in the Astro migration. We keep them all to avoid accidentally un-blocking
 * any path that a crawler might have previously been told to skip.
 *
 * The Sitemap line points to the sitemap index at /sitemap.xml.
 */

export async function GET() {
  const content = `User-agent: *
Sitemap: https://posts.oztamir.com/sitemap.xml
Disallow: /ghost/
Disallow: /email/
Disallow: /members/api/comments/counts/
Disallow: /r/
Disallow: /webmentions/receive/
Disallow: /.ghost/analytics/api/
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
