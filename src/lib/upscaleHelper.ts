import { UpscaleMode } from './types';

/**
 * Upscales an input image / canvas by a scale multiplier (1x, 2x, 4x, 8x)
 * with the desired algorithm (smooth bicubic, pixelated nearest-neighbor, or edge-enhanced).
 */
export function upscaleSourceCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  scaleFactor: number = 1,
  mode: UpscaleMode = 'smooth'
): HTMLCanvasElement {
  const srcW = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const srcH = 'naturalHeight' in source ? source.naturalHeight : source.height;

  const targetW = Math.max(1, Math.round(srcW * scaleFactor));
  const targetH = Math.max(1, Math.round(srcH * scaleFactor));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return outCanvas;

  if (mode === 'pixel') {
    // Nearest neighbor pixel art scaling (preserves crisp pixel grid)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, targetW, targetH);
  } else if (mode === 'edge') {
    // High-quality stepped scaling with unsharp masking for crisp edges
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetW, targetH);

    // Apply subtle sharpening convolution to enhance details
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    // Simple 3x3 unsharp mask kernel: [0, -0.5, 0], [-0.5, 3.0, -0.5], [0, -0.5, 0]
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        const idx = (y * targetW + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const top = copy[((y - 1) * targetW + x) * 4 + c];
          const bottom = copy[((y + 1) * targetW + x) * 4 + c];
          const left = copy[(y * targetW + (x - 1)) * 4 + c];
          const right = copy[(y * targetW + (x + 1)) * 4 + c];

          const val = center * 2.2 - (top + bottom + left + right) * 0.3;
          data[idx + c] = Math.max(0, Math.min(255, val));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else {
    // Smooth high quality multi-step bicubic scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetW, targetH);
  }

  return outCanvas;
}

/**
 * Creates an ultra-high-resolution exported PNG canvas
 * scaled by exportScale (e.g. 1x, 2x, 4x 4K, 8x Print)
 */
export function generateHighResExportCanvas(
  currentCanvas: HTMLCanvasElement,
  exportScale: number = 1
): HTMLCanvasElement {
  if (exportScale <= 1) return currentCanvas;

  const targetW = currentCanvas.width * exportScale;
  const targetH = currentCanvas.height * exportScale;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return currentCanvas;

  // Render with nearest-neighbor to keep pixel and ASCII text pin-sharp without blur
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(currentCanvas, 0, 0, targetW, targetH);

  return outCanvas;
}
