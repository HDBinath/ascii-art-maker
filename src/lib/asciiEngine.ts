import { AppOptions, CharsetName } from './types';
import { preprocessSignalBuffer } from './signalProcessing';

export const DENSITY_CHARSETS: Record<CharsetName, string> = {
  simple: " .:-=+*#%@",
  cyberpunk: " .^!*<&%$#@",
  blocks: " ░▒▓█",
  binary: " 01",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  matrix: " 0123456789ABCDEF$#@",
  braille: "⠀⠁⠃⠇⠏⠟⠿⣿",
  custom: " .:-=+*#%@",
};

export interface AsciiConversionResult {
  text: string;
  rows: string[];
  coloredGrid: { char: string; r: number; g: number; b: number; hex: string }[][];
  cols: number;
  rowsCount: number;
}

// In-memory cache for dynamic font density profile
const fontRampCache = new Map<string, string>();

/**
 * Auto-detect exact font width-to-height aspect ratio by measuring an offscreen glyph
 */
export function detectFontAspectRatio(): number {
  if (typeof document === 'undefined') return 0.55;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0.55;
    ctx.font = "20px 'Fira Code', 'Courier New', monospace";
    const metrics = ctx.measureText('M');
    const width = metrics.width;
    const ratio = width / 20;
    return Math.max(0.35, Math.min(0.75, Number(ratio.toFixed(3))));
  } catch {
    return 0.55;
  }
}

/**
 * Measure optical fill density of each character in the current font and sort ascending
 */
export function profileGlyphDensity(charsetStr: string, fontName: string = "'Fira Code', monospace"): string {
  if (typeof document === 'undefined') return charsetStr;
  const cacheKey = `${charsetStr}_${fontName}`;
  if (fontRampCache.has(cacheKey)) {
    return fontRampCache.get(cacheKey)!;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return charsetStr;

    ctx.font = `24px ${fontName}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';

    const uniqueChars = Array.from(new Set(charsetStr.split('')));
    const measured = uniqueChars.map(char => {
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillText(char, 4, 4);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      let filledPixels = 0;
      for (let i = 3; i < imgData.data.length; i += 4) {
        if (imgData.data[i] > 20) filledPixels++;
      }
      return { char, density: filledPixels };
    });

    measured.sort((a, b) => a.density - b.density);
    const sortedRamp = measured.map(m => m.char).join('');
    fontRampCache.set(cacheKey, sortedRamp);
    return sortedRamp;
  } catch {
    return charsetStr;
  }
}

export function getRamp(charset: CharsetName, customCharset: string, invert: boolean, dynamicSort: boolean = false): string {
  let ramp = DENSITY_CHARSETS[charset] || DENSITY_CHARSETS.simple;
  if (charset === 'custom' && customCharset.trim()) {
    ramp = customCharset.trim();
  }

  if (dynamicSort && charset !== 'braille') {
    ramp = profileGlyphDensity(ramp);
  }

  if (invert) {
    ramp = ramp.split('').reverse().join('');
  }
  return ramp;
}

/**
 * Unicode Braille 2x4 Sub-Pixel Matrix Dot Mapper
 * Dot index to bit mapping:
 * Dot 1: (0,0) -> 0x01 | Dot 4: (1,0) -> 0x08
 * Dot 2: (0,1) -> 0x02 | Dot 5: (1,1) -> 0x10
 * Dot 3: (0,2) -> 0x04 | Dot 6: (1,2) -> 0x20
 * Dot 7: (0,3) -> 0x40 | Dot 8: (1,3) -> 0x80
 */
const BRAILLE_DOT_MASKS = [
  [0x01, 0x08], // y = 0: dots 1, 4
  [0x02, 0x10], // y = 1: dots 2, 5
  [0x04, 0x20], // y = 2: dots 3, 6
  [0x40, 0x80], // y = 3: dots 7, 8
];

export function processAsciiArt(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  options: AppOptions,
  enableDitheredAscii: boolean = false
): AsciiConversionResult | null {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (srcW === 0 || srcH === 0) return null;

  const effectiveRatio = options.autoAspectRatio ? detectFontAspectRatio() : options.aspectRatio;
  const targetCols = Math.max(20, Math.min(300, options.columns));
  const isBraille = options.charset === 'braille';

  // For Braille mode, each cell represents 2x4 sub-pixels, so sample at 2x cols and 4x rows
  const subCols = isBraille ? targetCols * 2 : targetCols;
  const subRows = isBraille 
    ? Math.max(4, Math.floor((srcH / srcW) * targetCols * effectiveRatio * 4))
    : Math.max(1, Math.floor((srcH / srcW) * targetCols * effectiveRatio));

  const targetRows = isBraille ? Math.floor(subRows / 4) : subRows;

  // Sampling canvas
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = subCols;
  sampleCanvas.height = subRows;
  const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sCtx) return null;

  sCtx.drawImage(sourceCanvas, 0, 0, subCols, subRows);
  const rawImgData = sCtx.getImageData(0, 0, subCols, subRows);

  // Optical Signal Pre-processing (Gamma, CLAHE, Unsharp Mask, Contrast, Brightness)
  const { rBuf, gBuf, bBuf, lumBuf } = preprocessSignalBuffer(
    rawImgData.data,
    subCols,
    subRows,
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

  const rows: string[] = [];
  const coloredGrid: { char: string; r: number; g: number; b: number; hex: string }[][] = [];

  if (isBraille) {
    // -------------------------------------------------------------
    // BRAILLE 2x4 SUB-PIXEL MATRIX ENGINE
    // -------------------------------------------------------------
    const threshold = 128;

    for (let by = 0; by < targetRows; by++) {
      let rowStr = '';
      const colorRow: { char: string; r: number; g: number; b: number; hex: string }[] = [];

      for (let bx = 0; bx < targetCols; bx++) {
        let bitmask = 0;
        let avgR = 0, avgG = 0, avgB = 0;
        let count = 0;

        for (let dy = 0; dy < 4; dy++) {
          const sy = by * 4 + dy;
          if (sy >= subRows) continue;

          for (let dx = 0; dx < 2; dx++) {
            const sx = bx * 2 + dx;
            if (sx >= subCols) continue;

            const idx = sy * subCols + sx;
            const lum = lumBuf[idx];
            if (lum > threshold) {
              bitmask |= BRAILLE_DOT_MASKS[dy][dx];
            }
            avgR += rBuf[idx];
            avgG += gBuf[idx];
            avgB += bBuf[idx];
            count++;
          }
        }

        const char = String.fromCharCode(0x2800 + bitmask);
        const r = count > 0 ? Math.round(avgR / count) : 0;
        const g = count > 0 ? Math.round(avgG / count) : 0;
        const b = count > 0 ? Math.round(avgB / count) : 0;

        rowStr += char;
        colorRow.push({
          char,
          r,
          g,
          b,
          hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
        });
      }

      rows.push(rowStr);
      coloredGrid.push(colorRow);
    }
  } else {
    // -------------------------------------------------------------
    // STANDARD / SOBEL-INJECTED ASCII ENGINE
    // -------------------------------------------------------------
    const ramp = getRamp(options.charset, options.customCharset, options.invert, options.dynamicFontSort);
    const rampLen = ramp.length;

    // Optional Sobel Edge Extraction for Structural Line Injection
    let edgeAngles: Float32Array | null = null;
    let edgeMagnitudes: Float32Array | null = null;

    if (options.sobelEdgeInjection) {
      edgeAngles = new Float32Array(subCols * subRows);
      edgeMagnitudes = new Float32Array(subCols * subRows);
      const getLum = (x: number, y: number) => {
        const cx = Math.max(0, Math.min(subCols - 1, x));
        const cy = Math.max(0, Math.min(subRows - 1, y));
        return lumBuf[cy * subCols + cx];
      };

      for (let y = 0; y < subRows; y++) {
        for (let x = 0; x < subCols; x++) {
          const gx =
            -1 * getLum(x - 1, y - 1) + 1 * getLum(x + 1, y - 1) +
            -2 * getLum(x - 1, y)     + 2 * getLum(x + 1, y) +
            -1 * getLum(x - 1, y + 1) + 1 * getLum(x + 1, y + 1);

          const gy =
            -1 * getLum(x - 1, y - 1) - 2 * getLum(x, y - 1) - 1 * getLum(x + 1, y - 1) +
             1 * getLum(x - 1, y + 1) + 2 * getLum(x, y + 1) + 1 * getLum(x + 1, y + 1);

          const mag = Math.sqrt(gx * gx + gy * gy);
          const angle = Math.atan2(gy, gx); // radians: -PI to PI
          const idx = y * subCols + x;
          edgeMagnitudes[idx] = mag;
          edgeAngles[idx] = angle;
        }
      }
    }

    // Error diffusion across character ramp if Dithered ASCII mode is on
    if (enableDitheredAscii) {
      for (let y = 0; y < subRows; y++) {
        for (let x = 0; x < subCols; x++) {
          const idx = y * subCols + x;
          const curLum = Math.max(0, Math.min(255, lumBuf[idx]));
          const charStep = 255 / (rampLen - 1);
          const charIdx = Math.max(0, Math.min(rampLen - 1, Math.round(curLum / charStep)));
          const quantLum = charIdx * charStep;
          const err = curLum - quantLum;

          if (x + 1 < subCols) lumBuf[y * subCols + (x + 1)] += err * (7 / 16);
          if (x - 1 >= 0 && y + 1 < subRows) lumBuf[(y + 1) * subCols + (x - 1)] += err * (3 / 16);
          if (y + 1 < subRows) lumBuf[(y + 1) * subCols + x] += err * (5 / 16);
          if (x + 1 < subCols && y + 1 < subRows) lumBuf[(y + 1) * subCols + (x + 1)] += err * (1 / 16);
        }
      }
    }

    const sobelCutoff = (1.0 - (options.sobelSensitivity ?? 0.5)) * 180 + 40;

    for (let y = 0; y < subRows; y++) {
      let rowStr = '';
      const colorRow: { char: string; r: number; g: number; b: number; hex: string }[] = [];

      for (let x = 0; x < subCols; x++) {
        const idx = y * subCols + x;
        const r = Math.round(rBuf[idx]);
        const g = Math.round(gBuf[idx]);
        const b = Math.round(bBuf[idx]);
        const lum = Math.max(0, Math.min(255, lumBuf[idx]));

        let char = '';

        // Check Sobel edge injection first
        if (options.sobelEdgeInjection && edgeMagnitudes && edgeAngles) {
          const mag = edgeMagnitudes[idx];
          if (mag > sobelCutoff) {
            let deg = (edgeAngles[idx] * 180) / Math.PI;
            if (deg < 0) deg += 180;

            if (deg >= 22.5 && deg < 67.5) {
              char = '/';
            } else if (deg >= 67.5 && deg < 112.5) {
              char = '-';
            } else if (deg >= 112.5 && deg < 157.5) {
              char = '\\';
            } else {
              char = '|';
            }
          }
        }

        if (!char) {
          const charIdx = Math.max(0, Math.min(rampLen - 1, Math.floor((lum / 255) * (rampLen - 1))));
          char = ramp[charIdx];
        }

        rowStr += char;
        colorRow.push({
          char,
          r,
          g,
          b,
          hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
        });
      }

      rows.push(rowStr);
      coloredGrid.push(colorRow);
    }
  }

  // Draw to target canvas
  const charH = options.fontSize;
  const charW = Math.max(1, charH * effectiveRatio);
  targetCanvas.width = Math.floor(targetCols * charW + 20);
  targetCanvas.height = Math.floor(targetRows * charH + 20);

  const tCtx = targetCanvas.getContext('2d');
  if (tCtx) {
    let bgColor = '#05070a';
    let textColor = '#00ff41';

    if (options.asciiColorMode === 'amber') {
      bgColor = '#0f0b04';
      textColor = '#ffb000';
    } else if (options.asciiColorMode === 'bw') {
      bgColor = '#000000';
      textColor = '#ffffff';
    } else if (options.asciiColorMode === 'synthwave') {
      bgColor = '#0e051a';
      textColor = '#ff71ce';
    }

    tCtx.fillStyle = bgColor;
    tCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    tCtx.font = `bold ${charH}px 'Fira Code', 'Courier New', monospace`;
    tCtx.textBaseline = 'top';

    if (options.asciiColorMode === 'color') {
      for (let y = 0; y < targetRows; y++) {
        const yPos = 10 + y * charH;
        for (let x = 0; x < targetCols; x++) {
          const cell = coloredGrid[y][x];
          tCtx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
          tCtx.fillText(cell.char, 10 + x * charW, yPos);
        }
      }
    } else if (options.asciiColorMode === 'synthwave') {
      for (let y = 0; y < targetRows; y++) {
        const yPos = 10 + y * charH;
        const ratio = y / Math.max(1, targetRows);
        const r = Math.floor(255 * (1 - ratio) + 1 * ratio);
        const g = Math.floor(113 * (1 - ratio) + 205 * ratio);
        const b = Math.floor(206 * (1 - ratio) + 254 * ratio);
        tCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        tCtx.fillText(rows[y], 10, yPos);
      }
    } else {
      tCtx.fillStyle = textColor;
      for (let y = 0; y < targetRows; y++) {
        tCtx.fillText(rows[y], 10, 10 + y * charH);
      }
    }
  }

  return {
    text: rows.join('\n'),
    rows,
    coloredGrid,
    cols: targetCols,
    rowsCount: targetRows,
  };
}

export function generateHtmlExport(result: AsciiConversionResult, colorMode: string): string {
  const bg = colorMode === 'amber' ? '#0f0b04' : colorMode === 'bw' ? '#000000' : '#050d08';
  const defaultText = colorMode === 'amber' ? '#ffb000' : colorMode === 'bw' ? '#ffffff' : '#00ff41';

  const htmlLines = result.coloredGrid.map(row => {
    return row.map(cell => {
      let ch = cell.char;
      if (ch === ' ') ch = '&nbsp;';
      else if (ch === '<') ch = '&lt;';
      else if (ch === '>') ch = '&gt;';
      else if (ch === '&') ch = '&amp;';

      if (colorMode === 'color') {
        return `<span style="color:${cell.hex}">${ch}</span>`;
      }
      return ch;
    }).join('');
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CYBER::STUDIO ASCII Export</title>
  <style>
    body {
      background: ${bg};
      color: ${defaultText};
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
      background: rgba(0,0,0,0.85);
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0,255,65,0.2);
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
