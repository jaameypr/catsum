/**
 * The cat renderer — owns a container and the SVG it holds. There is no canvas,
 * no WebGL, no render loop: a cat is a pure function of its seed, so changing the
 * seed or config just rebuilds the SVG string and swaps it into the DOM. That is
 * cheap enough to call on every keystroke.
 */

import {
  mergeSchema, resolveConfig,
  CatsumSchema, CatsumConfig, CatsumConfigOverrides,
} from './config';
import { makePlacementRng } from './random';
import { buildCatSvg } from './svg';

// ── Public API types ──────────────────────────────────────────────────────────

export interface CatsumOptions {
  /** Element the cat's SVG is mounted into. Required. */
  container: HTMLElement;
  /** Pin any schema trait for this instance, e.g. `{ coat: { pattern: 'tabby', hue: 30 } }`. */
  config?:   CatsumConfigOverrides;
  /** Add a subtle idle animation (slow blink). Off by default. Never rotates the cat. */
  animate?:  boolean;
}

// ── Renderer ──────────────────────────────────────────────────────────────────

/**
 * Renders a deterministic SVG cat into a container. The same seed always yields
 * the same cat. `update(seed)` and `setConfig(overrides)` rebuild and swap the
 * SVG in place — both are cheap and keystroke-fast.
 */
export class CatsumRenderer {
  private schema:    CatsumSchema;   // trait tree with instance overrides pinned
  private container: HTMLElement;
  private animate:   boolean;

  /** The seed currently being rendered. Read-only. */
  seed: string;
  /** The resolved per-seed config currently being rendered. Read-only. */
  config: CatsumConfig;

  constructor(seed: string, options: CatsumOptions) {
    if (!options || !options.container) throw new Error('[catsum] options.container is required.');

    this.container = options.container;
    this.animate   = options.animate ?? false;
    this.schema    = mergeSchema(options.config);
    this.seed      = seed;
    this.config    = resolveConfig(this.schema, seed);

    this._render();
  }

  /** Build the current SVG and mount it into the container. */
  private _render(): void {
    this.container.innerHTML = this.toSvg();
  }

  /** The current cat as an SVG string, without touching the DOM. */
  toSvg(): string {
    return buildCatSvg(this.config, makePlacementRng(this.seed), { animate: this.animate });
  }

  /** Swap to a new seed, reconciling the mounted SVG in place. */
  update(seed: string): void {
    this.seed   = seed;
    this.config = resolveConfig(this.schema, seed);
    this._render();
  }

  /**
   * Re-apply config overrides on a live instance, replacing any previous ones.
   * A plain number/string pins a trait; `seeded()` flips one back to
   * seed-generated; `{}` clears all overrides.
   */
  setConfig(overrides: CatsumConfigOverrides = {}): void {
    this.schema = mergeSchema(overrides);
    this.config = resolveConfig(this.schema, this.seed);
    this._render();
  }

  /** Remove the mounted SVG from the container. */
  destroy(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Render a cat to an SVG string without a DOM — same pipeline the renderer uses.
 * Handy for server-side rendering, static export, or tests.
 */
export function renderCatSvg(seed: string, overrides?: CatsumConfigOverrides): string {
  const schema = mergeSchema(overrides);
  const config = resolveConfig(schema, seed);
  return buildCatSvg(config, makePlacementRng(seed), { animate: false });
}
