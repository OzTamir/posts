/**
 * Per-post Markdown at /<slug>.md — the source the Worker serves when an agent
 * sends `Accept: text/markdown` for /<slug>/ (see worker/index.ts). Generated
 * at build from the post's MDX body, so it never drifts from the HTML page.
 */
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { postToMarkdown } from '../utils/post-markdown';

export const getStaticPaths = (async () => {
  const all = await getCollection('posts');
  return all.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export async function GET({ props }: { props: { post: Awaited<ReturnType<typeof getCollection<'posts'>>>[number] } }) {
  const md = await postToMarkdown(props.post);
  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
