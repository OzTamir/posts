/**
 * RSS feed at /rss.xml. A 301 redirect in public/_redirects maps /rss/ → /rss.xml.
 *
 * Serves the 15 most recent posts (change RSS_LIMIT to Infinity for all posts).
 * Uses `post.rendered.html` for full-HTML <content:encoded>.
 *
 * Channel extras: <image> favicon block, <atom:link> self-link, <ttl>60</ttl>.
 * Per-item extras: <dc:creator>, <media:content> (feature image), <category> tags.
 */

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';
import { AUTHORS } from '../data/authors';

// Feed limit — 15 most recent posts.
const RSS_LIMIT = 15;

export async function GET(context: { site: URL }) {
  const allPosts = await getCollection('posts');

  // Sort newest-first, take first RSS_LIMIT
  const posts = allPosts
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .slice(0, RSS_LIMIT);

  const siteUrl = SITE.url;

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? siteUrl,
    xmlns: {
      dc: 'http://purl.org/dc/elements/1.1/',
      content: 'http://purl.org/rss/1.0/modules/content/',
      atom: 'http://www.w3.org/2005/Atom',
      media: 'http://search.yahoo.com/mrss/',
    },
    // Channel-level extras that @astrojs/rss doesn't have first-class support for
    customData: [
      `<image><url>${siteUrl}/favicon.png</url><title>${SITE.title}</title><link>${siteUrl}/</link></image>`,
      `<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
      `<ttl>60</ttl>`,
    ].join(''),
    items: posts.map((post) => {
      const author = AUTHORS[post.data.author] ?? AUTHORS.oz;
      const slug = post.id; // content layer: id = filename stem = slug
      const postUrl = `${siteUrl}/${slug}/`;

      // Tag names for <category> elements.
      const categories = post.data.tags.map((t) => t.name);

      // Per-item custom XML
      const itemCustomData: string[] = [
        `<dc:creator><![CDATA[${author.name}]]></dc:creator>`,
      ];
      if (post.data.featureImage) {
        const imageUrl = post.data.featureImage.startsWith('http')
          ? post.data.featureImage
          : `${siteUrl}${post.data.featureImage}`;
        itemCustomData.push(
          `<media:content url="${imageUrl}" medium="image"/>`
        );
      }

      // Full post HTML from Astro's Content Layer pre-render (post.rendered.html).
      const htmlContent = post.rendered?.html ?? post.data.excerpt ?? '';

      return {
        title: post.data.title,
        description: post.data.excerpt ?? '',
        link: postUrl,
        pubDate: post.data.pubDate,
        // @astrojs/rss wraps this in <content:encoded><![CDATA[...]]>
        content: htmlContent,
        categories,
        customData: itemCustomData.join(''),
      };
    }),
  });
}
