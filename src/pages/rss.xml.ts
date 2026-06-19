/**
 * RSS feed — mirrors the live Ghost /rss/ endpoint.
 *
 * Ghost's live /rss/ feed serves exactly 15 items (the most recent posts).
 * We replicate that limit. Change RSS_LIMIT to Infinity to include all 41 posts.
 *
 * content:encoded: Astro's Content Layer stores pre-rendered HTML on
 * `post.rendered.html`. We use that for full-HTML content:encoded.
 * The `content` field on RSSFeedItem maps to <content:encoded> in @astrojs/rss.
 *
 * Channel structure mirrors Ghost:
 *   <image> channel favicon block
 *   <atom:link> self-referential link
 *   <ttl>60</ttl>
 *   <media:content> per item (feature image)
 *   <dc:creator> per item
 *
 * The feed is served at /rss.xml. A 301 redirect in public/_redirects maps
 * the legacy Ghost URL /rss/ → /rss.xml so existing subscribers keep working.
 */

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';
import { AUTHORS } from '../data/authors';

// Ghost default feed limit is 15 items.
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

      // Tag names for <category> elements (Ghost uses tag.name)
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

      // Full post HTML from Astro's Content Layer pre-render (post.rendered.html)
      // This is equivalent to Ghost's <content:encoded> HTML body.
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
