import { visit } from 'unist-util-visit';

const WIDE = /^\{wide\}\s*$/;

/**
 * Turn a paragraph that is a lone image (optionally followed by an emphasis
 * caption line) into a <figure class="image-card [has-caption] [content-wide]">
 * matching the legacy <Figure> output. The image node is preserved so Astro
 * still optimizes the asset.
 *
 * remark parses `![img](src)\n*caption*` as a single paragraph with the image,
 * a "\n" text node, and an emphasis node as siblings. Similarly `{wide}` appears
 * as a trailing text node sibling after the image.
 */
export default function remarkImageCaptions() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index == null) return;
      const kids = node.children;

      // Find the image node.
      const image = kids.find((c) => c.type === 'image');
      if (!image) return;

      // Classify every child: image, whitespace text, {wide} marker, emphasis (caption), or other.
      let wide = false;
      let caption = null;
      let hasOther = false;

      for (const c of kids) {
        if (c.type === 'image') continue;
        if (c.type === 'text' && !c.value.trim()) continue; // whitespace/newline
        if (c.type === 'text' && WIDE.test(c.value.trim())) {
          wide = true;
          continue;
        }
        if (c.type === 'emphasis') {
          caption = c.children;
          continue;
        }
        hasOther = true;
      }

      // If there are non-image, non-whitespace, non-wide, non-emphasis children, skip.
      if (hasOther) return;

      // Strip {wide} from image alt if present (alternate placement).
      if (typeof image.alt === 'string' && /\{wide\}\s*$/.test(image.alt)) {
        wide = true;
        image.alt = image.alt.replace(/\{wide\}\s*$/, '').trim();
      }

      const className = ['image-card', caption ? 'has-caption' : '', wide ? 'content-wide' : '']
        .filter(Boolean)
        .join(' ');

      const figcaption = caption
        ? [{ type: 'figcaption', data: { hName: 'figcaption' }, children: caption }]
        : [];

      const figure = {
        type: 'figure',
        data: { hName: 'figure', hProperties: { className } },
        children: [image, ...figcaption],
      };

      parent.children.splice(index, 1, figure);
    });
  };
}
