/**
 * sitemap-posts.xml — mirrors Ghost's /sitemap-posts.xml.
 *
 * Includes all 41 posts with:
 *   <loc>   absolute URL with trailing slash
 *   <lastmod>  updatedDate ?? pubDate (ISO 8601)
 *   <image:image> feature image block (if featureImage is set)
 *
 * The image:image block matches Ghost's format:
 *   <image:image>
 *     <image:loc>https://…/content/images/…</image:loc>
 *     <image:caption>filename</image:caption>
 *   </image:image>
 *
 * Ghost sorts posts by published_at descending; we replicate that.
 * The XSL stylesheet PI and image namespace xmlns are both present.
 */

import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET() {
  const allPosts = await getCollection('posts');

  // Sort newest-first (matches Ghost's output order)
  const posts = allPosts.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );

  const siteUrl = SITE.url;

  const urlEntries = posts.map((post) => {
    const slug = post.id;
    const loc = `${siteUrl}/${slug}/`;
    const lastmod = (post.data.updatedDate ?? post.data.pubDate).toISOString();

    let imageBlock = '';
    if (post.data.featureImage) {
      const imagePath = post.data.featureImage;
      const imageUrl = imagePath.startsWith('http')
        ? imagePath
        : `${siteUrl}${imagePath}`;
      // Caption = filename (basename), matches Ghost behaviour
      const caption = imagePath.split('/').pop() ?? '';
      imageBlock = [
        `<image:image>`,
        `<image:loc>${imageUrl}</image:loc>`,
        `<image:caption>${caption}</image:caption>`,
        `</image:image>`,
      ].join('');
    }

    return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>${imageBlock}</url>`;
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
