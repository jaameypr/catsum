# catsum

Render a deterministic, fully-procedural SVG cat from any string. The same string always produces the exact same cat.

Every trait — coat pattern, hue, build, ears, eyes, mood — is derived deterministically from the seed and drawn from SVG primitives (ellipses, triangles, Bézier paths). No image or texture assets anywhere, making catsum a drop-in visual identity for usernames, hashes, or UUIDs.

## Quick start

```ts
import { CatsumRenderer } from 'catsum';

new CatsumRenderer('alice', {
  container: document.getElementById('cat')!,
});
```

**Script tag** — include `dist/catsum.standalone.js`, then use `window.Catsum.CatsumRenderer`.

**No DOM?** `renderCatSvg(seed, overrides?)` returns the SVG as a string — handy for server-side rendering or static export.

## Overrides

Pass a `config` tree to pin or re-randomise any trait. `CatsumConfigOverrides` is a
deep-partial of the trait tree: a plain number/string pins a value for every seed, while
`seeded()` flips a value to seed-generated instead.

```ts
import { CatsumRenderer, seeded, type CatsumConfigOverrides } from 'catsum';

const config: CatsumConfigOverrides = {
  coat: {
    pattern: 'tabby',   // pin every cat to a tabby coat
    hue: seeded(),      // make the coat hue vary by seed
  },
  build: { chonk: 1.3 },  // pin to a chonky build
};

new CatsumRenderer('alice', {
  container: document.getElementById('cat')!,
  config,
});
```

All tunable traits live in [`src/config.ts`](src/config.ts).

## Live updates

`update(seed)` swaps to a new seed and `setConfig(overrides)` re-applies overrides — both
rebuild and swap the SVG in place, so they're cheap enough to call on every keystroke.
Read back the fully-resolved values for the current seed from `cat.config` (a `CatsumConfig`),
including the derived `colors` palette and `specimen` card (name / breed).

```ts
import { CatsumRenderer, type CatsumConfig } from 'catsum';

const cat = new CatsumRenderer('alice', {
  container: document.getElementById('cat')!,
});

input.addEventListener('input', () => cat.update(input.value));  // new seed, same instance

cat.setConfig({ coat: { pattern: 'calico', hue: 30 } });  // pin traits live
cat.setConfig({});                                         // clear overrides

const resolved: CatsumConfig = cat.config;  // every trait, resolved for this seed
console.log(resolved.coat.pattern, resolved.specimen.name, resolved.specimen.breed);
```

## API stability

The **core API** — `CatsumRenderer`, `renderCatSvg`, `seeded()`, and the `CatsumConfig` /
`CatsumConfigOverrides` types — follows semver and stays stable across a major version.

The **advanced exports** for schema introspection (`configSchema`, `mergeSchema`,
`resolveConfig`, `isScalarParam`, `isChoiceParam`, and the `ScalarParam` / `ChoiceParam` /
`CatsumSchema` types) exist for building a UI against the raw schema. They may change in any
minor release — only depend on them if you pin the version.

## Development

```sh
# one-time setup
npm install && npm install --prefix website

npm run dev    # watches the library and serves the website simultaneously
npm run build  # production bundle into dist/
npm test       # build + run test suite
```

## License

[MIT](LICENSE)
