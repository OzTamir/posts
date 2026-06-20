import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Posts collection — one Markdown file per post at src/content/posts/<slug>.md.
 * The filename IS the slug (post.id === slug), so routes use post.id directly
 * to generate /<slug>/ URLs.
 *
 * Images are referenced by path (e.g. /content/images/posts/<slug>/featured.png)
 * and resolved through Astro's asset pipeline (optimized + hashed) — see
 * src/components/mdx/images.ts.
 */
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    // Short summary — used for cards + meta description fallback.
    excerpt: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(), // not surfaced in UI
    // Tags in display order; tags[0] is the primary tag (shown on cards + og keywords).
    tags: z
      .array(z.object({ slug: z.string(), name: z.string() }))
      .default([]),
    author: z.string().default('oz'),
    // Public path, e.g. "/content/images/posts/<slug>/featured.png" (or null).
    featureImage: z.string().nullable().optional(),
    featureImageAlt: z.string().nullable().optional(),
    featureImageCaption: z.string().nullable().optional(),
    featured: z.boolean().default(false),
    // Per-post SEO overrides. All optional.
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
