// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// 1:1 migration of the Ghost site at posts.oztamir.com.
// Fully static output served from Cloudflare Workers Static Assets.
export default defineConfig({
  site: 'https://posts.oztamir.com',
  output: 'static',
  // Ghost enforces trailing slashes on every URL (301 from non-slash).
  trailingSlash: 'always',
  build: {
    // Emit /slug/index.html so URLs are /slug/ — matches Ghost exactly.
    format: 'directory',
  },
  // Code blocks: the Ghost site used Prism with the Nord theme. Match it with
  // Shiki's built-in "nord" theme so syntax colors line up with the original.
  markdown: {
    shikiConfig: {
      theme: 'nord',
    },
  },
  // Images are served verbatim from /public/content/images/** to keep URLs
  // identical to Ghost (and to preserve animated GIFs), so we do not use
  // astro:assets optimization here.
  vite: {
    plugins: [tailwindcss()],
  },
});
