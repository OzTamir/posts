/**
 * Latest-posts JSON feed at /posts.json — a static, build-time sibling of
 * /rss.xml. Consumed cross-origin by the homepage (oztamir.com) to render its
 * "latest posts" section; CORS lives in public/_headers (static builds drop
 * endpoint response headers).
 *
 * Emits the 10 most recent posts, newest-first, with absolute post URLs and
 * optimized absolute feature-image URLs (same helper the RSS feed uses).
 */

import { getCollection } from 'astro:content';
import { SITE } from '../config';
import { socialImageUrl } from '../utils/images';

// Feed limit — 10 most recent posts (homepage slices to the 3 it shows).
const FEED_LIMIT = 10;

export async function GET() {
  const all = await getCollection('posts');

  const recent = all
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .slice(0, FEED_LIMIT);

  const posts = await Promise.all(
    recent.map(async (post) => {
      const slug = post.id; // content layer: id = filename stem = slug
      const featured = await socialImageUrl(SITE.url, post.data.featureImage);
      return {
        title: post.data.title,
        slug,
        url: `${SITE.url}/${slug}/`,
        excerpt: post.data.excerpt ?? null,
        pubDate: post.data.pubDate.toISOString(),
        featureImage: featured?.url ?? null,
      };
    }),
  );

  return new Response(JSON.stringify({ posts }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
