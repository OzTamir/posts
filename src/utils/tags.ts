/**
 * Tag derivation — there is no separate tag collection, so we build the
 * set of tags from the posts themselves (every tag that has ≥1 post),
 * preserving each tag's display name. The slug → name map uses the first
 * occurrence seen while iterating newest-first posts.
 */
import type { PostWithMeta } from './posts';

export interface TagInfo {
  slug: string;
  name: string;
}

/** All tags that appear on at least one post, de-duplicated by slug. */
export function getAllTags(all: PostWithMeta[]): TagInfo[] {
  const map = new Map<string, string>();
  for (const { post } of all) {
    for (const t of post.data.tags ?? []) {
      if (!map.has(t.slug)) map.set(t.slug, t.name);
    }
  }
  return [...map.entries()].map(([slug, name]) => ({ slug, name }));
}

/** The display name for a tag slug (falls back to the slug). */
export function tagName(all: PostWithMeta[], slug: string): string {
  for (const { post } of all) {
    const found = (post.data.tags ?? []).find((t) => t.slug === slug);
    if (found) return found.name;
  }
  return slug;
}
