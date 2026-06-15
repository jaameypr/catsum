/**
 * Tiny colour helpers. Every cat colour is derived from the coat hue, so the
 * whole palette shifts together along one axis. No dependencies.
 */

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Convert HSL (h 0–360, s/l 0–1) to a 0xRRGGBB integer. */
export function hslToInt(h: number, s: number, l: number): number {
  s = clamp01(s);
  l = clamp01(l);
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

/** Convert HSL to a `#rrggbb` string for SVG fills/strokes. */
export function hslHex(h: number, s: number, l: number): string {
  return '#' + hslToInt(((h % 360) + 360) % 360, s, l).toString(16).padStart(6, '0');
}

export interface Palette {
  /** Main coat fill. */
  base:     string;
  /** Lighter coat shade — top highlight for soft volume. */
  hi:       string;
  /** Darker coat shade — bottom shadow for soft volume. */
  lo:       string;
  /** Outline / contour — darker, less saturated. */
  edge:     string;
  /** Pattern colour (stripes, spots, patches) — deeper than the base. */
  deep:     string;
  /** Belly / chest / muzzle — lighter, washed out. */
  lite:     string;
  /** Darker extremities for pointed coats (ears, mask, paws, tail tip). */
  point:    string;
  /** Inner-ear pink. */
  innerEar: string;
  /** Nose pink. */
  nose:     string;
  /** Left eye iris. */
  eyeL:     string;
  /** Right eye iris (differs from eyeL when heterochromia lands). */
  eyeR:     string;
}
