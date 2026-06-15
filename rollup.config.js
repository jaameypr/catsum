import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const banner = `/**
 * catsum v2.0.0 — https://github.com/titangmz/catsum
 * MIT License
 */`;

const buildPlugins = (minify = false) => [
  typescript({ tsconfig: './tsconfig.json' }),
  ...(minify ? [terser({ maxWorkers: 1 })] : []),
];

export default [
  // ESM build — tree-shakeable, for bundlers
  {
    input:   'src/index.ts',
    output:  { file: 'dist/catsum.esm.js', format: 'esm', banner, sourcemap: true },
    plugins: buildPlugins(),
  },
  // UMD build — for CommonJS / legacy bundlers
  {
    input:   'src/index.ts',
    output:  { file: 'dist/catsum.umd.js', format: 'umd', name: 'Catsum', banner, sourcemap: true },
    plugins: buildPlugins(true),
  },
  // IIFE build — single <script> tag, no setup required
  {
    input:   'src/index.ts',
    output:  { file: 'dist/catsum.standalone.js', format: 'iife', name: 'Catsum', banner },
    plugins: buildPlugins(true),
  },
];
