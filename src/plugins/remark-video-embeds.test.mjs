import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkVideoEmbeds from './remark-video-embeds.mjs';

async function render(md) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkVideoEmbeds)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(file);
}

test('![[clip.mp4]] → video-card figure with controls', async () => {
  const html = await render('![[clip.mp4]]\n');
  assert.match(html, /<figure class="video-card relative">/);
  assert.match(html, /<video[^>]+src="clip.mp4"/);
  assert.match(html, /controls/);
});

test('attributes: poster, title, autoplay', async () => {
  const html = await render('![[clip.mp4|poster=thumb.png|title=Demo|autoplay]]\n');
  assert.match(html, /poster="thumb.png"/);
  assert.match(html, /aria-label="Demo"/);
  assert.match(html, /autoplay/);
  assert.match(html, /loop/);
  assert.match(html, /muted/);
  assert.doesNotMatch(html, /controls/);
});
