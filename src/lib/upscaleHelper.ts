import { UpscaleMode } from '@/lib/types';

// Maximum hardware-supported canvas dimension for 8K UHD output
const MAX_SAFE_CANVAS_DIMENSION = 8192;

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

  let targetW = Math.max(1, Math.round(srcW * scaleFactor));
  let targetH = Math.max(1, Math.round(srcH * scaleFactor));

  // Clamp within 8K safe hardware limits
  if (targetW > MAX_SAFE_CANVAS_DIMENSION || targetH > MAX_SAFE_CANVAS_DIMENSION) {
    const ratio = Math.min(MAX_SAFE_CANVAS_DIMENSION / targetW, MAX_SAFE_CANVAS_DIMENSION / targetH);
    targetW = Math.round(targetW * ratio);
    targetH = Math.round(targetH * ratio);
  }

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

    // Apply unsharp mask kernel for enhanced details (optimized)
    try {
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;
      const copy = new Uint8ClampedArray(data);

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
    } catch {
      // Fallback if image data read is restricted
    }
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
 * scaled by exportScale (e.g. 1x, 2x, 4x 4K, 8x 8K)
 */
export function generateHighResExportCanvas(
  currentCanvas: HTMLCanvasElement,
  exportScale: number = 1
): HTMLCanvasElement {
  if (exportScale <= 1) return currentCanvas;

  let targetW = currentCanvas.width * exportScale;
  let targetH = currentCanvas.height * exportScale;

  // Safe clamping for 8K ultra high resolution
  if (targetW > MAX_SAFE_CANVAS_DIMENSION || targetH > MAX_SAFE_CANVAS_DIMENSION) {
    const ratio = Math.min(MAX_SAFE_CANVAS_DIMENSION / targetW, MAX_SAFE_CANVAS_DIMENSION / targetH);
    targetW = Math.round(targetW * ratio);
    targetH = Math.round(targetH * ratio);
  }

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

/**
 * Asynchronously converts canvas to Blob to avoid browser memory limits
 * and prevent 0-byte downloads on large 4K and 8K images.
 */
export async function exportCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            // Fallback for edge cases
            try {
              const dataUrl = canvas.toDataURL('image/png');
              if (!dataUrl || dataUrl === 'data:,') {
                reject(new Error('Canvas exceeds browser export buffer.'));
                return;
              }
              const byteString = atob(dataUrl.split(',')[1]);
              const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolve(new Blob([ab], { type: mimeString }));
            } catch (err) {
              reject(err);
            }
          }
        },
        'image/png',
        1.0
      );
    } catch (err) {
      reject(err);
    }
  });
}
