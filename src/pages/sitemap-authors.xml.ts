/**
 * sitemap-authors.xml — one entry per author (single author: oz).
 * <loc> = /author/oz/
 * <lastmod> = most recently updated post date (deterministic for static builds).
 */

import { getCollection } from 'astro:content';
import { AUTHORS } from '../data/authors';

export async function GET() {
  const allPosts = await getCollection('posts');

  // Author's lastmod = newest post updated_at / pub_date
  const authorLastmod = allPosts
    .map((p) => p.data.updatedDate ?? p.data.pubDate)
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?.toISOString() ?? new Date().toISOString();

  const author = AUTHORS.oz;

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/xsl" href="//posts.oztamir.com/sitemap.xsl"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    `<url><loc>${author.url}</loc><lastmod>${authorLastmod}</lastmod></url>`,
    `</urlset>`,
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
