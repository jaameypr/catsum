import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeometry, listCuts,
  configSchema, resolveConfig, mergeSchema, isScalarParam, seeded,
} from '../dist/seedstone.esm.js';

const EXPECTED_CUTS = ['citrine', 'fluorite', 'garnet', 'pyrite', 'spinel', 'tanzanite', 'tourmaline', 'zircon'];

// Triangles per cut. Geometries are unindexed, so triangles = positions / 3.
const EXPECTED_TRIANGLES = {
  citrine:    16,   // pentagonal antiprism: 2×3 cap + 2×5 belt
  fluorite:   8,    // octahedron
  garnet:     36,   // dodecahedron: 12 pentagons × 3
  pyrite:     12,   // cube: 6 squares × 2
  spinel:     4,    // tetrahedron
  tanzanite:  20,   // icosahedron
  tourmaline: 20,   // 20-face bipyramid
  zircon:     80,   // geodesic sphere, detail 1
};

function triangleCount(geometry) {
  return geometry.getAttribute('position').count / 3;
}

/** Collect every d() param in the schema with its dot-path. */
function seedKnobs(node, path = []) {
  if (isScalarParam(node)) return node.mode === 'dna' ? [{ path: path.join('.'), knob: node }] : [];
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  return Object.entries(node).flatMap(([k, v]) => seedKnobs(v, [...path, k]));
}

function getPath(obj, path) {
  return path.split('.').reduce((o, key) => o?.[key], obj);
}

// ── Geometry registry ─────────────────────────────────────────────────────────

test('registry lists all cuts alphabetically', () => {
  assert.deepEqual(listCuts(), EXPECTED_CUTS);
});

test('every cut builds the expected number of triangles', () => {
  for (const cut of listCuts()) {
    assert.equal(
      triangleCount(buildGeometry(cut)), EXPECTED_TRIANGLES[cut],
      `${cut} triangle count`,
    );
  }
});

test('every cut has a non-degenerate bounding box', () => {
  for (const cut of listCuts()) {
    const geometry = buildGeometry(cut);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    assert(box.max.x - box.min.x > 0, `${cut} x extent`);
    assert(box.max.y - box.min.y > 0, `${cut} y extent`);
    assert(box.max.z - box.min.z > 0, `${cut} z extent`);
  }
});

test('no two cuts produce identical geometry', () => {
  const seen = new Map();
  for (const cut of listCuts()) {
    const key = Array.from(buildGeometry(cut).getAttribute('position').array).join(',');
    assert(!seen.has(key), `${cut} duplicates ${seen.get(key)}`);
    seen.set(key, cut);
  }
});

test('unknown cut falls back to a valid geometry', () => {
  const geometry = buildGeometry('not-a-real-cut');
  assert(triangleCount(geometry) > 0);
});

// ── Seed → traits ─────────────────────────────────────────────────────────────

test('resolved config is deterministic per seed', () => {
  for (const seed of ['alice', 'hello world', '0x1a2b3c', '✦']) {
    assert.deepEqual(resolveConfig(configSchema, seed), resolveConfig(configSchema, seed));
  }
  assert.notDeepEqual(resolveConfig(configSchema, 'alice'), resolveConfig(configSchema, 'bob'));
});

test('empty seed falls back to "seedstone"', () => {
  assert.deepEqual(resolveConfig(configSchema, ''), resolveConfig(configSchema, 'seedstone'));
});

test('every d() knob resolves within its declared range', () => {
  const knobs = seedKnobs(configSchema);
  assert(knobs.length > 0, 'schema should declare seed-generated knobs');
  for (let i = 0; i < 50; i++) {
    const resolved = resolveConfig(configSchema, `seed-${i}`);
    for (const { path, knob } of knobs) {
      const value = getPath(resolved, path);
      assert(value >= knob.min && value <= knob.max, `${path} = ${value} outside [${knob.min}, ${knob.max}]`);
    }
  }
});

test('every seed resolves to a registered cut', () => {
  const cuts = listCuts();
  for (let i = 0; i < 50; i++) {
    assert(cuts.includes(resolveConfig(configSchema, `seed-${i}`).gem.cut));
  }
});

test('overrides pin seed-generated knobs to fixed values', () => {
  const schema = mergeSchema({ gem: { cut: 'garnet', hue: 200 }, sparkles: { count: 50 } });
  for (const seed of ['alice', 'bob', '']) {
    const resolved = resolveConfig(schema, seed);
    assert.equal(resolved.gem.cut, 'garnet');
    assert.equal(resolved.gem.hue, 200);
    assert.equal(resolved.sparkles.count, 50);
  }
  // Unpinned knobs still vary by seed.
  assert.notEqual(
    resolveConfig(schema, 'alice').lights.accent1Hue,
    resolveConfig(schema, 'bob').lights.accent1Hue,
  );
});

test('seeded() flips a fixed param back to seed-generated', () => {
  // gem.material.transmission is a fixed c(0.8) by default — same for every seed.
  assert.equal(
    resolveConfig(configSchema, 'alice').gem.material.transmission,
    resolveConfig(configSchema, 'bob').gem.material.transmission,
  );
  // With seeded() it varies by seed but stays in range.
  const schema = mergeSchema({ gem: { material: { transmission: seeded() } } });
  const a = resolveConfig(schema, 'alice').gem.material.transmission;
  const b = resolveConfig(schema, 'bob').gem.material.transmission;
  assert.notEqual(a, b);
  assert(a >= 0 && a <= 1 && b >= 0 && b <= 1);
});

test('a cut pinned to an unknown name falls back to the seed pick', () => {
  const schema = mergeSchema({ gem: { cut: 'not-a-real-cut' } });
  const resolved = resolveConfig(schema, 'alice');
  assert.equal(resolved.gem.cut, resolveConfig(configSchema, 'alice').gem.cut);
});
