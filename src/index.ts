/**
 * seedstone — public entry point
 */

// ── Core API ──────────────────────────────────────────────────────────────────
// Everything you need to render a gem from a string.

export { SeedstoneRenderer }   from './renderer';
export { seeded }              from './config';

export type {
  SeedstoneConfig,           // a gem's fully-resolved values (hue, speed, …)
  SeedstoneConfigOverrides,  // the deep-partial tree you pass to pin/seed values
} from './config';

// ── Advanced: schema introspection ────────────────────────────────────────────
// Only needed to *inspect* the tuning schema — e.g. to build a config UI that
// walks every parameter and reads its range. Normal usage never touches these.

export { config as configSchema, mergeSchema, resolveConfig,
         isScalarParam, isChoiceParam } from './config';
export { listCuts, buildGeometry }      from './geometries/index';

export type {
  ScalarParam,      // a numeric parameter: { mode, value, min, max, step }
  ChoiceParam,      // a categorical parameter: { mode, value, options }
  SeedstoneSchema,  // the raw schema tree (params still wrapped)
  Seeded,           // marker returned by seeded()
} from './config';
