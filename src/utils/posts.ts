/**
 * Shared post-collection helpers used by all routes.
 *
 * Posts are sorted newest-first by pubDate (Ghost's default published_at
 * DESC ordering). Reading time is precomputed from each post's raw body
 * with the Ghost-matching algorithm (see utils/format).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { readingTimeMinutes } from './format';

export interface PostWithMeta {
  post: CollectionEntry<'posts'>;
  readingTime: number;
}

/** All posts, newest-first, each paired with its reading time (minutes). */
export async function getSortedPosts(): Promise<PostWithMeta[]> {
  const posts = await getCollection('posts');
  return posts
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .map((post) => ({
      post,
      readingTime: readingTimeMinutes(post.body ?? ''),
    }));
}

/** Posts that include the given tag slug (in pubDate-desc order). */
export function filterByTag(all: PostWithMeta[], tagSlug: string): PostWithMeta[] {
  return all.filter(({ post }) => (post.data.tags ?? []).some((t) => t.slug === tagSlug));
}

/** Posts by the given author slug (in pubDate-desc order). */
export function filterByAuthor(all: PostWithMeta[], authorSlug: string): PostWithMeta[] {
  return all.filter(({ post }) => (post.data.author ?? 'oz') === authorSlug);
}

/**
 * Related posts for a single post: up to `limit` other posts that share
 * at least one tag, newest-first — mirrors Dawn's related-posts query
 * (filter="tags:[{{post.tags}}]+id:-{{post.id}}" limit="5").
 */
export function getRelated(
  all: PostWithMeta[],
  current: CollectionEntry<'posts'>,
  limit = 5,
): PostWithMeta[] {
  const tagSlugs = new Set((current.data.tags ?? []).map((t) => t.slug));
  if (tagSlugs.size === 0) return [];
  return all
    .filter(({ post }) => post.id !== current.id)
    .filter(({ post }) => (post.data.tags ?? []).some((t) => tagSlugs.has(t.slug)))
    .slice(0, limit);
}
