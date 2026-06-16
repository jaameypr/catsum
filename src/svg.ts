/**
 * The cat renderer — a pure function from resolved traits to an SVG string.
 *
 * THE ONE RULE: there is exactly one cat anatomy — a rounded head with cheeks,
 * two rounded ears, a tapered sitting body, two front paws, a curling tail. That
 * layout never changes; the seed only scales it within hand-tuned bounds, so
 * every output is always a valid cat. Coat patterns are GENERATED
 * (stripes/blobs/spots/regions), clipped to the body+head+paw silhouette so
 * nothing spills outside, and the face is drawn last, on top.
 *
 * Volume comes from soft SVG gradients (highlight → base → shadow); there are no
 * external assets — no <image>, no href references.
 *
 * Element ids are suffixed with a per-cat hash so several inline cats can share a
 * page (the gallery) without their clip-paths/gradients colliding.
 */

import { CatsumConfig } from './config';
import { cyrb128 } from './random';

/** Round to 2dp and stringify — keeps the markup short and byte-stable. */
function f(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

const CX = 120;

interface BuildOptions {
  /** Add a subtle idle animation (slow blink). Off by default. Never rotates. */
  animate?: boolean;
}

/** Build the complete `<svg>…</svg>` markup for a resolved cat config. */
export function buildCatSvg(
  config: CatsumConfig,
  place: () => number,
  options: BuildOptions = {},
): string {
  const { coat, build, head, ear, eye, tail, mood, colors } = config;
  const animate = options.animate ?? false;

  // Per-cat id suffix so multiple inline cats don't share gradient/clip ids.
  const uid = cyrb128(JSON.stringify(config))[0].toString(36);

  // ── Anatomy constants (bounded multipliers around the fixed template) ───────
  const hs = head.size;
  const es = ear.size;
  const chonk = build.chonk;

  const headCY = 110;
  const headHalfW = 52 * hs;
  const headTopY = headCY - 46 * hs;
  const chinY = headCY + 50 * hs;

  const bw = 58 * chonk;            // body half-width near the base
  // Anchor the body's neckline just under the chin so the head always sits ON the
  // body with a consistent tuck, regardless of head.size. A fixed neckline let the
  // body's top-centre poke up into the chin for some head sizes.
  const neckY = chinY - 2;

  // ── Pattern-dependent fills ─────────────────────────────────────────────────
  const white = colors.lite;        // chest/muzzle white reads from the palette
  const calicoA = colors.deep;
  const calicoB = colors.edge;

  const pointed = coat.pattern === 'pointed';
  const tuxLike = coat.pattern === 'tuxedo' || coat.pattern === 'bicolor';
  const limbFill = pointed ? colors.point : colors.base;
  const pawFill = tuxLike ? white : limbFill;

  // ── Shape paths (reused by the fills and the clip silhouette) ───────────────
  const bodyPath =
    `M ${f(CX - 28)},${f(neckY)} ` +
    `C ${f(CX - bw)},${f(184)} ${f(CX - bw)},${f(216)} ${f(CX - bw * 0.92)},${f(238)} ` +
    `Q ${f(CX - bw * 0.78)},${f(252)} ${f(CX - bw * 0.4)},${f(252)} ` +
    `L ${f(CX + bw * 0.4)},${f(252)} ` +
    `Q ${f(CX + bw * 0.78)},${f(252)} ${f(CX + bw * 0.92)},${f(238)} ` +
    `C ${f(CX + bw)},${f(216)} ${f(CX + bw)},${f(184)} ${f(CX + 28)},${f(neckY)} ` +
    `C ${f(CX + 14)},${f(neckY + 2)} ${f(CX - 14)},${f(neckY + 2)} ${f(CX - 28)},${f(neckY)} Z`;

  const headPath =
    `M ${f(CX)},${f(headTopY)} ` +
    `C ${f(CX + 34 * hs)},${f(headTopY - 2)} ${f(CX + headHalfW)},${f(headCY - 22 * hs)} ${f(CX + headHalfW)},${f(headCY)} ` +
    `C ${f(CX + headHalfW)},${f(headCY + 24 * hs)} ${f(CX + 28 * hs)},${f(chinY)} ${f(CX)},${f(chinY)} ` +
    `C ${f(CX - 28 * hs)},${f(chinY)} ${f(CX - headHalfW)},${f(headCY + 24 * hs)} ${f(CX - headHalfW)},${f(headCY)} ` +
    `C ${f(CX - headHalfW)},${f(headCY - 22 * hs)} ${f(CX - 34 * hs)},${f(headTopY - 2)} ${f(CX)},${f(headTopY)} Z`;

  // Rounded ear (convex outer edge, concave inner). sign: -1 left, +1 right.
  const earPath = (sign: 1 | -1): string => {
    const baseOuterX = CX + sign * (headHalfW - 4 * hs);
    const baseOuterY = headCY - 22 * hs;
    const baseInnerX = CX + sign * 15 * hs;
    const baseInnerY = headTopY + 4 * hs;
    const tipX = CX + sign * (38 * hs + ear.tilt * 26);
    const tipY = headTopY - 38 * es;
    return (
      `M ${f(baseOuterX)},${f(baseOuterY)} ` +
      `Q ${f(CX + sign * (44 * hs + ear.tilt * 22))},${f(headTopY - 22 * es)} ${f(tipX)},${f(tipY)} ` +
      `Q ${f(CX + sign * 18 * hs)},${f(headTopY - 6 * es)} ${f(baseInnerX)},${f(baseInnerY)} ` +
      `L ${f(baseOuterX)},${f(baseOuterY)} Z`
    );
  };
  // Inner ear: ear path's points pulled toward the ear centroid.
  const innerEarPath = (sign: 1 | -1): string => {
    const baseOuterX = CX + sign * (headHalfW - 4 * hs);
    const baseOuterY = headCY - 22 * hs;
    const baseInnerX = CX + sign * 15 * hs;
    const baseInnerY = headTopY + 4 * hs;
    const tipX = CX + sign * (38 * hs + ear.tilt * 26);
    const tipY = headTopY - 38 * es;
    const gx = (baseOuterX + baseInnerX + tipX) / 3;
    const gy = (baseOuterY + baseInnerY + tipY) / 3;
    const s = 0.56;
    const p = (x: number, y: number) => `${f(gx + (x - gx) * s)},${f(gy + (y - gy) * s + 3)}`;
    return `M ${p(baseOuterX, baseOuterY)} L ${p(tipX, tipY)} L ${p(baseInnerX, baseInnerY)} Z`;
  };

  // Front paws — rounded mittens sitting on the baseline.
  const pawDX = 20 * chonk;
  const pawW = 15;
  const paw = (px: number): string =>
    `M ${f(px - pawW)},252 v-9 a${pawW},${pawW} 0 0 1 ${pawW * 2},0 v9 Z`;
  const pawToes = (px: number): string =>
    `<path d="M ${f(px - 5)},243 v7 M ${f(px + 5)},243 v7" stroke="${colors.edge}" stroke-width="1" stroke-linecap="round" opacity="0.5" fill="none"/>`;

  // Tail — a tapered crescent curling up the right side, behind the body.
  const tailTopY = 150 - tail.curl * 6;
  const tailPath =
    `M ${f(CX + bw - 10)},244 ` +
    `C ${f(CX + bw + 28)},236 ${f(CX + bw + 30)},182 ${f(CX + bw + 8)},${f(tailTopY)} ` +
    `C ${f(CX + bw - 2)},${f(tailTopY + 8)} ${f(CX + bw + 14)},196 ${f(CX + bw - 6)},226 Z`;
  const tailTip = pointed ? colors.point : colors.base;

  // ── Patterns (clipped to the silhouette) ────────────────────────────────────
  let pattern = '';

  if (coat.pattern === 'tabby') {
    const n = 4 + Math.floor(place() * 3);          // 4–6 stripe pairs
    const parts: string[] = [];
    for (let k = 1; k <= n; k++) {
      const off = (bw / (n + 1)) * k;
      const amp = 4 + place() * 5;
      for (const sgn of [-1, 1]) {
        const x = CX + sgn * off;
        parts.push(`<path d="M ${f(x)},${f(neckY)} C ${f(x + amp)},190 ${f(x - amp)},220 ${f(x)},250"/>`);
      }
    }
    // Forehead markings + tail rings.
    for (const sgn of [-1, 0, 1]) {
      const x = CX + sgn * 10 * hs;
      parts.push(`<path d="M ${f(x)},${f(headTopY + 8)} L ${f(x)},${f(headCY - 12)}"/>`);
    }
    pattern =
      `<g fill="none" stroke="${colors.deep}" stroke-width="5" stroke-linecap="round" opacity="0.55">${parts.join('')}</g>`;
  } else if (coat.pattern === 'spotted') {
    const parts: string[] = [];
    for (let i = 0; i < 18; i++) {
      const x = CX + (place() - 0.5) * bw * 1.7;
      const y = headTopY + 24 + place() * (250 - headTopY - 30);
      const r = 3.5 + place() * 4.5;
      parts.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * (0.7 + place() * 0.5))}"/>`);
    }
    pattern = `<g fill="${colors.deep}" opacity="0.7">${parts.join('')}</g>`;
  } else if (coat.pattern === 'calico') {
    const parts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const x = CX + (place() - 0.5) * bw * 1.7;
      const y = headTopY + 16 + place() * (250 - headTopY - 26);
      const r = 15 + place() * 17;
      const fill = place() < 0.5 ? calicoA : calicoB;
      parts.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * (0.7 + place() * 0.55))}" fill="${fill}"/>`);
    }
    pattern = `<g opacity="0.9">${parts.join('')}</g>`;
  } else if (coat.pattern === 'tuxedo') {
    const bib = `M ${f(CX - 20)},${f(neckY)} Q ${f(CX)},${f(neckY + 2)} ${f(CX + 20)},${f(neckY)} L ${f(CX + 13)},242 Q ${f(CX)},252 ${f(CX - 13)},242 Z`;
    pattern =
      `<g fill="${white}">` +
      `<path d="${bib}"/>` +
      `<ellipse cx="${CX}" cy="${f(headCY + 22 * hs)}" rx="${f(24 * hs)}" ry="${f(17 * hs)}"/>` +
      `</g>`;
  } else if (coat.pattern === 'bicolor') {
    const side = place() < 0.5 ? -1 : 1;
    pattern =
      `<g fill="${white}">` +
      `<ellipse cx="${CX}" cy="214" rx="${f(bw * 0.82)}" ry="58"/>` +
      `<ellipse cx="${f(CX + side * 7 * hs)}" cy="${f(headCY + 8)}" rx="${f(18 * hs)}" ry="${f(34 * hs)}"/>` +
      `</g>`;
  } else if (pointed) {
    pattern =
      `<g fill="${colors.point}" opacity="0.85">` +
      `<path d="${earPath(-1)}"/><path d="${earPath(1)}"/>` +
      `<ellipse cx="${CX}" cy="${f(headCY + 18 * hs)}" rx="${f(30 * hs)}" ry="${f(24 * hs)}" opacity="0.75"/>` +
      `</g>`;
  }
  // 'solid' adds no pattern.

  // ── Face ───────────────────────────────────────────────────────────────────
  const eyeY = headCY + 2;
  const eyeDX = 21 * hs;
  const exL = CX - eyeDX, exR = CX + eyeDX;
  const irisRX = 12 * eye.size;
  const irisRY = 14.5 * eye.size;
  const sleepy = mood === 'sleepy';
  const grumpy = mood === 'grumpy';
  const squintF = Math.min(1, sleepy ? Math.max(eye.squint, 0.82) : eye.squint);
  const closed = squintF > 0.82;

  function eyeMarkup(ex: number, iris: string): string {
    if (closed) {
      // Happy closed eyes — a gentle upward arc.
      return `<path d="M ${f(ex - irisRX)},${f(eyeY + 2)} Q ${f(ex)},${f(eyeY - 5)} ${f(ex + irisRX)},${f(eyeY + 2)}" fill="none" stroke="${colors.edge}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    const openRY = irisRY * (1 - 0.5 * squintF);
    const cy = eyeY + (irisRY - openRY);            // keep the lower lid anchored
    const pupRX = irisRX * 0.52;
    const pupRY = openRY * 0.78;
    return (
      `<ellipse cx="${f(ex)}" cy="${f(cy)}" rx="${f(irisRX)}" ry="${f(openRY)}" fill="${iris}" stroke="${colors.edge}" stroke-width="1"/>` +
      `<ellipse cx="${f(ex)}" cy="${f(cy)}" rx="${f(irisRX)}" ry="${f(openRY)}" fill="url(#i${uid})"/>` +
      `<ellipse cx="${f(ex)}" cy="${f(cy + openRY * 0.08)}" rx="${f(pupRX)}" ry="${f(pupRY)}" fill="#140f22"/>` +
      `<circle cx="${f(ex - pupRX * 0.5)}" cy="${f(cy - openRY * 0.34)}" r="${f(2.2 * eye.size)}" fill="#ffffff" opacity="0.9"/>` +
      `<circle cx="${f(ex + pupRX * 0.55)}" cy="${f(cy + openRY * 0.2)}" r="${f(1.1 * eye.size)}" fill="#ffffff" opacity="0.6"/>` +
      // upper lid line, for definition
      `<path d="M ${f(ex - irisRX)},${f(cy - openRY * 0.7)} Q ${f(ex)},${f(cy - openRY)} ${f(ex + irisRX)},${f(cy - openRY * 0.7)}" fill="none" stroke="${colors.edge}" stroke-width="1.2" stroke-linecap="round"/>`
    );
  }

  const brows = grumpy
    ? `<g stroke="${colors.edge}" stroke-width="2" stroke-linecap="round">` +
      `<line x1="${f(exL - irisRX + 2)}" y1="${f(eyeY - irisRY - 2)}" x2="${f(exL + irisRX * 0.5)}" y2="${f(eyeY - irisRY + 4)}"/>` +
      `<line x1="${f(exR + irisRX - 2)}" y1="${f(eyeY - irisRY - 2)}" x2="${f(exR - irisRX * 0.5)}" y2="${f(eyeY - irisRY + 4)}"/>` +
      `</g>`
    : '';

  const noseY = headCY + 24 * hs;
  const noseW = 7 * hs;
  const nose =
    `<path d="M ${f(CX)},${f(noseY + 6)} C ${f(CX - noseW)},${f(noseY + 2)} ${f(CX - noseW)},${f(noseY - 3)} ${f(CX)},${f(noseY - 2)} C ${f(CX + noseW)},${f(noseY - 3)} ${f(CX + noseW)},${f(noseY + 2)} ${f(CX)},${f(noseY + 6)} Z" fill="${colors.nose}" stroke="${colors.edge}" stroke-width="0.6"/>`;

  const my = noseY + 6;
  let mouth: string;
  if (grumpy) {
    mouth = `<path d="M ${f(CX)},${f(my)} v3 M ${f(CX - 12)},${f(my + 9)} Q ${f(CX - 6)},${f(my + 3)} ${f(CX)},${f(my + 4)} Q ${f(CX + 6)},${f(my + 3)} ${f(CX + 12)},${f(my + 9)}" fill="none" stroke="${colors.edge}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else {
    mouth = `<path d="M ${f(CX)},${f(my)} v3 M ${f(CX)},${f(my + 3)} Q ${f(CX - 7)},${f(my + 8)} ${f(CX - 13)},${f(my + 4)} M ${f(CX)},${f(my + 3)} Q ${f(CX + 7)},${f(my + 8)} ${f(CX + 13)},${f(my + 4)}" fill="none" stroke="${colors.edge}" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  const tongue = mood === 'blep'
    ? `<path d="M ${f(CX - 4)},${f(my + 5)} h8 a4,6 0 0 1 -8,0 Z" fill="${colors.nose}" stroke="${colors.edge}" stroke-width="0.5"/>`
    : '';

  const whiskerParts: string[] = [];
  for (const sgn of [-1, 1]) {
    const ox = CX + sgn * 9 * hs;
    const tx = CX + sgn * 58;
    whiskerParts.push(
      `<path d="M ${f(ox)},${f(noseY)} Q ${f((ox + tx) / 2)},${f(noseY - 6)} ${f(tx)},${f(noseY - 8)}"/>`,
      `<path d="M ${f(ox)},${f(noseY + 3)} Q ${f((ox + tx) / 2)},${f(noseY + 3)} ${f(tx)},${f(noseY + 2)}"/>`,
      `<path d="M ${f(ox)},${f(noseY + 6)} Q ${f((ox + tx) / 2)},${f(noseY + 11)} ${f(tx)},${f(noseY + 13)}"/>`,
    );
  }
  const whiskers = `<g fill="none" stroke="${colors.edge}" stroke-width="0.9" stroke-linecap="round" opacity="0.55">${whiskerParts.join('')}</g>`;

  const blink = animate && !closed
    ? `<g fill="${colors.base}">` +
      [exL, exR].map(ex =>
        `<ellipse cx="${f(ex)}" cy="${f(eyeY)}" rx="${f(irisRX + 1.5)}" ry="0">` +
        `<animate attributeName="ry" values="0;0;${f(irisRY + 1)};0;0" keyTimes="0;0.9;0.94;0.98;1" dur="5.5s" repeatCount="indefinite"/>` +
        `</ellipse>`,
      ).join('') +
      `</g>`
    : '';

  // ── Assemble ────────────────────────────────────────────────────────────────
  const earFill = pointed ? colors.point : colors.base;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260" width="100%" height="100%" role="img" aria-label="${escapeAttr(config.specimen.name)}, a ${escapeAttr(config.specimen.breed)} cat">` +
      `<defs>` +
        `<clipPath id="s${uid}">` +
          `<path d="${bodyPath}"/><path d="${headPath}"/><path d="${earPath(-1)}"/><path d="${earPath(1)}"/>` +
          `<path d="${paw(CX - pawDX)}"/><path d="${paw(CX + pawDX)}"/>` +
        `</clipPath>` +
        `<radialGradient id="b${uid}" cx="0.5" cy="0.3" r="0.9">` +
          `<stop offset="0" stop-color="${colors.hi}"/><stop offset="0.6" stop-color="${colors.base}"/><stop offset="1" stop-color="${colors.lo}"/>` +
        `</radialGradient>` +
        `<radialGradient id="h${uid}" cx="0.5" cy="0.32" r="0.85">` +
          `<stop offset="0" stop-color="${colors.hi}"/><stop offset="0.65" stop-color="${colors.base}"/><stop offset="1" stop-color="${colors.lo}"/>` +
        `</radialGradient>` +
        `<radialGradient id="i${uid}" cx="0.5" cy="0.35" r="0.7">` +
          `<stop offset="0.55" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.38"/>` +
        `</radialGradient>` +
      `</defs>` +

      // Ground shadow.
      `<ellipse cx="${CX}" cy="250" rx="${f(bw * 1.04)}" ry="8" fill="#000000" opacity="0.16"/>` +

      // Tail behind the body.
      `<path d="${tailPath}" fill="${tailTip}" stroke="${colors.edge}" stroke-width="2" stroke-linejoin="round"/>` +

      // Body + belly fluff.
      `<path d="${bodyPath}" fill="url(#b${uid})" stroke="${colors.edge}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<ellipse cx="${CX}" cy="212" rx="${f(22 * chonk)}" ry="40" fill="${colors.lite}" opacity="0.45"/>` +

      // Front paws.
      `<path d="${paw(CX - pawDX)}" fill="${pawFill}" stroke="${colors.edge}" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="${paw(CX + pawDX)}" fill="${pawFill}" stroke="${colors.edge}" stroke-width="2" stroke-linejoin="round"/>` +
      pawToes(CX - pawDX) + pawToes(CX + pawDX) +

      // Ears + head.
      `<path d="${earPath(-1)}" fill="${earFill}" stroke="${colors.edge}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="${earPath(1)}" fill="${earFill}" stroke="${colors.edge}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="${innerEarPath(-1)}" fill="${colors.innerEar}" opacity="0.9"/>` +
      `<path d="${innerEarPath(1)}" fill="${colors.innerEar}" opacity="0.9"/>` +
      `<path d="${headPath}" fill="url(#h${uid})" stroke="${colors.edge}" stroke-width="2.4" stroke-linejoin="round"/>` +

      // Generated coat pattern, clipped to the silhouette.
      `<g clip-path="url(#s${uid})">${pattern}</g>` +

      // Face, last and on top.
      `<g>${brows}${eyeMarkup(exL, colors.eyeL)}${eyeMarkup(exR, colors.eyeR)}${blink}${nose}${mouth}${tongue}${whiskers}</g>` +
    `</svg>`
  );
}

/** Minimal attribute escaping for the aria-label text. */
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
