// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import stripImageMetadata from './src/integrations/strip-image-metadata.mjs';
import copyPostMedia from './src/integrations/copy-post-media.mjs';
import remarkImageCaptions from './src/plugins/remark-image-captions.mjs';
import remarkVideoEmbeds from './src/plugins/remark-video-embeds.mjs';

// Fully static output served from Cloudflare Workers Static Assets.
export default defineConfig({
  site: 'https://posts.oztamir.com',
  output: 'static',
  // Trailing slashes on every URL (enforced globally).
  trailingSlash: 'always',
  build: {
    // Emit /slug/index.html so URLs are /slug/.
    format: 'directory',
  },
  // Post images are imported assets (src/assets/content/images/**) and
  // optimized at build time. `constrained` makes <Image> responsive by
  // default (auto srcset + sizes, lazy), scaling down to the container but
  // never upscaling past the original — matching the old full-width images.
  image: {
    layout: 'constrained',
  },
  // UI is authored in React (.tsx) and rendered to static HTML at build time.
  // Most of it ships no client JS; the interactive feed pager hydrates as a
  // `client:visible` island (Feed.tsx), and the theme toggle + social-embed
  // loaders are tiny inline scripts.
  integrations: [
    react(),
    // Official sitemap. Emits /sitemap-index.xml + /sitemap-0.xml, replacing
    // the hand-rolled sitemap*.xml.ts endpoints. It inherits the site's
    // trailingSlash:"always" from the top-level config, so URLs stay canonical.
    // Generated OG card PNGs (/og/*.png) are social-scraper assets, not pages.
    sitemap({ filter: (page) => !page.includes('/og/') }),
    // Copy co-located post videos + posters into dist/<slug>/ (one source of
    // truth per post; Astro's pipeline can't optimize/serve raw video files).
    // Runs before strip-image-metadata so copied posters are EXIF-scrubbed too.
    copyPostMedia(),
    // Strip EXIF/XMP/IPTC from emitted raster images (privacy backstop; the
    // committed sources are also scrubbed with exiftool).
    stripImageMetadata(),
  ],
  // Code blocks highlighted by Shiki with the Nord theme.
  // remark plugins via processor API (markdown.remarkPlugins is deprecated in Astro 6.4+).
  // shikiConfig stays at top-level markdown (unified() does not forward it to Shiki).
  markdown: {
    processor: unified({
      remarkPlugins: [remarkVideoEmbeds, remarkImageCaptions],
    }),
    shikiConfig: {
      theme: 'nord',
    },
  },
  // Images are served verbatim from /public/content/images/** to preserve
  // animated GIFs and keep image URLs stable; astro:assets is not used.
  vite: {
    plugins: [tailwindcss()],
  },
});
