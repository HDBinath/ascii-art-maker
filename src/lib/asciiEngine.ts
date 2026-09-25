import { AppOptions, CharsetName } from './types';

export const DENSITY_CHARSETS: Record<CharsetName, string> = {
  simple: " .:-=+*#%@",
  cyberpunk: " .^!*<&%$#@",
  blocks: " ░▒▓█",
  binary: " 01",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  matrix: " 0123456789ABCDEF$#@",
  custom: " .:-=+*#%@",
};

export interface AsciiConversionResult {
  text: string;
  rows: string[];
  coloredGrid: { char: string; r: number; g: number; b: number; hex: string }[][];
  cols: number;
  rowsCount: number;
}

export function getRamp(charset: CharsetName, customCharset: string, invert: boolean): string {
  let ramp = DENSITY_CHARSETS[charset] || DENSITY_CHARSETS.simple;
  if (charset === 'custom' && customCharset.trim()) {
    ramp = customCharset.trim();
  }
  if (invert) {
    ramp = ramp.split('').reverse().join('');
  }
  return ramp;
}

export function processAsciiArt(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  options: AppOptions,
  enableDitheredAscii: boolean = false
): AsciiConversionResult | null {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (srcW === 0 || srcH === 0) return null;

  const targetCols = Math.max(20, Math.min(300, options.columns));
  const targetRows = Math.max(1, Math.floor((srcH / srcW) * targetCols * options.aspectRatio));

  // Small sampling canvas
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = targetCols;
  sampleCanvas.height = targetRows;
  const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sCtx) return null;

  sCtx.drawImage(sourceCanvas, 0, 0, targetCols, targetRows);
  const imgData = sCtx.getImageData(0, 0, targetCols, targetRows);
  const data = imgData.data;

  // Contrast Calculation
  const cVal = Math.max(-254, Math.min(254, (options.contrast - 1.0) * 128));
  const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

  const ramp = getRamp(options.charset, options.customCharset, options.invert);
  const rampLen = ramp.length;

  // Pre-calculate brightness grid
  const lumGrid = new Float32Array(targetCols * targetRows);
  for (let y = 0; y < targetRows; y++) {
    for (let x = 0; x < targetCols; x++) {
      const idx = (y * targetCols + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lum = contrastFactor * (lum - 128) + 128;
      lum *= options.brightness;
      lumGrid[y * targetCols + x] = Math.max(0, Math.min(255, lum));
    }
  }

  // Error diffusion across character ramp if Dithered ASCII mode is on
  if (enableDitheredAscii) {
    for (let y = 0; y < targetRows; y++) {
      for (let x = 0; x < targetCols; x++) {
        const idx = y * targetCols + x;
        const curLum = Math.max(0, Math.min(255, lumGrid[idx]));
        const charStep = 255 / (rampLen - 1);
        const charIdx = Math.max(0, Math.min(rampLen - 1, Math.round(curLum / charStep)));
        const quantLum = charIdx * charStep;
        const err = curLum - quantLum;

        // Diffuse error
        if (x + 1 < targetCols) lumGrid[y * targetCols + (x + 1)] += err * (7 / 16);
        if (x - 1 >= 0 && y + 1 < targetRows) lumGrid[(y + 1) * targetCols + (x - 1)] += err * (3 / 16);
        if (y + 1 < targetRows) lumGrid[(y + 1) * targetCols + x] += err * (5 / 16);
        if (x + 1 < targetCols && y + 1 < targetRows) lumGrid[(y + 1) * targetCols + (x + 1)] += err * (1 / 16);
      }
    }
  }

  const rows: string[] = [];
  const coloredGrid: { char: string; r: number; g: number; b: number; hex: string }[][] = [];

  for (let y = 0; y < targetRows; y++) {
    let rowStr = "";
    const colorRow: { char: string; r: number; g: number; b: number; hex: string }[] = [];
    for (let x = 0; x < targetCols; x++) {
      const pIdx = (y * targetCols + x) * 4;
      const r = data[pIdx];
      const g = data[pIdx + 1];
      const b = data[pIdx + 2];

      const lum = Math.max(0, Math.min(255, lumGrid[y * targetCols + x]));
      const charIdx = Math.max(0, Math.min(rampLen - 1, Math.floor((lum / 255) * (rampLen - 1))));
      const char = ramp[charIdx];

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

  // Draw to target canvas
  const charH = options.fontSize;
  const charW = Math.max(1, charH * 0.6);
  targetCanvas.width = Math.floor(targetCols * charW + 20);
  targetCanvas.height = Math.floor(targetRows * charH + 20);

  const tCtx = targetCanvas.getContext('2d');
  if (tCtx) {
    // Theme colors
    let bgColor = "#05070a";
    let textColor = "#00ff41";

    if (options.asciiColorMode === 'amber') {
      bgColor = "#0f0b04";
      textColor = "#ffb000";
    } else if (options.asciiColorMode === 'bw') {
      bgColor = "#000000";
      textColor = "#ffffff";
    } else if (options.asciiColorMode === 'synthwave') {
      bgColor = "#0e051a";
      textColor = "#ff71ce";
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
  <title>Cyberpunk ASCII Export</title>
  <style>
    body {
      background: ${bg};
      color: ${defaultText};
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 11px;
      line-height: 0.65;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .art-container {
      background: rgba(0,0,0,0.8);
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0,255,65,0.2);
      white-space: pre;
      font-weight: bold;
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
