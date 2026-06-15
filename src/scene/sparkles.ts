import * as THREE from 'three';
import type { SeedstoneConfig } from '../config';

type SparklesConfig = SeedstoneConfig['sparkles'];

/** mulberry32 — tiny deterministic PRNG, so the same seed gives the same sky. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The point placement depends only on these — regenerate the buffer when they
 *  change, but skip it for a size/opacity tweak. */
function positionSignature(s: SparklesConfig): string {
  return [s.count, s.scatterSeed, s.radiusMin, s.radiusRange].join(',');
}

/** A shell of tiny points floating around the gem, placed from scatterSeed. */
export class Sparkles {
  private cfg:         SparklesConfig;
  private points:      THREE.Points;
  private material:    THREE.PointsMaterial;
  private positionSig: string;

  constructor(scene: THREE.Scene, cfg: SeedstoneConfig) {
    this.cfg = cfg.sparkles;
    const sparkles = cfg.sparkles;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', this._buildPositions(sparkles));
    this.positionSig = positionSignature(sparkles);

    this.material = new THREE.PointsMaterial({
      color: 0xffffff, size: sparkles.size, transparent: true,
      opacity: sparkles.baseOpacity, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geometry, this.material);
    scene.add(this.points);
  }

  private _buildPositions(sparkles: SparklesConfig): THREE.BufferAttribute {
    const positions = new THREE.BufferAttribute(new Float32Array(sparkles.count * 3), 3);
    const rand = mulberry32(Math.floor(sparkles.scatterSeed * 0xffffffff));
    for (let i = 0; i < sparkles.count; i++) {
      const r     = sparkles.radiusMin + rand() * sparkles.radiusRange;
      const theta = rand() * Math.PI * 2;
      const phi   = Math.acos(2 * rand() - 1);   // uniform on the sphere
      positions.setXYZ(
        i,
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
    }
    return positions;
  }

  update(cfg: SeedstoneConfig): void {
    const sparkles = cfg.sparkles;
    const sig = positionSignature(sparkles);
    if (sig !== this.positionSig) {
      this.points.geometry.setAttribute('position', this._buildPositions(sparkles));
      this.positionSig = sig;
    }
    this.material.size = sparkles.size;
    this.cfg = sparkles;
  }

  animate(t: number): void {
    this.points.rotation.y = t * this.cfg.driftRate;
    this.material.opacity  = this.cfg.baseOpacity + Math.sin(t * this.cfg.pulseRate) * this.cfg.pulseAmount;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
