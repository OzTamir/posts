import type { PostWithMeta } from './posts';
import { slugify } from './slug';

export interface TagInfo {
  slug: string;
  name: string;
}

/** All tags (≥1 post), de-duplicated by slug. Title-cased name wins on collision. */
export function getAllTags(all: PostWithMeta[]): TagInfo[] {
  const map = new Map<string, string>();
  for (const { post } of all) {
    for (const name of post.data.tags ?? []) {
      const slug = slugify(name);
      const existing = map.get(slug);
      // Prefer a name that has an uppercase letter (the Title-cased variant).
      if (!existing || (/[A-Z]/.test(name) && !/[A-Z]/.test(existing))) {
        map.set(slug, name);
      }
    }
  }
  return [...map.entries()].map(([slug, name]) => ({ slug, name }));
}

/** Display name for a tag slug (falls back to the slug). */
export function tagName(all: PostWithMeta[], slug: string): string {
  return getAllTags(all).find((t) => t.slug === slug)?.name ?? slug;
}
