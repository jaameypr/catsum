import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderCatSvg,
  configSchema, resolveConfig, mergeSchema, isScalarParam, isChoiceParam, seeded,
} from '../dist/catsum.esm.js';

const SEEDS = ['alice', 'bob', 'hello world', '0x1a2b3c', '✦', 'satoshi'];

// ── Schema-walking helpers ──────────────────────────────────────────────────

/** Collect every d() scalar knob with its dot-path. */
function seedKnobs(node, path = []) {
  if (isScalarParam(node)) return node.mode === 'dna' ? [{ path: path.join('.'), knob: node }] : [];
  if (isChoiceParam(node)) return [];
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  return Object.entries(node).flatMap(([k, v]) => seedKnobs(v, [...path, k]));
}

/** Collect every choice knob with its dot-path and options. */
function choiceKnobs(node, path = []) {
  if (isChoiceParam(node)) return [{ path: path.join('.'), options: node.options() }];
  if (isScalarParam(node)) return [];
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  return Object.entries(node).flatMap(([k, v]) => choiceKnobs(v, [...path, k]));
}

function getPath(obj, path) {
  return path.split('.').reduce((o, key) => o?.[key], obj);
}

// ── 1. Determinism ──────────────────────────────────────────────────────────

test('same seed yields an identical resolved config', () => {
  for (const seed of SEEDS) {
    assert.deepEqual(resolveConfig(configSchema, seed), resolveConfig(configSchema, seed));
  }
});

test('same seed yields byte-identical SVG', () => {
  for (const seed of SEEDS) {
    assert.equal(renderCatSvg(seed), renderCatSvg(seed));
  }
});

test('empty seed falls back to "catsum"', () => {
  assert.deepEqual(resolveConfig(configSchema, ''), resolveConfig(configSchema, 'catsum'));
  assert.equal(renderCatSvg(''), renderCatSvg('catsum'));
});

// ── 2. Different seeds differ ─────────────────────────────────────────────────

test('different seeds yield different configs and SVG', () => {
  assert.notDeepEqual(resolveConfig(configSchema, 'alice'), resolveConfig(configSchema, 'bob'));
  const svgs = new Set(SEEDS.map((s) => renderCatSvg(s)));
  assert.equal(svgs.size, SEEDS.length, 'every seed should produce a distinct SVG');
});

// ── 3. Pin / seeded ───────────────────────────────────────────────────────────

test('pinning a trait overrides it for every seed', () => {
  const schema = mergeSchema({ coat: { hue: 200, pattern: 'tabby' }, eye: { hue: 100 } });
  for (const seed of SEEDS) {
    const r = resolveConfig(schema, seed);
    assert.equal(r.coat.hue, 200);
    assert.equal(r.coat.pattern, 'tabby');
    assert.equal(r.eye.hue, 100);
  }
  // Unpinned traits still vary by seed.
  assert.notEqual(resolveConfig(schema, 'alice').build.chonk, resolveConfig(schema, 'bob').build.chonk);
});

test('seeded() restores seed-generation for a pinned trait', () => {
  // Pinned: same for every seed.
  const pinned = mergeSchema({ coat: { pattern: 'tabby' }, eye: { hue: 100 } });
  assert.equal(resolveConfig(pinned, 'alice').coat.pattern, 'tabby');
  assert.equal(resolveConfig(pinned, 'bob').eye.hue, 100);

  // seeded(): varies by seed, still a valid value.
  const released = mergeSchema({ coat: { pattern: seeded() }, eye: { hue: seeded() } });
  const a = resolveConfig(released, 'alice');
  const b = resolveConfig(released, 'bob');
  assert.notEqual(a.eye.hue, b.eye.hue);
  assert(configSchema.coat.pattern.options().includes(a.coat.pattern));
  assert(a.eye.hue >= configSchema.eye.hue.min && a.eye.hue <= configSchema.eye.hue.max);
});

test('pinning a trait changes the rendered SVG', () => {
  assert.notEqual(
    renderCatSvg('alice', { coat: { pattern: 'solid' } }),
    renderCatSvg('alice', { coat: { pattern: 'tabby' } }),
  );
});

// ── 4. Output is always valid, asset-free SVG ─────────────────────────────────

test('every seed renders valid SVG with no asset references', () => {
  for (const seed of [...SEEDS, '', 'a', 'a'.repeat(200)]) {
    const svg = renderCatSvg(seed);
    assert(svg.startsWith('<svg'), 'starts with <svg');
    assert(svg.trimEnd().endsWith('</svg>'), 'ends with </svg>');
    assert(svg.includes('viewBox="0 0 240 260"'), 'has the cat viewBox');
    assert(!/<image\b/i.test(svg), 'no <image> elements');
    assert(!/href/i.test(svg), 'no href references');
    assert(!/url\(http/i.test(svg), 'no external url() references');
  }
});

// ── Bounded variation — extreme seeds stay in range ───────────────────────────

test('every d() knob resolves within its declared range', () => {
  const knobs = seedKnobs(configSchema);
  assert(knobs.length > 0, 'schema should declare seed-generated knobs');
  for (let i = 0; i < 60; i++) {
    const resolved = resolveConfig(configSchema, `seed-${i}`);
    for (const { path, knob } of knobs) {
      const value = getPath(resolved, path);
      assert(value >= knob.min && value <= knob.max, `${path} = ${value} outside [${knob.min}, ${knob.max}]`);
    }
  }
});

test('every choice knob resolves to one of its options', () => {
  const knobs = choiceKnobs(configSchema);
  assert(knobs.length > 0, 'schema should declare choice knobs');
  for (let i = 0; i < 60; i++) {
    const resolved = resolveConfig(configSchema, `seed-${i}`);
    for (const { path, options } of knobs) {
      assert(options.includes(getPath(resolved, path)), `${path} not in [${options.join(', ')}]`);
    }
  }
});

// ── Derived specimen card ─────────────────────────────────────────────────────

test('resolved config exposes a deterministic specimen card and palette', () => {
  for (const seed of SEEDS) {
    const r = resolveConfig(configSchema, seed);
    assert(r.specimen.name.length > 0, 'has a name');
    assert(r.specimen.breed.length > 0, 'has a breed');
    assert(!('rarity' in r.specimen), 'no rarity tier');
    assert(/^#[0-9a-f]{6}$/.test(r.colors.base), 'palette colours are hex strings');
    assert.deepEqual(r.specimen, resolveConfig(configSchema, seed).specimen);
  }
});
