import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkImageCaptions from './remark-image-captions.mjs';

async function render(md) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkImageCaptions)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(file);
}

test('plain image with no caption → figure.image-card', async () => {
  const html = await render('![a cat](cat.png)\n');
  assert.match(html, /<figure class="image-card">/);
  assert.match(html, /<img[^>]+alt="a cat"/);
  assert.doesNotMatch(html, /has-caption/);
});

test('image + emphasis line → figcaption', async () => {
  const html = await render('![a cat](cat.png)\n*A sleepy cat*\n');
  assert.match(html, /<figure class="image-card has-caption">/);
  assert.match(html, /<figcaption>A sleepy cat<\/figcaption>/);
});

test('{wide} marker → content-wide', async () => {
  const html = await render('![diagram](d.png){wide}\n');
  assert.match(html, /<figure class="image-card content-wide">/);
});
