/**
 * sitemap-tags.xml — one <url> per tag that has ≥1 post.
 * <lastmod> = most recent post date for that tag, sorted newest-first.
 * URL format: /tag/<slug>/ (trailing slash per site config).
 */

import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET() {
  const allPosts = await getCollection('posts');
  const siteUrl = SITE.url;

  // Build a map: tag slug → newest lastmod across posts using that tag
  const tagLastmod = new Map<string, Date>();

  for (const post of allPosts) {
    const postDate = post.data.updatedDate ?? post.data.pubDate;
    for (const tag of post.data.tags) {
      const existing = tagLastmod.get(tag.slug);
      if (!existing || postDate > existing) {
        tagLastmod.set(tag.slug, postDate);
      }
    }
  }

  // Sort by lastmod descending.
  const sortedTags = Array.from(tagLastmod.entries()).sort(
    ([, a], [, b]) => b.getTime() - a.getTime()
  );

  const urlEntries = sortedTags.map(([slug, date]) => {
    const loc = `${siteUrl}/tag/${slug}/`;
    const lastmod = date.toISOString();
    return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
  });

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/xsl" href="//posts.oztamir.com/sitemap.xsl"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urlEntries,
    `</urlset>`,
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
