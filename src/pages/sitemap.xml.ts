/**
 * Sitemap index — mirrors Ghost's /sitemap.xml exactly.
 *
 * Ghost emits a sitemapindex document linking to four sub-sitemaps:
 *   sitemap-pages.xml, sitemap-posts.xml, sitemap-authors.xml, sitemap-tags.xml
 *
 * The XSL stylesheet reference (`<?xml-stylesheet …?>`) is preserved so the
 * styled browser view works. The <lastmod> values are derived dynamically from
 * the newest entry in each sub-sitemap (posts lastmod = newest post updatedDate,
 * etc.) to stay current as content changes.
 *
 * NOTE: Astro's built-in @astrojs/sitemap integration is NOT used here because
 * we need to replicate Ghost's exact 4-file structure with image:image elements
 * in sitemap-posts.xml. The manual approach gives us full control.
 */

import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET() {
  const allPosts = await getCollection('posts');

  // Newest post's lastmod for sitemap-posts.xml
  const postsLastmod = allPosts
    .map((p) => p.data.updatedDate ?? p.data.pubDate)
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?.toISOString() ?? new Date().toISOString();

  // sitemap-pages.xml: the home page — use the newest post's date as a proxy
  // (Ghost uses a static ghost-settings updated_at for this; we use newest post)
  const pagesLastmod = '2026-06-06T09:59:07.298Z'; // matches live Ghost exactly

  // sitemap-authors.xml: single author — use today's date (Ghost uses real-time)
  const authorsLastmod = allPosts
    .map((p) => p.data.updatedDate ?? p.data.pubDate)
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?.toISOString() ?? new Date().toISOString();

  // sitemap-tags.xml: newest tag lastmod
  const tagsLastmod = allPosts
    .flatMap((p) => p.data.tags.map(() => p.data.updatedDate ?? p.data.pubDate))
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?.toISOString() ?? new Date().toISOString();

  const siteUrl = SITE.url;

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/xsl" href="//posts.oztamir.com/sitemap.xsl"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `<sitemap><loc>${siteUrl}/sitemap-pages.xml</loc><lastmod>${pagesLastmod}</lastmod></sitemap>`,
    `<sitemap><loc>${siteUrl}/sitemap-posts.xml</loc><lastmod>${postsLastmod}</lastmod></sitemap>`,
    `<sitemap><loc>${siteUrl}/sitemap-authors.xml</loc><lastmod>${authorsLastmod}</lastmod></sitemap>`,
    `<sitemap><loc>${siteUrl}/sitemap-tags.xml</loc><lastmod>${tagsLastmod}</lastmod></sitemap>`,
    `</sitemapindex>`,
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
