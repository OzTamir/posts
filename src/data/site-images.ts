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
import logoImg from '../assets/content/images/2024/07/android-chrome-512x512-1.png';
import iconImg from '../assets/content/images/2024/07/android-chrome-512x512.png';
import ogDefaultImg from '../assets/content/images/2020/07/android-chrome-512x512.png';
import profileImg from '../assets/content/images/2024/06/profile_small-1.png';

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
