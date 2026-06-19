import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Posts collection — one Markdown file per Ghost post at src/content/posts/<slug>.md.
 * The filename IS the slug (post.id === slug), so routes use post.id directly to
 * reproduce Ghost's /<slug>/ URLs 1:1.
 *
 * Images are referenced by their original Ghost path (e.g. /content/images/2020/07/x.png)
 * and served verbatim from /public, so feature/inline image URLs stay identical to Ghost.
 */
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    // Ghost custom_excerpt — used for cards + meta description fallback.
    excerpt: z.string().optional(),
    pubDate: z.coerce.date(), // published_at
    updatedDate: z.coerce.date().optional(), // updated_at (noisy post-export; not surfaced in UI)
    // Tags in Ghost order; tags[0] is the primary tag (shown on cards + og keywords).
    tags: z
      .array(z.object({ slug: z.string(), name: z.string() }))
      .default([]),
    author: z.string().default('oz'),
    // Absolute public path, e.g. "/content/images/2020/07/codye-5.png" (or null).
    featureImage: z.string().nullable().optional(),
    featureImageAlt: z.string().nullable().optional(),
    featureImageCaption: z.string().nullable().optional(),
    featured: z.boolean().default(false),
    // Per-post SEO overrides (Ghost posts_meta). All optional.
    metaTitle: z.string().nullable().optional(),
    metaDescription: z.string().nullable().optional(),
    ogTitle: z.string().nullable().optional(),
    ogDescription: z.string().nullable().optional(),
    ogImage: z.string().nullable().optional(),
    twitterTitle: z.string().nullable().optional(),
    twitterDescription: z.string().nullable().optional(),
    twitterImage: z.string().nullable().optional(),
    canonicalUrl: z.string().nullable().optional(),
  }),
});

export const collections = { posts };
