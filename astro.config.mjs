// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

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
  // UI is authored in React (.tsx) and rendered to static HTML at build time.
  // Components ship zero client JS by default; only the components marked
  // `client:*` (the theme toggle + social-embed loader) hydrate.
  integrations: [react()],
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
