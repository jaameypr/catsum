# seedstone

Render a 3D rotating gemstone from any string. The same string always produces the exact same gem.

Every trait — colour, cut, refraction, iridescence, imperfections — is derived deterministically from the seed, making seedstone a drop-in visual identity for usernames, hashes, or UUIDs.

## Quick start

```js
import { SeedstoneRenderer } from 'seedstone';

new SeedstoneRenderer('alice', {
  container: document.getElementById('gem'),
});
```

**Script tag** — include `dist/seedstone.standalone.js`, then use `window.Seedstone.SeedstoneRenderer`.

## Overrides

Pass a `config` tree to pin or re-randomise any trait. A plain number/string pins a
value for every seed; `seeded()` flips a value to seed-generated instead.

```js
import { SeedstoneRenderer, seeded } from 'seedstone';

new SeedstoneRenderer('alice', {
  container: document.getElementById('gem'),
  config: {
    gem: {
      cut: 'spinel',                  // pin every gem to the spinel cut
      bodyLightness: seeded(),        // make the body lightness vary by seed
      distortion: { perfection: 1 },  // pin to fully flawless
    },
  },
});
```

All tunable traits live in [`src/config.ts`](src/config.ts).

## Live updates

`update(seed)` swaps to a new seed and `setConfig(overrides)` re-applies overrides — both
reconcile the existing instance in place, so they're cheap enough to call on every keystroke.

```js
const gem = new SeedstoneRenderer('alice', {
  container: document.getElementById('gem'),
});

input.addEventListener('input', () => gem.update(input.value));  // new seed, same instance

gem.setConfig({ gem: { cut: 'garnet', hue: 200 } });  // pin traits live
gem.setConfig({});                                     // clear overrides
```

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
