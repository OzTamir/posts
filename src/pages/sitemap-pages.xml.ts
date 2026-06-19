/**
 * sitemap-pages.xml — the pages sub-sitemap.
 *
 * Includes only the site root (/); member/account routes are not
 * part of this static site. The xmlns:image namespace is present for
 * structural consistency with the other sub-sitemaps.
 */

import { SITE } from '../config';

export async function GET() {
  const siteUrl = SITE.url;

  // Fixed lastmod for the home page (matches the site's last settings update).
  const homepageLastmod = '2026-06-06T09:59:07.298Z';

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/xsl" href="//posts.oztamir.com/sitemap.xsl"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    `<url><loc>${siteUrl}/</loc><lastmod>${homepageLastmod}</lastmod></url>`,
    `</urlset>`,
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
