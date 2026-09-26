import { AppOptions } from './types';
import { AsciiConversionResult, getRamp, detectFontAspectRatio } from './asciiEngine';
import { getCachedPalette, findClosestCachedPaletteColor } from './palettes';
import { sampleBlueNoise } from './blueNoise';
import { preprocessSignalBuffer } from './signalProcessing';

export interface HybridCell {
  char: string;
  fgR: number;
  fgG: number;
  fgB: number;
  fgHex: string;
  bgR: number;
  bgG: number;
  bgB: number;
  bgHex: string;
}

export interface HybridConversionResult extends AsciiConversionResult {
  hybridGrid: HybridCell[][];
}

/**
 * Advanced Dither-ASCII Hybrid Engine
 * Combines dithered character transition matrices with two-tone cell quantization
 */
export function processHybridArt(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  options: AppOptions
): HybridConversionResult | null {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (srcW === 0 || srcH === 0) return null;

  const effectiveRatio = options.autoAspectRatio ? detectFontAspectRatio() : options.aspectRatio;
  const targetCols = Math.max(20, Math.min(300, options.columns));
  const targetRows = Math.max(1, Math.floor((srcH / srcW) * targetCols * effectiveRatio));

  // Cell dimensions in original image
  const cellW = Math.max(1, Math.floor(srcW / targetCols));
  const cellH = Math.max(1, Math.floor(srcH / targetRows));

  // Downsample to grid
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = targetCols;
  sampleCanvas.height = targetRows;
  const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sCtx) return null;

  sCtx.drawImage(sourceCanvas, 0, 0, targetCols, targetRows);
  const rawImgData = sCtx.getImageData(0, 0, targetCols, targetRows);

  // Pre-condition signal
  const { rBuf, gBuf, bBuf, lumBuf } = preprocessSignalBuffer(
    rawImgData.data,
    targetCols,
    targetRows,
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
  const ramp = getRamp(options.charset, options.customCharset, options.invert, options.dynamicFontSort);
  const rampLen = ramp.length;

  const rows: string[] = [];
  const coloredGrid: { char: string; r: number; g: number; b: number; hex: string }[][] = [];
  const hybridGrid: HybridCell[][] = [];

  for (let y = 0; y < targetRows; y++) {
    let rowStr = '';
    const colorRow: { char: string; r: number; g: number; b: number; hex: string }[] = [];
    const hybridRow: HybridCell[] = [];

    for (let x = 0; x < targetCols; x++) {
      const idx = y * targetCols + x;
      const lum = Math.max(0, Math.min(255, lumBuf[idx]));
      const origR = rBuf[idx];
      const origG = gBuf[idx];
      const origB = bBuf[idx];

      // Dithered continuous character transition
      const continuousIndex = (lum / 255) * (rampLen - 1);
      const baseIndex = Math.floor(continuousIndex);
      const frac = continuousIndex - baseIndex;
      const noiseThreshold = sampleBlueNoise(x, y);

      let finalCharIdx = baseIndex;
      if (frac > noiseThreshold && baseIndex < rampLen - 1) {
        finalCharIdx = baseIndex + 1;
      }
      finalCharIdx = Math.max(0, Math.min(rampLen - 1, finalCharIdx));
      const char = ramp[finalCharIdx];

      // Two-Tone Cell Quantization
      let fgColor = findClosestCachedPaletteColor(origR * 1.2, origG * 1.2, origB * 1.2, cachedPalette);
      let bgColor = findClosestCachedPaletteColor(origR * 0.35, origG * 0.35, origB * 0.35, cachedPalette);

      if (options.asciiColorMode === 'matrix') {
        fgColor = { r: 0, g: 255, b: 65 };
        bgColor = { r: 5, g: 15, b: 8 };
      } else if (options.asciiColorMode === 'amber') {
        fgColor = { r: 255, g: 176, b: 0 };
        bgColor = { r: 15, g: 11, b: 4 };
      } else if (options.asciiColorMode === 'bw') {
        fgColor = { r: 255, g: 255, b: 255 };
        bgColor = { r: 0, g: 0, b: 0 };
      } else if (options.asciiColorMode === 'synthwave') {
        fgColor = { r: 255, g: 113, b: 206 };
        bgColor = { r: 14, g: 5, b: 26 };
      }

      const fgHex = `#${((1 << 24) + (fgColor.r << 16) + (fgColor.g << 8) + fgColor.b).toString(16).slice(1)}`;
      const bgHex = `#${((1 << 24) + (bgColor.r << 16) + (bgColor.g << 8) + bgColor.b).toString(16).slice(1)}`;

      rowStr += char;
      colorRow.push({
        char,
        r: fgColor.r,
        g: fgColor.g,
        b: fgColor.b,
        hex: fgHex,
      });

      hybridRow.push({
        char,
        fgR: fgColor.r,
        fgG: fgColor.g,
        fgB: fgColor.b,
        fgHex,
        bgR: bgColor.r,
        bgG: bgColor.g,
        bgB: bgColor.b,
        bgHex,
      });
    }

    rows.push(rowStr);
    coloredGrid.push(colorRow);
    hybridGrid.push(hybridRow);
  }

  // Draw to Target Canvas
  const charH = options.fontSize;
  const charW = Math.max(1, charH * effectiveRatio);
  targetCanvas.width = Math.floor(targetCols * charW + 20);
  targetCanvas.height = Math.floor(targetRows * charH + 20);

  const tCtx = targetCanvas.getContext('2d');
  if (tCtx) {
    tCtx.fillStyle = '#05070a';
    tCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    tCtx.font = `bold ${charH}px 'Fira Code', 'Courier New', monospace`;
    tCtx.textBaseline = 'top';

    for (let y = 0; y < targetRows; y++) {
      const yPos = 10 + y * charH;
      for (let x = 0; x < targetCols; x++) {
        const cell = hybridGrid[y][x];
        const xPos = 10 + x * charW;

        // Draw 2-Tone Background Block if enabled
        if (options.hybridTwoTone) {
          tCtx.fillStyle = cell.bgHex;
          tCtx.fillRect(xPos, yPos, charW, charH);
        }

        // Draw Foreground Character
        tCtx.fillStyle = cell.fgHex;
        tCtx.fillText(cell.char, xPos, yPos);
      }
    }
  }

  return {
    text: rows.join('\n'),
    rows,
    coloredGrid,
    hybridGrid,
    cols: targetCols,
    rowsCount: targetRows,
  };
}

export function generateHybridHtmlExport(result: HybridConversionResult, twoTone: boolean): string {
  const htmlLines = result.hybridGrid.map(row => {
    return row.map(cell => {
      let ch = cell.char;
      if (ch === ' ') ch = '&nbsp;';
      else if (ch === '<') ch = '&lt;';
      else if (ch === '>') ch = '&gt;';
      else if (ch === '&') ch = '&amp;';

      if (twoTone) {
        return `<span style="color:${cell.fgHex};background-color:${cell.bgHex}">${ch}</span>`;
      }
      return `<span style="color:${cell.fgHex}">${ch}</span>`;
    }).join('');
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CYBER::STUDIO Dither-ASCII Hybrid Export</title>
  <style>
    body {
      background: #05070a;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 11px;
      line-height: 0.70;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .art-container {
      background: #000000;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 35px rgba(253,134,219,0.3);
      white-space: pre;
      font-weight: bold;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="art-container">
${htmlLines.join('<br>\n')}
  </div>
</body>
</html>`;
}
