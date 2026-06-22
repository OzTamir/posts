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
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      description: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      imageAlt: z.string().nullable().optional(),
      imageCaption: z.string().nullable().optional(),
      tags: z.array(z.string()).default([]),
      author: z.string().default('oz'),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      ...seo,
    })
    .transform((d) => ({
      ...d,
      image: d.image ?? null,
      imageAlt: d.imageAlt ?? null,
      imageCaption: d.imageCaption ?? null,
    })),
});

export const collections = { posts };
