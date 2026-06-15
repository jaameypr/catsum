import * as THREE from 'three';
import {
  mergeSchema, resolveConfig,
  SeedstoneSchema, SeedstoneConfig, SeedstoneConfigOverrides,
} from './config';
import { Environment } from './scene/environment';
import { Gem } from './scene/gem';
import { Lights } from './scene/lights';
import { Sparkles } from './scene/sparkles';

// ── Public API types ──────────────────────────────────────────────────────────

export interface SeedstoneOptions {
  /** Element the canvas is appended to. Required. */
  container:    HTMLElement;
  /** Canvas size in px. Defaults to the container's client size. */
  width?:       number;
  height?:      number;
  /** Background colour, or null (default) for a transparent canvas. */
  background?:  string | number | null;
  /** Start the render loop immediately. If false, a single still frame is rendered. Default: true. */
  autoRotate?:  boolean;
  /** Canvas pixel ratio. Default: min(devicePixelRatio, 2). */
  pixelRatio?:  number;
  /** Cap the render loop frame rate. Useful for gallery thumbnails (e.g. 24). */
  targetFPS?:   number;
  /** Pin any schema knob for this instance, e.g. `{ gem: { cut: 'garnet', hue: 200 } }`. */
  config?:      SeedstoneConfigOverrides;
  /** Keep the drawing buffer readable for canvas.toDataURL(). Costs performance. Default: false. */
  preserveDrawingBuffer?: boolean;
}

// ── Renderer ──────────────────────────────────────────────────────────────────

/**
 * Owns the WebGL context, camera, and render loop, and orchestrates the four
 * scene modules (environment, gem, lights, sparkles). Changing seed or config
 * reconciles the modules in place (off the render path) on the same WebGL
 * context — cheap properties are patched directly and only the geometry build,
 * PMREM env bake, or sparkle scatter whose inputs changed is redone.
 */
export class SeedstoneRenderer {
  private schema:      SeedstoneSchema;   // knob tree with instance overrides pinned
  private renderer:    THREE.WebGLRenderer;
  private scene:       THREE.Scene;
  private camera:      THREE.PerspectiveCamera;
  private environment!: Environment;
  private gem!:         Gem;
  private lights!:      Lights;
  private sparkles!:    Sparkles;

  private minFrameMs:  number;       // minimum ms between renders (FPS cap)
  private lastTick     = 0;          // rAF timestamp of the last rendered frame
  private elapsed      = 0;          // accumulated animation time in seconds
  private rebuildSeq   = 0;          // monotone counter — stale idle rebuilds bail out early
  private animFrameId: number | null = null;
  private destroyed    = false;

  /** The seed currently being rendered. Read-only. */
  seed: string;
  /** The resolved per-seed config currently being rendered. Read-only. */
  config: SeedstoneConfig;

  constructor(seed: string, options: SeedstoneOptions) {
    this.schema = mergeSchema(options.config);
    this.seed   = seed;
    this.config = resolveConfig(this.schema, seed);

    const container = options.container;
    if (!container) throw new Error('[seedstone] options.container is required.');

    const { renderer: rendererCfg } = this.config;
    const width     = options.width  ?? (container.clientWidth  || rendererCfg.defaultSize);
    const height    = options.height ?? (container.clientHeight || rendererCfg.defaultSize);
    const bg        = options.background ?? null;
    this.minFrameMs = options.targetFPS ? (1000 / options.targetFPS) : 0;

    this.renderer = new THREE.WebGLRenderer({
      antialias:             true,
      alpha:                 bg === null,
      powerPreference:       'high-performance',
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    });
    this.renderer.setPixelRatio(options.pixelRatio ?? Math.min(window.devicePixelRatio, rendererCfg.maxPixelRatio));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping              = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled        = false;
    // Skip synchronous shader-error readback — a known compile-time stall.
    this.renderer.debug.checkShaderErrors  = false;
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    if (bg !== null) this.scene.background = new THREE.Color(bg);

    const cameraCfg = this.config.camera;
    this.camera = new THREE.PerspectiveCamera(cameraCfg.fov, width / height, cameraCfg.near, cameraCfg.far);

    this._applyRendererConfig();
    this._buildScene();

    if (options.autoRotate !== false) this._startLoop();
    else this._renderFrame();
  }

  // ── Scene lifecycle ───────────────────────────────────────────────────────

  /** Renderer/camera knobs that apply outside the scene modules. */
  private _applyRendererConfig(): void {
    const { renderer: rendererCfg, camera: cameraCfg } = this.config;
    this.renderer.toneMappingExposure         = rendererCfg.toneMappingExposure;
    this.renderer.transmissionResolutionScale = rendererCfg.transmissionResolutionScale;
    this.camera.fov  = cameraCfg.fov;
    this.camera.near = cameraCfg.near;
    this.camera.far  = cameraCfg.far;
    this.camera.position.set(...cameraCfg.position);
    this.camera.lookAt(...cameraCfg.lookAt);
    this.camera.updateProjectionMatrix();
  }

  private _buildScene(): void {
    this.environment = new Environment(this.renderer, this.config);
    this.scene.environment = this.environment.render();
    this.gem      = new Gem(this.scene, this.config);
    this.lights   = new Lights(this.scene, this.config);
    this.sparkles = new Sparkles(this.scene, this.config);
  }

  private _disposeScene(): void {
    this.gem.dispose();
    this.lights.dispose();
    this.sparkles.dispose();
    this.environment.dispose();
  }

  /**
   * Reconcile the scene modules to the current config, in place on the existing
   * WebGL context — patching colours/material/lights and rebuilding only the
   * geometry / PMREM bake / sparkle scatter whose inputs actually changed. Runs
   * in idle time, off the render path, and coalesces bursts (rapid typing) via
   * `rebuildSeq` so only the latest config is applied.
   */
  private _scheduleApply(): void {
    const seq = ++this.rebuildSeq;
    const apply = () => {
      if (this.destroyed || seq !== this.rebuildSeq) return;
      this._applyRendererConfig();
      this.scene.environment = this.environment.update(this.config);
      this.gem.update(this.config);
      this.lights.update(this.config);
      this.sparkles.update(this.config);
      if (this.animFrameId === null) this._renderFrame();   // paused → show the result now
    };
    setTimeout(apply, 0);
  }

  // ── Render loop ───────────────────────────────────────────────────────────

  /** Render one frame at the current animation time. */
  private _renderFrame(): void {
    this.gem.animate(this.elapsed);
    this.sparkles.animate(this.elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  private _startLoop(): void {
    const tick = (now: number) => {
      if (this.destroyed) return;
      this.animFrameId = requestAnimationFrame(tick);

      // FPS cap: skip the frame if not enough time has passed
      if (this.minFrameMs > 0 && now - this.lastTick < this.minFrameMs) return;

      // Clamp the time step so the animation doesn't jump after a hidden tab.
      const dt = this.lastTick === 0 ? 0
        : Math.min((now - this.lastTick) / 1000, this.config.renderer.maxFrameDelta);
      this.lastTick = now;
      this.elapsed += dt;
      this._renderFrame();
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * Swap to a new seed without touching the WebGL context. `seed` and
   * `config` update immediately; the scene rebuild runs in idle time and
   * shows up within a frame or two.
   */
  update(seed: string): void {
    if (this.destroyed) return;
    this.seed   = seed;
    this.config = resolveConfig(this.schema, seed);
    this._scheduleApply();
  }

  /**
   * Re-apply config overrides on a live instance, replacing any previous
   * ones. Intended for theming and interactive tuning, not per-frame use.
   */
  setConfig(overrides: SeedstoneConfigOverrides = {}): void {
    if (this.destroyed) return;
    this.schema = mergeSchema(overrides);
    this.config = resolveConfig(this.schema, this.seed);
    this._scheduleApply();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.animFrameId === null && !this.destroyed) this._renderFrame();
  }

  pause(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
      this.lastTick = 0;   // next play() resumes smoothly instead of jumping
    }
  }

  play(): void {
    if (this.animFrameId === null && !this.destroyed) this._startLoop();
  }

  destroy(): void {
    this.destroyed = true;
    this.pause();
    this._disposeScene();
    this.renderer.forceContextLoss();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
