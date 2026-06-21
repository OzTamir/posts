/**
 * og-card.ts — build-time fallback Open Graph card renderer.
 *
 * Posts that have neither an explicit `ogImage` nor a `featureImage` get a
 * generated 1200×630 card so social scrapers still show a branded preview.
 * The visual is borrowed from the talks site (dark card, gold accent bar,
 * JetBrains Mono) but recoloured to THIS site's palette.
 *
 * Pipeline: satori renders a tiny flexbox tree to SVG (text → glyph paths,
 * so the SVG is self-contained), then the existing `sharp` dep rasterises it
 * to PNG. Both run at build time — the endpoint that calls this prerenders
 * one static PNG per imageless post into ./dist (no runtime cost).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

// Palette — the blog's own brand tokens (global.css), dark-mode gold accent.
const BG = '#1a1a1a';
const ACCENT = '#ffd102';
const TEXT = '#f2f2f2';
const MUTED = '#9a9a9a';

// Vendored TTFs (satori cannot read the site's woff2). Resolved from the
// project root rather than import.meta.url: this module is bundled into a
// prerender chunk at build time, so a path relative to the source file no
// longer points at src/assets. The build always runs from the repo root.
const fontPath = (file: string) => join(process.cwd(), 'src/assets/fonts', file);
const FONT_REGULAR = readFileSync(fontPath('JetBrainsMono-Regular.ttf'));
const FONT_BOLD = readFileSync(fontPath('JetBrainsMono-Bold.ttf'));

/** Minimal hyperscript for satori's VDOM (no JSX in a .ts module). */
type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/** Keep the card from overflowing its fixed height on long copy. */
const clamp = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

// Title size scales down with length so even a long title wraps to ~3 lines
// and never pushes the accent bar out of the 630px frame. (Blog titles run
// longer than the talks cards this is modelled on, hence smaller than the
// 88px original.)
const titlePx = (title: string): number =>
  title.length <= 28 ? 84 : title.length <= 52 ? 68 : 54;
const TAGLINE_PX = 33;

export interface OgCard {
  title: string;
  /** Sub-line under the title (the post excerpt). May be empty. */
  tagline: string;
  /** Top-right line, e.g. "Security · 07 Jul 2020". May be empty. */
  meta: string;
}

export async function renderOgCard(card: OgCard): Promise<Buffer> {
  const title = clamp(card.title, 85);
  const tagline = clamp(card.tagline, 130);

  const tree = h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '1200px',
      height: '630px',
      backgroundColor: BG,
      padding: '84px',
      fontFamily: 'JetBrains Mono',
    },
    [
      // Top row — meta, right-aligned.
      h('div', { display: 'flex', justifyContent: 'flex-end' }, [
        h('div', { display: 'flex', fontSize: '30px', color: MUTED }, card.meta),
      ]),
      // Middle — title + excerpt.
      h('div', { display: 'flex', flexDirection: 'column' }, [
        h(
          'div',
          {
            display: 'flex',
            fontSize: `${titlePx(title)}px`,
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.05,
          },
          title,
        ),
        tagline
          ? h(
              'div',
              {
                display: 'flex',
                fontSize: `${TAGLINE_PX}px`,
                color: MUTED,
                marginTop: '28px',
                lineHeight: 1.4,
                maxWidth: '1000px',
              },
              tagline,
            )
          : null,
      ]),
      // Bottom — accent bar (the signature element).
      h('div', { display: 'flex', height: '12px', width: '180px', backgroundColor: ACCENT }, ''),
    ],
  );

  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'JetBrains Mono', data: FONT_REGULAR, weight: 400, style: 'normal' },
      { name: 'JetBrains Mono', data: FONT_BOLD, weight: 700, style: 'normal' },
    ],
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}
