import { visit } from 'unist-util-visit';

const EMBED = /^!\[\[([^\]]+\.(?:mp4|webm|mov))((?:\|[^\]]*)*)\]\]$/i;

function parseAttrs(tail) {
  const attrs = { poster: undefined, title: undefined, autoplay: false };
  for (const part of tail.split('|').filter(Boolean)) {
    if (part === 'autoplay') attrs.autoplay = true;
    else {
      const [k, ...rest] = part.split('=');
      attrs[k.trim()] = rest.join('=').trim();
    }
  }
  return attrs;
}

/**
 * Turn `![[clip.mp4|poster=…|title=…|autoplay]]` (authored as a lone paragraph)
 * into the legacy <Video> markup. Image-optimized posters are out of scope here;
 * posters resolve as plain relative URLs (same tree as the post).
 */
export default function remarkVideoEmbeds() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index == null || node.children.length !== 1) return;
      const child = node.children[0];
      if (child.type !== 'text') return;
      const m = child.value.trim().match(EMBED);
      if (!m) return;

      const [, src, tail = ''] = m;
      const { poster, title, autoplay } = parseAttrs(tail);

      const videoProps = {
        src,
        ...(poster ? { poster } : {}),
        ...(autoplay
          ? { autoplay: true, loop: true, muted: true }
          : { controls: true }),
        preload: 'metadata',
        playsinline: true,
        ...(title ? { 'aria-label': title } : {}),
        className: 'block h-auto w-full max-w-full',
      };

      const figure = {
        type: 'videoFigure',
        data: {
          hName: 'figure',
          hProperties: { className: 'video-card relative' },
        },
        children: [
          { type: 'video', data: { hName: 'video', hProperties: videoProps }, children: [] },
        ],
      };
      parent.children.splice(index, 1, figure);
    });
  };
}
