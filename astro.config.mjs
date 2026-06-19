// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

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
  // Components ship zero client JS (no `client:*` hydration anywhere); the
  // theme toggle + social-embed loaders are tiny inline scripts.
  integrations: [
    react(),
    // MDX so posts can use the semantic <Figure>/<Video>/<Tweet>/<Instagram>
    // component kit (optimized images, no kg-* markup) instead of raw HTML.
    mdx(),
    // Official sitemap. Emits /sitemap-index.xml + /sitemap-0.xml, replacing
    // the hand-rolled sitemap*.xml.ts endpoints. It inherits the site's
    // trailingSlash:"always" from the top-level config, so URLs stay canonical.
    sitemap(),
  ],
  // Code blocks highlighted by Shiki with the Nord theme.
  markdown: {
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
