/**
 * sitemap-pages.xml — mirrors Ghost's /sitemap-pages.xml.
 *
 * The live Ghost sitemap-pages.xml includes the site root plus Ghost-specific
 * member pages (account, signin, signup, login). In the Astro migration, only
 * the site root is a real page; the Ghost member routes don't exist.
 *
 * We include only the site root (/) to keep the sitemap accurate.
 * The lastmod matches the live Ghost value (from ghost-settings updated_at).
 *
 * The xmlns:image namespace is present for structural consistency with the
 * other sub-sitemaps even though no <image:image> elements are emitted here
 * (Ghost includes it in all sub-sitemaps).
 */

import { SITE } from '../config';

export async function GET() {
  const siteUrl = SITE.url;

  // The live Ghost page uses the ghost-settings updated_at timestamp for /.
  // We use the same value to produce a byte-identical sitemap for the home page.
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
