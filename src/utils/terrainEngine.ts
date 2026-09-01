import { Cuboid } from '../types';
import { MountainEngine } from './MountainEngine';
import * as THREE from 'three';

/**
 * Determines whether a grid position (col, row) is part of the AIDN "A" logo.
 * Precision voxel rasterization matching the official 4-piece AIDN logo reference:
 * - Piece 1: Left Stroke (Large White Diagonal Parallelogram)
 * - Piece 2: Upper Right Stroke (Blue Diagonal Parallelogram)
 * - Piece 3: Lower Right Stroke (Blue Diagonal Parallelogram)
 * - Piece 4: Center Cross Wedge (Bold Blue Polygon with horizontal top, diagonal left/right gaps, & sloped bottom edge)
 * 
 * Strict Negative Spaces Preserved:
 * - Unbroken diagonal gap along the right edge of Piece 1 (separating it from all other pieces)
 * - Horizontal gap between Piece 2 (upper right) and Piece 3 (lower right)
 * - Diagonal gap separating Piece 4 (center wedge) from Piece 3 (lower right)
 * - Central upper inverted triangular void & lower triangular void
 */
import { LOGO_VOXEL_MAP } from './logoMapData';

export function isAidnLogoVoxel(col: number, row: number, cols: number, rows: number): { 
  isLogo: boolean; 
  targetScale: number;
  logoType: number; 
  layerMetric: number;
} {
  const centerC = (cols - 1) / 2;
  const centerR = (rows - 1) / 2;

  const x = -(col - centerC) / (144 * 0.27);
  const y = (row - centerR) / (80 * 0.35);

  const yNorm = Math.max(0.0, Math.min(1.0, (y + 0.85) / 1.70));
  const normX = col / cols;
  const layerMetric = yNorm * 0.72 + normX * 0.28;

  const flippedCol = (cols - 1) - col;
  const flippedRow = (rows - 1) - row;
  const key = `${flippedCol},${flippedRow}`;
  const logoType = LOGO_VOXEL_MAP[key] || 0;

  if (logoType > 0) {
    let targetScale = 4.50;
    if (logoType === 2 || logoType === 3) targetScale = 5.40;
    else if (logoType === 4) targetScale = 4.90;

    return { isLogo: true, targetScale, logoType, layerMetric };
  }

  return { isLogo: false, targetScale: 0.35, logoType: 0, layerMetric };
}

export class TerrainEngine {
  public cuboids: Cuboid[] = [];
  public cols: number = 244;
  public rows: number = 200;
  public cubeSize: number = 0.165;
  public cubeGap: number = 0.009;

  public animationTime: number = 0;
  // 15-second cinematic sequence
  public readonly SEQUENCE_DURATION: number = 15.0;

  public init(cols: number = 244, rows: number = 200, cubeSize: number = 0.165, cubeGap: number = 0.009): void {
    this.cols = cols;
    this.rows = rows;
    this.cubeSize = cubeSize;
    this.cubeGap = cubeGap;
    this.animationTime = 0;

    const step = cubeSize + cubeGap;
    const offsetX = ((cols - 1) * step) / 2;
    const offsetZ = ((rows - 1) * step) / 2;

    const mountainEngine = new MountainEngine(428913);
    const heightMap = mountainEngine.generateHeightMap(cols, rows, step);

    const total = cols * rows;
    this.cuboids = new Array(total);

    const centerC = (cols - 1) / 2;
    const centerR = (rows - 1) / 2;
    const maxDist = Math.hypot(centerC, centerR);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        const worldX = c * step - offsetX;
        const worldZ = r * step - offsetZ;

        // Initial landscape height
        const initialScale = heightMap.heights[id];

        // Logo geometry
        const logoResult = isAidnLogoVoxel(c, r, cols, rows);
        const targetScale = logoResult.targetScale;
        const isLogo = logoResult.isLogo;
        const logoType = logoResult.logoType;
        const layerMetric = logoResult.layerMetric;

        // Wave propagation delay with per-block randomized offsets
        const dist = Math.hypot(c - centerC, r - centerR) / maxDist;
        const hash = Math.sin(id * 12.9898 + r * 78.233) * 43758.5453;
        const randVal = hash - Math.floor(hash);
        const randOffset = (randVal - 0.5) * 1.0;
        const propagationDelay = 2.0 + dist * 1.5 + randOffset;

        // Final locking designation
        const hasFinalLocking = randVal < 0.20;

        let preFinalScale = targetScale;
        if (hasFinalLocking) {
          preFinalScale = isLogo ? targetScale - 0.45 : targetScale + 0.35;
        }

        this.cuboids[id] = {
          id,
          row: r,
          column: c,
          worldX,
          worldZ,
          baseHeight: cubeSize,
          currentHeight: cubeSize * initialScale,
          targetHeight: cubeSize * targetScale,
          initialScale,
          preFinalScale,
          targetScale,
          currentScale: initialScale,
          horizontalScale: 1.0,
          propagationDelay,
          isLogo,
          logoType,
          layerMetric,
          hasFinalLocking,
          startDelay: heightMap.delays[id],
          duration: heightMap.durations[id],
        };
      }
    }

    // Compute outer piece boundary flags for each logo cuboid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        const cuboid = this.cuboids[id];
        if (!cuboid.isLogo) {
          cuboid.outerEdges = [0, 0, 0, 0];
          continue;
        }

        const type = cuboid.logoType;
        const leftType = c > 0 ? this.cuboids[r * cols + (c - 1)].logoType : 0;
        const rightType = c < cols - 1 ? this.cuboids[r * cols + (c + 1)].logoType : 0;
        const topType = r > 0 ? this.cuboids[(r - 1) * cols + c].logoType : 0;
        const bottomType = r < rows - 1 ? this.cuboids[(r + 1) * cols + c].logoType : 0;

        cuboid.outerEdges = [
          leftType !== type ? 1 : 0,
          rightType !== type ? 1 : 0,
          topType !== type ? 1 : 0,
          bottomType !== type ? 1 : 0,
        ];
      }
    }
  }

  /**
   * Updates cuboid heights & spatial positions across choreography phases:
   * - Phase 1 (0.0s – 9.8s): Living Voxel Landscape (organic random wave movement, 100% identical for ALL cubes)
   * - Phase 2 (9.8s – 10.3s): Settlement (procedural movement naturally settles across 0.5s)
   * - Phase 3 (10.3s – 11.8s): Coordinated Diagonal Rise (logo cubes rise in an engineered diagonal propagation wave)
   * - Phase 4 (11.8s – 12.2s): Geometry & Material Contrast Silhouette Reveal
   * - Phase 5 (12.2s – 13.5s): Solid Material Transition (white for left stroke, AIDN blue for right strokes)
   * - Phase 6 (13.5s+): Final Infinite Hold
   */
  public readonly LOOP_DURATION: number = 22.80; // 15.80s formation + 7.0s delay

  public update(deltaTime: number): boolean {
    this.animationTime += deltaTime;
    if (this.animationTime >= this.LOOP_DURATION) {
      this.animationTime = this.animationTime % this.LOOP_DURATION;
    }
    const t = this.animationTime;

    const total = this.cuboids.length;

    for (let i = 0; i < total; i++) {
      const cuboid = this.cuboids[i];

      if (t < 2.0) {
        // Phase 1a: Initial landscape
        cuboid.currentScale = cuboid.initialScale;
        cuboid.offsetX = 0;
        cuboid.offsetZ = 0;
      } else if (t < 6.5) {
        // Phase 1b (2.0s – 6.5s): Living Voxel Landscape
        // 100% IDENTICAL organic wave behavior for ALL cubes — zero logo hints
        if (t < cuboid.propagationDelay) {
          const preWave = Math.sin(t * 2.2 + cuboid.id * 0.45) * 0.06;
          cuboid.currentScale = cuboid.initialScale + preWave;
        } else {
          const p = Math.min(1.0, (t - cuboid.propagationDelay) / (6.5 - cuboid.propagationDelay));
          const randPhase = Math.sin(cuboid.id * 37.19 + cuboid.row * 14.8);
          const randomWave = (Math.sin(t * 2.8 + randPhase * 6.28) * 0.16 + Math.cos(t * 1.9 + cuboid.column * 0.5) * 0.08);

          cuboid.currentScale = cuboid.initialScale + (0.35 - cuboid.initialScale) * p + randomWave;
        }
        cuboid.offsetX = 0;
        cuboid.offsetZ = 0;
      } else if (t < 11.8) {
        // Phase 2 (6.5s – 11.8s): Earlier Emergence at ~35-40% camera ascent
        // Monumental "A" structure rises progressively floor-by-floor from beneath the landscape
        cuboid.offsetX = 0;
        cuboid.offsetZ = 0;

        if (!cuboid.isLogo) {
          // Surrounding landscape continues organic motion until 9.5s, then gracefully settles low
          if (t < 9.5) {
            const randPhase = Math.sin(cuboid.id * 37.19 + cuboid.row * 14.8);
            const randomWave = (Math.sin(t * 2.8 + randPhase * 6.28) * 0.16 + Math.cos(t * 1.9 + cuboid.column * 0.5) * 0.08);
            cuboid.currentScale = 0.35 + randomWave * 0.85;
          } else {
            const fadeP = Math.min(1.0, (t - 9.5) / 1.7);
            const randPhase = Math.sin(cuboid.id * 37.19 + cuboid.row * 14.8);
            const endWave = (Math.sin(9.5 * 2.8 + randPhase * 6.28) * 0.16 + Math.cos(9.5 * 1.9 + cuboid.column * 0.5) * 0.08) * 0.85;
            const startScale = 0.35 + endWave;
            cuboid.currentScale = startScale * (1.0 - fadeP * fadeP);
          }
        } else {
          // Floor-by-floor layered architectural emergence wave from base to peak
          const tStart = 6.5 + cuboid.layerMetric * 3.4; // Staggered start times (6.5s to 9.9s)
          const duration = 1.10;
          const p = Math.max(0.0, Math.min(1.0, (t - tStart) / duration));

          // Architectural curve: smooth acceleration, subtle overshoot (1.05), confident deceleration to 1.00
          let e = 0.0;
          if (p > 0.0) {
            if (p < 0.82) {
              const tSub = p / 0.82;
              e = (tSub * tSub * (3.0 - 2.0 * tSub)) * 1.05;
            } else {
              const tSub = (p - 0.82) / 0.18;
              const eSub = tSub * tSub * (3.0 - 2.0 * tSub);
              e = 1.05 - 0.05 * eSub;
            }
          }

          const baseAmbient = 0.35;
          cuboid.currentScale = baseAmbient + (cuboid.targetScale - baseAmbient) * e;
        }
      } else {
        // Phase 3+ (11.8s+): Assembled logo locked in position
        cuboid.offsetX = 0;
        cuboid.offsetZ = 0;
        cuboid.currentScale = cuboid.isLogo ? cuboid.targetScale : 0.0;
      }

      // Instant Merge Phase (t >= 13.8s): Precision 1-2 frame fusion locking voxel cubes into monolithic geometry
      if (t >= 13.8 && cuboid.isLogo) {
        const mergeP = Math.min(1.0, (t - 13.8) / 0.02); // 1-2 frame precision snap
        cuboid.horizontalScale = 1.0 + mergeP * 0.0545; // Closes gap seamlessly
      } else {
        cuboid.horizontalScale = 1.0;
      }

      // Disappear Phase: The moment flash begins at t >= 14.85s, voxel cubes go out completely
      if (t >= 14.85 && cuboid.isLogo) {
        cuboid.currentScale = 0.0;
      }

      cuboid.currentHeight = cuboid.baseHeight * Math.max(0.0, cuboid.currentScale);
    }

    return true;
  }

  /**
   * Computes camera transform over the sequence timeline.
   * Starts ultra-zoomed in on the initial landscape, then zooms out as camera shifts to high vantage perspective.
   * Stops 8-10° off vertical with subtle top-right perspective offset to preserve 3D depth and vertical height presence.
   */
  public getCameraTransform(time: number, aspect: number = 1.0): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const t = Math.min(17.0, time);

    // Ultra-macro zoomed-in intimate starting camera position
    const initialPos = new THREE.Vector3(-0.48, 0.38, 0.72);
    const initialLookAt = new THREE.Vector3(0.08, 0.18, 0.12);

    // Mobile-adaptive high vantage perspective offset:
    // Base altitude zoomed out for majestic architectural scale, aligned along central Z-axis (X=0.0)
    const mobileScale = aspect < 1.0 ? Math.max(1.0, 0.92 / Math.max(0.35, aspect)) : 1.0;
    const finalX = 0.0;
    const finalY = 22.8 * mobileScale;
    const finalZ = -4.0 * mobileScale;

    const finalPos = new THREE.Vector3(finalX, finalY, finalZ);
    const finalLookAt = new THREE.Vector3(0.0, 0.8, 0.0);

    const rStart = Math.hypot(initialPos.x, initialPos.z);
    const rEnd = Math.hypot(finalPos.x, finalPos.z);

    const angleStart = Math.atan2(initialPos.z, initialPos.x);
    let angleTarget = Math.atan2(finalPos.z, finalPos.x); // -Math.PI / 2 (-90°)
    while (angleTarget > angleStart) {
      angleTarget -= Math.PI * 2.0;
    }

    if (t < 3.5) {
      // 0.0s – 3.5s: Zoomed-in low cinematic angle hold with subtle micro-drift
      const driftAngle = angleStart + t * 0.02;
      const pos = new THREE.Vector3(
        Math.cos(driftAngle) * rStart,
        initialPos.y,
        Math.sin(driftAngle) * rStart
      );
      return {
        position: pos,
        lookAt: initialLookAt.clone(),
      };
    } else if (t < 10.5) {
      // 3.5s – 10.5s: Orbital sweeping crane ascent as voxels assemble
      const u = (t - 3.5) / 7.0;
      const easedU = u * u * u * (u * (u * 6.0 - 15.0) + 10.0); // Smoother step

      const r = rStart + (rEnd - rStart) * easedU;
      const yPos = initialPos.y + (finalPos.y - initialPos.y) * easedU;
      
      const currentAngle = (angleStart + 3.5 * 0.02) + (angleTarget - (angleStart + 3.5 * 0.02)) * easedU;

      const pos = new THREE.Vector3(
        Math.cos(currentAngle) * r,
        yPos,
        Math.sin(currentAngle) * r
      );
      const lookAt = new THREE.Vector3().lerpVectors(initialLookAt, finalLookAt, easedU);

      return { position: pos, lookAt };
    } else {
      // 10.5s+: Fast cinematic zoom out as the revealed voxels turn white and merge
      const endDrift = Math.min(1.0, (t - 10.5) / 3.8); // Swift 3.8s zoom out curve
      const easedDrift = Math.sin(endDrift * (Math.PI / 2)); // Dynamic smooth sine ease-out
      const zoomFactor = 1.0 + easedDrift * 0.32; // 32% increased zoom out speed during white transition

      const pos = finalPos.clone().multiplyScalar(zoomFactor);

      return {
        position: pos,
        lookAt: finalLookAt.clone(),
      };
    }
  }
}
