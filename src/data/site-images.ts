/**
 * site-images.ts — brand/identity images as build-time assets.
 *
 * Importing the images here routes them through Astro's asset pipeline, so
 * every reference (favicon, header/cover logo, author avatar, OG/JSON-LD)
 * resolves to a hashed /_astro URL — no /content/images literals ship. These
 * are small fixed PNGs used in many places (and several in React components,
 * which can read an imported asset's `.src`), so a shared module is cleaner
 * than threading <Image> through the tree.
 *
 * `.src` is the hashed asset URL; `.width`/`.height` are the intrinsics.
 */
import logoImg from '../assets/content/images/site/logo.png';
import iconImg from '../assets/content/images/site/icon.png';
import ogDefaultImg from '../assets/content/images/site/og-default.png';
import profileImg from '../assets/content/images/site/avatar.png';

export const SITE_IMAGES = {
  /** Header / cover logo (also the default Twitter image). */
  logo: logoImg,
  /** Favicon + home cover icon. */
  icon: iconImg,
  /** Default Open Graph image for the home page. */
  ogDefault: ogDefaultImg,
  /** The single author's avatar (author card + post footer + JSON-LD). */
  profile: profileImg,
};
