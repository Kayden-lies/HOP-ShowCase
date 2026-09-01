export interface HeightMapResult {
  cols: number;
  rows: number;
  heights: Float32Array;
  delays: Float32Array;
  durations: Float32Array;
}

// PRNG for deterministic, reproducible landscape synthesis
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MountainEngine {
  private rand: () => number;

  constructor(seed: number = 428913) {
    this.rand = mulberry32(seed);
  }

  /**
   * Generates a blocky landscape with random up and down height levels (levels 1 to 5),
   * matching the reference image: flat-topped cuboid clusters, plateaus, and subtle steps.
   */
  public generateHeightMap(cols: number = 36, rows: number = 20, step: number = 0.71): HeightMapResult {
    const total = cols * rows;
    const heights = new Float32Array(total);
    const delays = new Float32Array(total);
    const durations = new Float32Array(total);

    // Reset PRNG for consistent generation
    this.rand = mulberry32(428913);

    // Initialize base grid with default baseline height level 2
    const grid = new Int32Array(total);
    for (let i = 0; i < total; i++) {
      grid[i] = 2;
    }

    // --- 1. Generate Rectangular / Square Blocky Patches & Unorganized Clusters ---
    const numPatches = Math.floor(55 * (cols * rows) / (144 * 80));
    for (let p = 0; p < numPatches; p++) {
      const startC = Math.floor(this.rand() * cols);
      const startR = Math.floor(this.rand() * rows);
      const width = 1 + Math.floor(this.rand() * 4);  // 1 to 4 blocks wide
      const height = 1 + Math.floor(this.rand() * 3); // 1 to 3 blocks deep
      
      // Target height level between 1 and 6
      const targetLevel = 1 + Math.floor(this.rand() * 6); 

      for (let r = startR; r < Math.min(rows, startR + height); r++) {
        for (let c = startC; c < Math.min(cols, startC + width); c++) {
          const idx = r * cols + c;
          grid[idx] = targetLevel;
        }
      }
    }

    // --- 2. Add High Frequency Individual Cube Up/Down Variations ---
    for (let i = 0; i < total; i++) {
      const rVal = this.rand();
      if (rVal < 0.45) {
        // Random offset between -2 and +2
        const delta = Math.floor(this.rand() * 5) - 2;
        grid[i] = Math.max(1, Math.min(6, grid[i] + delta));
      } else if (rVal < 0.65) {
        // Completely random height level for scattered unorganized look
        grid[i] = 1 + Math.floor(this.rand() * 6);
      }
    }

    // --- 3. Populate Height Map & Staggered Animation Timing ---
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        const level = grid[id];

        // Map integer levels (1 to 6) to subtle height multipliers (1.0 to 2.25 max)
        // adding a tiny per-cube jitter so adjacent blocks stand out individually
        const jitter = (this.rand() * 0.12) - 0.06;
        const targetScale = Math.max(0.8, Math.min(2.3, 0.95 + (level - 1) * 0.25 + jitter));

        heights[id] = targetScale;

        // Radial + random organic staggered delay
        const centerC = cols / 2;
        const centerR = rows / 2;
        const distFromCenter = Math.hypot(c - centerC, r - centerR) / Math.hypot(centerC, centerR);
        const delay = distFromCenter * 0.8 + (this.rand() * 0.8);

        delays[id] = Math.max(0.0, Math.min(2.0, delay));
        durations[id] = 1.0 + (this.rand() * 0.6);
      }
    }

    return {
      cols,
      rows,
      heights,
      delays,
      durations,
    };
  }
}
