/**
 * High-performance signal pre-processing for optical conditioning:
 * - Gamma curve adjustment (LUT)
 * - CLAHE (Contrast Limited Adaptive Histogram Equalization)
 * - Unsharp Masking (High-pass sharpener)
 * - Contrast, Brightness & Inversion
 */

export interface PreprocessOptions {
  contrast: number; // 0.5 - 3.0
  brightness: number; // 0.5 - 2.5
  gamma?: number; // 0.5 - 2.5 (default 1.0)
  invert: boolean;
  claheEnabled?: boolean;
  claheClipLimit?: number; // 1.0 - 5.0 (default 2.0)
  unsharpStrength?: number; // 0.0 - 2.0 (default 0.0)
}

/**
 * Generate a 256-entry Gamma Lookup Table
 */
export function createGammaLUT(gamma: number): Uint8Array {
  const clampedGamma = Math.max(0.1, Math.min(4.0, gamma || 1.0));
  const lut = new Uint8Array(256);
  const invGamma = 1.0 / clampedGamma;
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * Math.pow(i / 255, invGamma));
  }
  return lut;
}

/**
 * Apply Contrast Limited Adaptive Histogram Equalization (CLAHE) on luminance channel
 */
export function applyCLAHE(
  lum: Float32Array,
  width: number,
  height: number,
  clipLimit: number = 2.5,
  gridTilesX: number = 8,
  gridTilesY: number = 8
): Float32Array {
  const output = new Float32Array(width * height);
  const tileW = Math.max(1, Math.floor(width / gridTilesX));
  const tileH = Math.max(1, Math.floor(height / gridTilesY));

  // 1. Calculate clipped histogram and CDF for each tile
  const cdfs: Float32Array[] = [];
  const numTiles = gridTilesX * gridTilesY;

  for (let ty = 0; ty < gridTilesY; ty++) {
    for (let tx = 0; tx < gridTilesX; tx++) {
      const startX = tx * tileW;
      const startY = ty * tileH;
      const endX = tx === gridTilesX - 1 ? width : startX + tileW;
      const endY = ty === gridTilesY - 1 ? height : startY + tileH;
      const tilePixelCount = (endX - startX) * (endY - startY);

      const hist = new Float32Array(256);
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const val = Math.max(0, Math.min(255, Math.round(lum[y * width + x])));
          hist[val]++;
        }
      }

      // Clip histogram
      const clipThreshold = (clipLimit * tilePixelCount) / 256;
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > clipThreshold) {
          excess += hist[i] - clipThreshold;
          hist[i] = clipThreshold;
        }
      }

      // Redistribute excess
      const bonus = excess / 256;
      for (let i = 0; i < 256; i++) {
        hist[i] += bonus;
      }

      // Calculate CDF (Cumulative Distribution Function)
      const cdf = new Float32Array(256);
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        cdf[i] = (sum / tilePixelCount) * 255;
      }
      cdfs.push(cdf);
    }
  }

  // 2. Bilinear interpolation across tile centers
  for (let y = 0; y < height; y++) {
    const fy = y / tileH - 0.5;
    const ty1 = Math.max(0, Math.min(gridTilesY - 1, Math.floor(fy)));
    const ty2 = Math.min(gridTilesY - 1, ty1 + 1);
    const wy = Math.max(0, Math.min(1, fy - ty1));

    for (let x = 0; x < width; x++) {
      const fx = x / tileW - 0.5;
      const tx1 = Math.max(0, Math.min(gridTilesX - 1, Math.floor(fx)));
      const tx2 = Math.min(gridTilesX - 1, tx1 + 1);
      const wx = Math.max(0, Math.min(1, fx - tx1));

      const val = Math.max(0, Math.min(255, Math.round(lum[y * width + x])));

      const cdfTL = cdfs[ty1 * gridTilesX + tx1][val];
      const cdfTR = cdfs[ty1 * gridTilesX + tx2][val];
      const cdfBL = cdfs[ty2 * gridTilesX + tx1][val];
      const cdfBR = cdfs[ty2 * gridTilesX + tx2][val];

      // Bilinear blend
      const top = cdfTL * (1 - wx) + cdfTR * wx;
      const bottom = cdfBL * (1 - wx) + cdfBR * wx;
      output[y * width + x] = top * (1 - wy) + bottom * wy;
    }
  }

  return output;
}

/**
 * Apply Unsharp Masking to sharpen high-frequency silhouettes
 */
export function applyUnsharpMask(
  r: Float32Array,
  g: Float32Array,
  b: Float32Array,
  width: number,
  height: number,
  strength: number
): void {
  if (strength <= 0 || width < 3 || height < 3) return;

  const blurredR = new Float32Array(width * height);
  const blurredG = new Float32Array(width * height);
  const blurredB = new Float32Array(width * height);

  // 3x3 Gaussian approximation kernel weights: [1, 2, 1] / 4
  const tempR = new Float32Array(width * height);
  const tempG = new Float32Array(width * height);
  const tempB = new Float32Array(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const x0 = Math.max(0, x - 1);
      const x1 = x;
      const x2 = Math.min(width - 1, x + 1);

      tempR[idx] = (r[y * width + x0] + 2 * r[y * width + x1] + r[y * width + x2]) * 0.25;
      tempG[idx] = (g[y * width + x0] + 2 * g[y * width + x1] + g[y * width + x2]) * 0.25;
      tempB[idx] = (b[y * width + x0] + 2 * b[y * width + x1] + b[y * width + x2]) * 0.25;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = y;
    const y2 = Math.min(height - 1, y + 1);

    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      blurredR[idx] = (tempR[y0 * width + x] + 2 * tempR[y1 * width + x] + tempR[y2 * width + x]) * 0.25;
      blurredG[idx] = (tempG[y0 * width + x] + 2 * tempG[y1 * width + x] + tempG[y2 * width + x]) * 0.25;
      blurredB[idx] = (tempB[y0 * width + x] + 2 * tempB[y1 * width + x] + tempB[y2 * width + x]) * 0.25;

      // Add high-pass detail
      r[idx] = Math.max(0, Math.min(255, r[idx] + strength * (r[idx] - blurredR[idx])));
      g[idx] = Math.max(0, Math.min(255, g[idx] + strength * (g[idx] - blurredG[idx])));
      b[idx] = Math.max(0, Math.min(255, b[idx] + strength * (b[idx] - blurredB[idx])));
    }
  }
}

/**
 * Comprehensive Image Preconditioning Pipeline
 */
export function preprocessSignalBuffer(
  srcData: Uint8ClampedArray,
  width: number,
  height: number,
  options: PreprocessOptions
): { rBuf: Float32Array; gBuf: Float32Array; bBuf: Float32Array; lumBuf: Float32Array } {
  const pixelCount = width * height;
  const rBuf = new Float32Array(pixelCount);
  const gBuf = new Float32Array(pixelCount);
  const bBuf = new Float32Array(pixelCount);
  const lumBuf = new Float32Array(pixelCount);

  // 1. Contrast Factor
  const cVal = Math.max(-254, Math.min(254, (options.contrast - 1.0) * 128));
  const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
  const brightness = options.brightness ?? 1.0;
  const gammaLUT = createGammaLUT(options.gamma ?? 1.0);

  // 2. Base Contrast, Brightness, Gamma, Invert
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    let r = srcData[idx];
    let g = srcData[idx + 1];
    let b = srcData[idx + 2];

    if (options.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // Apply gamma LUT
    r = gammaLUT[r];
    g = gammaLUT[g];
    b = gammaLUT[b];

    // Apply contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Apply brightness
    r = Math.max(0, Math.min(255, r * brightness));
    g = Math.max(0, Math.min(255, g * brightness));
    b = Math.max(0, Math.min(255, b * brightness));

    rBuf[i] = r;
    gBuf[i] = g;
    bBuf[i] = b;
    lumBuf[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // 3. Optional CLAHE Equalization
  if (options.claheEnabled) {
    const enhancedLum = applyCLAHE(lumBuf, width, height, options.claheClipLimit ?? 2.0);
    for (let i = 0; i < pixelCount; i++) {
      const origLum = Math.max(1, lumBuf[i]);
      const ratio = enhancedLum[i] / origLum;
      rBuf[i] = Math.max(0, Math.min(255, rBuf[i] * ratio));
      gBuf[i] = Math.max(0, Math.min(255, gBuf[i] * ratio));
      bBuf[i] = Math.max(0, Math.min(255, bBuf[i] * ratio));
      lumBuf[i] = enhancedLum[i];
    }
  }

  // 4. Optional Unsharp Masking
  if (options.unsharpStrength && options.unsharpStrength > 0) {
    applyUnsharpMask(rBuf, gBuf, bBuf, width, height, options.unsharpStrength);
    for (let i = 0; i < pixelCount; i++) {
      lumBuf[i] = 0.2126 * rBuf[i] + 0.7152 * gBuf[i] + 0.0722 * bBuf[i];
    }
  }

  return { rBuf, gBuf, bBuf, lumBuf };
}
