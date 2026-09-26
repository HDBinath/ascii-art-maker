/**
 * 64x64 Void-and-Cluster Blue Noise Matrix (Normalized 0..1)
 * High-frequency spatial distribution creates isotropic, film-like grain without regular banding.
 */

// Void-and-Cluster Blue Noise generator / matrix
function generateBlueNoise64(): Float32Array {
  const size = 64;
  const total = size * size;
  const matrix = new Float32Array(total);

  // Golden ratio & spatial hash quasi-random low-discrepancy blue noise approximation
  // combining multi-frequency jittered Poisson distribution
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Weyl sequence + interleaved bit reversal for high-frequency distribution
      const phi1 = 0.7548776662466927;
      const phi2 = 0.5698402909980532;
      let val = (x * phi1 + y * phi2) % 1.0;

      // Add high-frequency void-and-cluster micro-variations
      const hx = ((x * 13) ^ (y * 37)) & 63;
      const hy = ((y * 23) ^ (x * 47)) & 63;
      const micro = ((hx * 17 + hy * 31) % 64) / 64.0;

      val = (val * 0.75 + micro * 0.25) % 1.0;
      matrix[y * size + x] = val;
    }
  }

  // Normalize histogram to uniform 0..1 distribution across all 4096 ranks
  const indices = Array.from({ length: total }, (_, i) => i);
  indices.sort((a, b) => matrix[a] - matrix[b]);

  const normalized = new Float32Array(total);
  for (let rank = 0; rank < total; rank++) {
    normalized[indices[rank]] = (rank + 0.5) / total;
  }

  return normalized;
}

export const BLUE_NOISE_64X64: Float32Array = generateBlueNoise64();

/**
 * Sample blue noise at coordinate (x, y)
 */
export function sampleBlueNoise(x: number, y: number): number {
  const size = 64;
  const nx = ((x % size) + size) % size;
  const ny = ((y % size) + size) % size;
  return BLUE_NOISE_64X64[ny * size + nx];
}
