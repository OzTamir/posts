import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const seo = {
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogTitle: z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  twitterTitle: z.string().nullable().optional(),
  twitterDescription: z.string().nullable().optional(),
  twitterImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
};

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string(),
      // New + legacy date/description/image fields (both accepted).
      date: z.coerce.date().optional(),
      pubDate: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
      description: z.string().nullable().optional(),
      excerpt: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      featureImage: z.string().nullable().optional(),
      imageAlt: z.string().nullable().optional(),
      featureImageAlt: z.string().nullable().optional(),
      imageCaption: z.string().nullable().optional(),
      featureImageCaption: z.string().nullable().optional(),
      // Tags: string[] (new) OR [{slug,name}] (legacy).
      tags: z
        .union([
          z.array(z.string()),
          z.array(z.object({ slug: z.string(), name: z.string() })),
        ])
        .default([]),
      author: z.string().default('oz'),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      ...seo,
    })
    .transform((d) => ({
      ...d,
      date: d.date ?? d.pubDate ?? new Date(),
      description: d.description ?? d.excerpt ?? undefined,
      image: d.image ?? d.featureImage ?? null,
      imageAlt: d.imageAlt ?? d.featureImageAlt ?? null,
      imageCaption: d.imageCaption ?? d.featureImageCaption ?? null,
      // Canonical tags = display-name strings.
      tags: (d.tags ?? []).map((t) => (typeof t === 'string' ? t : t.name)),
    })),
});

export const collections = { posts };
