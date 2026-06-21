/**
 * /og/<slug>.png — generated fallback Open Graph card for a post.
 *
 * Prerendered at build time (static output) ONLY for posts that have neither
 * an explicit `ogImage` nor a `featureImage`; those are the only posts that
 * fall back to a generated card (see src/pages/[slug].astro). Posts with their
 * own image never reach this route, so no PNG is emitted for them.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getSortedPosts } from '../../utils/posts';
import { renderOgCard } from '../../utils/og-card';
import { formatPostDate } from '../../utils/format';

export const getStaticPaths = (async () => {
  const all = await getSortedPosts();
  return all
    .filter(({ post }) => !post.data.ogImage && !post.data.featureImage)
    .map(({ post }) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const d = (props as { post: Awaited<ReturnType<typeof getSortedPosts>>[number]['post'] }).post
    .data;
  const meta = formatPostDate(d.pubDate);
  const png = await renderOgCard({ title: d.title, tagline: d.excerpt ?? '', meta });

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
