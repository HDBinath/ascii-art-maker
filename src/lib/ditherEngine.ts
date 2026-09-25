import { AppOptions, RGBColor } from './types';
import { findClosestPaletteColor, getPaletteRgbList } from './palettes';

// 4x4 Bayer Matrix (normalized 0 to 1)
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16]
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
  [63/64, 31/64, 55/64, 23/64, 61/64, 29/64, 53/64, 21/64]
];

function applyContrastAndBrightness(
  r: number,
  g: number,
  b: number,
  contrast: number,
  brightness: number,
  invert: boolean
): [number, number, number] {
  if (invert) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }

  // Contrast factor formula
  const cVal = Math.max(-254, Math.min(254, (contrast - 1.0) * 128));
  const factor = (259 * (cVal + 255)) / (255 * (259 - cVal));

  let adjR = factor * (r - 128) + 128;
  let adjG = factor * (g - 128) + 128;
  let adjB = factor * (b - 128) + 128;

  adjR *= brightness;
  adjG *= brightness;
  adjB *= brightness;

  return [
    Math.max(0, Math.min(255, adjR)),
    Math.max(0, Math.min(255, adjG)),
    Math.max(0, Math.min(255, adjB))
  ];
}

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

  // Create temporary downscale canvas
  const downCanvas = document.createElement('canvas');
  downCanvas.width = lowW;
  downCanvas.height = lowH;
  const dCtx = downCanvas.getContext('2d', { willReadFrequently: true });
  if (!dCtx) return;

  // Draw scaled down image
  dCtx.drawImage(sourceCanvas, 0, 0, lowW, lowH);
  const imgData = dCtx.getImageData(0, 0, lowW, lowH);
  const data = imgData.data;

  const palette = getPaletteRgbList(options.palette, options.customPaletteColors);
  const ditherAmount = options.ditherAmount ?? 1.0;
  const algorithm = options.ditherAlgorithm;

  // Working float arrays for error diffusion
  const bufferR = new Float32Array(lowW * lowH);
  const bufferG = new Float32Array(lowW * lowH);
  const bufferB = new Float32Array(lowW * lowH);

  // Initialize with preprocessed colors (contrast + brightness)
  for (let i = 0; i < lowW * lowH; i++) {
    const idx = i * 4;
    const [r, g, b] = applyContrastAndBrightness(
      data[idx],
      data[idx + 1],
      data[idx + 2],
      options.contrast,
      options.brightness,
      options.invert
    );
    bufferR[i] = r;
    bufferG[i] = g;
    bufferB[i] = b;
  }

  const getIdx = (x: number, y: number) => y * lowW + x;

  // Helper to add error to neighbor
  const addError = (x: number, y: number, er: number, eg: number, eb: number, weight: number) => {
    if (x < 0 || x >= lowW || y < 0 || y >= lowH) return;
    const idx = getIdx(x, y);
    bufferR[idx] += er * weight * ditherAmount;
    bufferG[idx] += eg * weight * ditherAmount;
    bufferB[idx] += eb * weight * ditherAmount;
  };

  // Perform Dithering by Algorithm
  if (algorithm === 'floyd-steinberg' || algorithm === 'atkinson' || algorithm === 'sierra' || algorithm === 'burkes') {
    for (let y = 0; y < lowH; y++) {
      for (let x = 0; x < lowW; x++) {
        const idx = getIdx(x, y);
        const curR = Math.max(0, Math.min(255, bufferR[idx]));
        const curG = Math.max(0, Math.min(255, bufferG[idx]));
        const curB = Math.max(0, Math.min(255, bufferB[idx]));

        const matched = findClosestPaletteColor(curR, curG, curB, palette);

        const er = curR - matched.r;
        const eg = curG - matched.g;
        const eb = curB - matched.b;

        // Set output
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;

        if (algorithm === 'floyd-steinberg') {
          addError(x + 1, y, er, eg, eb, 7 / 16);
          addError(x - 1, y + 1, er, eg, eb, 3 / 16);
          addError(x, y + 1, er, eg, eb, 5 / 16);
          addError(x + 1, y + 1, er, eg, eb, 1 / 16);
        } else if (algorithm === 'atkinson') {
          // Atkinson distributes 1/8 to 6 neighbors (3/4 total error)
          addError(x + 1, y, er, eg, eb, 1 / 8);
          addError(x + 2, y, er, eg, eb, 1 / 8);
          addError(x - 1, y + 1, er, eg, eb, 1 / 8);
          addError(x, y + 1, er, eg, eb, 1 / 8);
          addError(x + 1, y + 1, er, eg, eb, 1 / 8);
          addError(x, y + 2, er, eg, eb, 1 / 8);
        } else if (algorithm === 'sierra') {
          // Sierra 3
          addError(x + 1, y, er, eg, eb, 5 / 32);
          addError(x + 2, y, er, eg, eb, 3 / 32);
          addError(x - 2, y + 1, er, eg, eb, 2 / 32);
          addError(x - 1, y + 1, er, eg, eb, 4 / 32);
          addError(x, y + 1, er, eg, eb, 5 / 32);
          addError(x + 1, y + 1, er, eg, eb, 4 / 32);
          addError(x + 2, y + 1, er, eg, eb, 2 / 32);
          addError(x - 1, y + 2, er, eg, eb, 2 / 32);
          addError(x, y + 2, er, eg, eb, 3 / 32);
          addError(x + 1, y + 2, er, eg, eb, 2 / 32);
        } else if (algorithm === 'burkes') {
          addError(x + 1, y, er, eg, eb, 8 / 32);
          addError(x + 2, y, er, eg, eb, 4 / 32);
          addError(x - 2, y + 1, er, eg, eb, 2 / 32);
          addError(x - 1, y + 1, er, eg, eb, 4 / 32);
          addError(x, y + 1, er, eg, eb, 8 / 32);
          addError(x + 1, y + 1, er, eg, eb, 4 / 32);
          addError(x + 2, y + 1, er, eg, eb, 2 / 32);
        }
      }
    }
  } else if (algorithm === 'bayer-4' || algorithm === 'bayer-8') {
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

        const matched = findClosestPaletteColor(r, g, b, palette);
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;
      }
    }
  } else if (algorithm === 'halftone') {
    // Halftone dot screen effect
    const freq = 6;
    for (let y = 0; y < lowH; y++) {
      for (let x = 0; x < lowW; x++) {
        const idx = getIdx(x, y);
        const dotPattern = (Math.sin((x * Math.PI) / freq) * Math.cos((y * Math.PI) / freq) + 1) / 2;
        const shift = (dotPattern - 0.5) * 80 * ditherAmount;

        const r = Math.max(0, Math.min(255, bufferR[idx] + shift));
        const g = Math.max(0, Math.min(255, bufferG[idx] + shift));
        const b = Math.max(0, Math.min(255, bufferB[idx] + shift));

        const matched = findClosestPaletteColor(r, g, b, palette);
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;
      }
    }
  } else if (algorithm === 'noise') {
    for (let y = 0; y < lowH; y++) {
      for (let x = 0; x < lowW; x++) {
        const idx = getIdx(x, y);
        const noise = (Math.random() - 0.5) * 70 * ditherAmount;

        const r = Math.max(0, Math.min(255, bufferR[idx] + noise));
        const g = Math.max(0, Math.min(255, bufferG[idx] + noise));
        const b = Math.max(0, Math.min(255, bufferB[idx] + noise));

        const matched = findClosestPaletteColor(r, g, b, palette);
        bufferR[idx] = matched.r;
        bufferG[idx] = matched.g;
        bufferB[idx] = matched.b;
      }
    }
  } else {
    // Threshold / Nearest Match
    for (let i = 0; i < lowW * lowH; i++) {
      const matched = findClosestPaletteColor(bufferR[i], bufferG[i], bufferB[i], palette);
      bufferR[i] = matched.r;
      bufferG[i] = matched.g;
      bufferB[i] = matched.b;
    }
  }

  // Write back to small downscaled canvas
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
