/**
 * Sitemap index (/sitemap.xml) — links to four sub-sitemaps:
 *   sitemap-pages.xml, sitemap-posts.xml, sitemap-authors.xml, sitemap-tags.xml
 *
 * The XSL stylesheet reference is preserved for the styled browser view.
 * The <lastmod> values are derived dynamically from the newest entry in each
 * sub-sitemap so they stay current as content changes.
 *
 * The manual approach (rather than @astrojs/sitemap) gives full control over
 * the 4-file structure and image:image elements in sitemap-posts.xml.
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

  // sitemap-pages.xml: fixed lastmod for the home page.
  const pagesLastmod = '2026-06-06T09:59:07.298Z';

  // sitemap-authors.xml: single author — use newest post date as proxy.
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
