# catsum website

The [Nuxt](https://nuxt.com) site for [catsum](../README.md) — a live playground, a specimen card, an example gallery, and a trait lab. Statically generated; the cats are plain SVG, so there is no WebGL and nothing heavy to load.

## Setup

The site consumes the built library from `../dist`, so build that first:

```sh
# from the repo root
npm install
npm run build

# then in this directory
cd website
npm install
```

## Development

```sh
npm run dev        # dev server on http://localhost:3000
```

Or, from the repo root, `npm run dev` runs the library in watch mode and this dev server together.

## Production

```sh
npm run generate   # static site → .output/public
npm run preview    # preview the production build locally
```
