/**
 * Deterministic hashing — the foundation of seed → cat mapping.
 *
 * The pipeline is: seed string → cyrb128() 128-bit entropy → sfc32() PRNG.
 * Two independent streams come out of the same hash:
 *
 *   sampleUnit(seed, label)  one decorrelated draw per trait — each label hashes
 *                            on its own, so adding, removing, or re-ordering a
 *                            sampled trait never disturbs the others.
 *   makePlacementRng(seed)   a stateful stream (the hash words rotated) used for
 *                            coat-patch placement, so structural traits and patch
 *                            positions are drawn from non-overlapping entropy.
 *
 * Both are tiny pure functions — no dependencies.
 */

/** Hash a string into four 32-bit words of entropy (the cyrb128 algorithm). */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** The sfc32 PRNG: four 32-bit words of state → a [0, 1) generator. */
export function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const FALLBACK = 'catsum';

/**
 * Deterministic uniform float in [0, 1) for a seed + label pair.
 *
 * Each label hashes independently into its own sfc32 stream, so traits never
 * influence each other: adding, removing, or re-ordering sampled values leaves
 * all others unchanged. An empty seed falls back to 'catsum'. A couple of draws
 * are discarded first to wash out the generator's initial bias.
 */
export function sampleUnit(seed: string, label: string): number {
  const [a, b, c, d] = cyrb128(`${label}:${seed.length === 0 ? FALLBACK : seed}`);
  const rng = sfc32(a, b, c, d);
  rng(); rng();
  return rng();
}

/**
 * A second, stateful sfc32 stream for coat-patch PLACEMENT. Seeded from the same
 * cyrb128 hash with its words rotated, so the entropy it consumes never overlaps
 * the per-trait draws of sampleUnit — structural traits and patch positions stay
 * independent. Call the returned function repeatedly to walk the stream.
 */
export function makePlacementRng(seed: string): () => number {
  const [a, b, c, d] = cyrb128(`placement:${seed.length === 0 ? FALLBACK : seed}`);
  const rng = sfc32(b, c, d, a);   // rotated words → a distinct stream
  rng(); rng();
  return rng;
}
