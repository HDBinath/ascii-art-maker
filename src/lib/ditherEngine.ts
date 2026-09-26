import { AppOptions } from './types';
import { getCachedPalette, findClosestCachedPaletteColor } from './palettes';
import { sampleBlueNoise } from './blueNoise';
import { preprocessSignalBuffer } from './signalProcessing';

// 4x4 Bayer Matrix (normalized 0 to 1)
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

// 8x8 Bayer Matrix
const BAYER_8X8 = [
  [ 0/64, 32/64,  8/64, 40/64,  2/64, 34/64, 10/64, 42/64],
  [48/64, 16/64, 56/64, 24/64, 50/64, 18/64, 58/64, 26/64],
  [12/64, 44/64,  4/64, 36/64, 14/64, 46/64,  6/64, 38/64],
  [60/64, 28/64, 52/64, 20/64, 62/64, 30/64, 54/64, 22/64],
  [ 3/64, 35/64, 11/64, 43/64,  1/64, 33/64,  9/64, 41/64],
  [51/64, 19/64, 59/64, 27/64, 49/64, 17/64, 57/64, 25/64],
  [15/64, 47/64,  7/64, 39/64, 13/64, 45/64,  5/64, 37/64],
  [63/64, 31/64, 55/64, 23/64, 61/64, 29/64, 53/64, 21/64],
];

export function processDitheredPixelArt(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  options: AppOptions
) {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (srcW === 0 || srcH === 0) return;

  const pixelSize = Math.max(1, options.pixelSize);
  const lowW = Math.max(1, Math.floor(srcW / pixelSize));
  const lowH = Math.max(1, Math.floor(srcH / pixelSize));

  // Temporary downscale canvas
  const downCanvas = document.createElement('canvas');
  downCanvas.width = lowW;
  downCanvas.height = lowH;
  const dCtx = downCanvas.getContext('2d', { willReadFrequently: true });
  if (!dCtx) return;

  // Scale down
  dCtx.drawImage(sourceCanvas, 0, 0, lowW, lowH);
  const rawImgData = dCtx.getImageData(0, 0, lowW, lowH);

  // Optical Signal Preconditioning (Gamma, CLAHE, Unsharp Mask, Contrast, Brightness)
  const { rBuf: bufferR, gBuf: bufferG, bBuf: bufferB } = preprocessSignalBuffer(
    rawImgData.data,
    lowW,
    lowH,
    {
      contrast: options.contrast,
      brightness: options.brightness,
      gamma: options.gamma,
      invert: options.invert,
      claheEnabled: options.claheEnabled,
      claheClipLimit: options.claheClipLimit,
      unsharpStrength: options.unsharpStrength,
    }
  );

  const cachedPalette = getCachedPalette(options.palette, options.customPaletteColors);
  const ditherAmount = options.ditherAmount ?? 1.0;
  const algorithm = options.ditherAlgorithm;
  const errorClampMax = options.errorClamp ? options.errorClamp * 255 : 255;
  const dampingFloor = options.noiseDampingFloor ? options.noiseDampingFloor * 255 : 0;
  const isSerpentine = options.serpentineDither ?? true;

  const getIdx = (x: number, y: number) => y * lowW + x;

  // Helper to add error to neighbor with bleed clamping
  const addError = (x: number, y: number, er: number, eg: number, eb: number, weight: number) => {
    if (x < 0 || x >= lowW || y < 0 || y >= lowH) return;
    const idx = getIdx(x, y);

    const cer = Math.max(-errorClampMax, Math.min(errorClampMax, er * weight * ditherAmount));
    const ceg = Math.max(-errorClampMax, Math.min(errorClampMax, eg * weight * ditherAmount));
    const ceb = Math.max(-errorClampMax, Math.min(errorClampMax, eb * weight * ditherAmount));

    bufferR[idx] += cer;
    bufferG[idx] += ceg;
    bufferB[idx] += ceb;
  };

  // -------------------------------------------------------------
  // DITHERING ALGORITHMS
  // -------------------------------------------------------------
  if (
    algorithm === 'floyd-steinberg' ||
    algorithm === 'atkinson' ||
    algorithm === 'sierra' ||
    algorithm === 'burkes'
  ) {
    for (let y = 0; y < lowH; y++) {
      const isReverse = isSerpentine && y % 2 === 1;
      const startX = isReverse ? lowW - 1 : 0;
      const endX = isReverse ? -1 : lowW;
      const stepX = isReverse ? -1 : 1;
      const dir = isReverse ? -1 : 1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = getIdx(x, y);
        const curR = Math.max(0, Math.min(255, bufferR[idx]));
        const curG = Math.max(0, Math.min(255, bufferG[idx]));
        const curB = Math.max(0, Math.min(255, bufferB[idx]));

        const matched = findClosestCachedPaletteColor(curR, curG, curB, cachedPalette);

        const er = curR - matched.r;
        const eg = curG - matched.g;
        const eb = curB - matched.b;

        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;

        // Skip error diffusion if error is below damping floor (flat regions)
        if (dampingFloor > 0 && Math.abs(er) + Math.abs(eg) + Math.abs(eb) < dampingFloor * 3) {
          continue;
        }

        if (algorithm === 'floyd-steinberg') {
          addError(x + dir, y, er, eg, eb, 7 / 16);
          addError(x - dir, y + 1, er, eg, eb, 3 / 16);
          addError(x, y + 1, er, eg, eb, 5 / 16);
          addError(x + dir, y + 1, er, eg, eb, 1 / 16);
        } else if (algorithm === 'atkinson') {
          addError(x + dir, y, er, eg, eb, 1 / 8);
          addError(x + 2 * dir, y, er, eg, eb, 1 / 8);
          addError(x - dir, y + 1, er, eg, eb, 1 / 8);
          addError(x, y + 1, er, eg, eb, 1 / 8);
          addError(x + dir, y + 1, er, eg, eb, 1 / 8);
          addError(x, y + 2, er, eg, eb, 1 / 8);
        } else if (algorithm === 'sierra') {
          addError(x + dir, y, er, eg, eb, 5 / 32);
          addError(x + 2 * dir, y, er, eg, eb, 3 / 32);
          addError(x - 2 * dir, y + 1, er, eg, eb, 2 / 32);
          addError(x - dir, y + 1, er, eg, eb, 4 / 32);
          addError(x, y + 1, er, eg, eb, 5 / 32);
          addError(x + dir, y + 1, er, eg, eb, 4 / 32);
          addError(x + 2 * dir, y + 1, er, eg, eb, 2 / 32);
          addError(x - dir, y + 2, er, eg, eb, 2 / 32);
          addError(x, y + 2, er, eg, eb, 3 / 32);
          addError(x + dir, y + 2, er, eg, eb, 2 / 32);
        } else if (algorithm === 'burkes') {
          addError(x + dir, y, er, eg, eb, 8 / 32);
          addError(x + 2 * dir, y, er, eg, eb, 4 / 32);
          addError(x - 2 * dir, y + 1, er, eg, eb, 2 / 32);
          addError(x - dir, y + 1, er, eg, eb, 4 / 32);
          addError(x, y + 1, er, eg, eb, 8 / 32);
          addError(x + dir, y + 1, er, eg, eb, 4 / 32);
          addError(x + 2 * dir, y + 1, er, eg, eb, 2 / 32);
        }
      }
    }
  } else if (algorithm === 'blue-noise') {
    // -------------------------------------------------------------
    // BLUE NOISE DITHERING (64x64 Void-and-Cluster)
    // -------------------------------------------------------------
    const spread = 72 * ditherAmount;

    for (let y = 0; y < lowH; y++) {
      for (let x = 0; x < lowW; x++) {
        const idx = getIdx(x, y);
        const noise = sampleBlueNoise(x, y) - 0.5;
        const shift = noise * spread;

        const r = Math.max(0, Math.min(255, bufferR[idx] + shift));
        const g = Math.max(0, Math.min(255, bufferG[idx] + shift));
        const b = Math.max(0, Math.min(255, bufferB[idx] + shift));

        const matched = findClosestCachedPaletteColor(r, g, b, cachedPalette);
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;
      }
    }
  } else if (algorithm === 'bayer-4' || algorithm === 'bayer-8') {
    // -------------------------------------------------------------
    // ORDERED BAYER DITHERING
    // -------------------------------------------------------------
    const matrix = algorithm === 'bayer-4' ? BAYER_4X4 : BAYER_8X8;
    const mSize = matrix.length;
    const spread = 64 * ditherAmount;

    for (let y = 0; y < lowH; y++) {
      for (let x = 0; x < lowW; x++) {
        const idx = getIdx(x, y);
        const threshold = matrix[y % mSize][x % mSize] - 0.5;
        const shift = threshold * spread;

        const r = Math.max(0, Math.min(255, bufferR[idx] + shift));
        const g = Math.max(0, Math.min(255, bufferG[idx] + shift));
        const b = Math.max(0, Math.min(255, bufferB[idx] + shift));

        const matched = findClosestCachedPaletteColor(r, g, b, cachedPalette);
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;
      }
    }
  } else if (algorithm === 'halftone') {
    // -------------------------------------------------------------
    // RETRO HALFTONE SCREEN
    // -------------------------------------------------------------
    const freq = 6;
    for (let y = 0; y < lowH; y++) {
      for (let x = 0; x < lowW; x++) {
        const idx = getIdx(x, y);
        const dotPattern = (Math.sin((x * Math.PI) / freq) * Math.cos((y * Math.PI) / freq) + 1) / 2;
        const shift = (dotPattern - 0.5) * 80 * ditherAmount;

        const r = Math.max(0, Math.min(255, bufferR[idx] + shift));
        const g = Math.max(0, Math.min(255, bufferG[idx] + shift));
        const b = Math.max(0, Math.min(255, bufferB[idx] + shift));

        const matched = findClosestCachedPaletteColor(r, g, b, cachedPalette);
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;
      }
    }
  } else if (algorithm === 'noise') {
    // -------------------------------------------------------------
    // WHITE NOISE DITHERING
    // -------------------------------------------------------------
    for (let y = 0; y < lowH; y++) {
      for (let x = 0; x < lowW; x++) {
        const idx = getIdx(x, y);
        const noise = (Math.random() - 0.5) * 70 * ditherAmount;

        const r = Math.max(0, Math.min(255, bufferR[idx] + noise));
        const g = Math.max(0, Math.min(255, bufferG[idx] + noise));
        const b = Math.max(0, Math.min(255, bufferB[idx] + noise));

        const matched = findClosestCachedPaletteColor(r, g, b, cachedPalette);
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;
      }
    }
  } else {
    // -------------------------------------------------------------
    // THRESHOLD / DIRECT MATCH
    // -------------------------------------------------------------
    for (let i = 0; i < lowW * lowH; i++) {
      const matched = findClosestCachedPaletteColor(bufferR[i], bufferG[i], bufferB[i], cachedPalette);
      bufferR[i] = matched.r;
      bufferG[i] = matched.g;
      bufferB[i] = matched.b;
    }
  }

  // Write quantized pixels back
  const outImgData = dCtx.createImageData(lowW, lowH);
  const outData = outImgData.data;
  for (let i = 0; i < lowW * lowH; i++) {
    const idx = i * 4;
    outData[idx] = bufferR[i];
    outData[idx + 1] = bufferG[i];
    outData[idx + 2] = bufferB[i];
    outData[idx + 3] = 255;
  }
  dCtx.putImageData(outImgData, 0, 0);

  // Render to Target Canvas using crisp pixelated nearest-neighbor scaling
  targetCanvas.width = srcW;
  targetCanvas.height = srcH;
  const tCtx = targetCanvas.getContext('2d');
  if (!tCtx) return;

  tCtx.imageSmoothingEnabled = false;
  tCtx.drawImage(downCanvas, 0, 0, srcW, srcH);
}
