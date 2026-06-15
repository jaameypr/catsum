/**
 * catsum — public entry point
 *
 * A deterministic, fully-procedural SVG cat from any string. The same string
 * always produces the same cat — every trait drawn from SVG primitives, no
 * image or texture assets anywhere.
 */

// ── Core API ──────────────────────────────────────────────────────────────────
// Everything you need to render a cat from a string.

export { CatsumRenderer, renderCatSvg } from './renderer';
export { seeded }                       from './config';

export type {
  CatsumConfig,           // a cat's fully-resolved traits + derived colours/specimen
  CatsumConfigOverrides,  // the deep-partial tree you pass to pin/seed traits
  Specimen,               // the derived name / breed card
} from './config';

export type { Palette } from './color';

// ── Advanced: schema introspection ────────────────────────────────────────────
// Only needed to *inspect* the trait schema — e.g. to build a config UI that
// walks every parameter and reads its range. Normal usage never touches these.

export { config as configSchema, mergeSchema, resolveConfig,
         isScalarParam, isChoiceParam } from './config';

export type {
  ScalarParam,    // a numeric parameter: { mode, value, min, max, step }
  ChoiceParam,    // a categorical parameter: { mode, value, options, weights? }
  CatsumSchema,   // the raw schema tree (params still wrapped)
  Seeded,         // marker returned by seeded()
} from './config';
