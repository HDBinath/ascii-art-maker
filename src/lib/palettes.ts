import { PaletteName, RGBColor } from './types';
import { rgbToOklab, oklabDistanceSquared, CachedPaletteColor, createCachedPalette } from './colorScience';

export function hexToRgb(hex: string): RGBColor {
  const sanitized = hex.replace('#', '').trim();
  let r = 0, g = 0, b = 0;
  if (sanitized.length === 3) {
    r = parseInt(sanitized[0] + sanitized[0], 16);
    g = parseInt(sanitized[1] + sanitized[1], 16);
    b = parseInt(sanitized[2] + sanitized[2], 16);
  } else if (sanitized.length === 6) {
    r = parseInt(sanitized.substring(0, 2), 16);
    g = parseInt(sanitized.substring(2, 4), 16);
    b = parseInt(sanitized.substring(4, 6), 16);
  }
  return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;
}

export const PRESET_PALETTES: Record<PaletteName, { name: string; colors: string[] }> = {
  gameboy: {
    name: 'Game Boy Classic (4-shade)',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    colors: ['#050510', '#00f0ff', '#ff0055', '#ffe600', '#7928ca', '#00ff41'],
  },
  cga: {
    name: 'CGA Mode 1',
    colors: ['#000000', '#55ffff', '#ff55ff', '#ffffff'],
  },
  pico8: {
    name: 'Pico-8 (16 Colors)',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ],
  },
  c64: {
    name: 'Commodore 64',
    colors: [
      '#000000', '#ffffff', '#880000', '#aaffee',
      '#cc44cc', '#00cc55', '#0000aa', '#eeee77',
      '#dd8855', '#664400', '#ff7777', '#333333',
      '#777777', '#aaff66', '#0088ff', '#bbbbbb'
    ],
  },
  macintosh: {
    name: '1-Bit Macintosh (B&W)',
    colors: ['#000000', '#ffffff'],
  },
  amber: {
    name: 'Amber Phosphor CRT',
    colors: ['#0f0b04', '#703c00', '#c26600', '#ffb000', '#ffe49e'],
  },
  synthwave: {
    name: 'Synthwave Sunset',
    colors: ['#0d0221', '#261447', '#ff3864', '#ff71ce', '#01cdfe', '#05ffa1'],
  },
  sepia: {
    name: 'Sepia Antique',
    colors: ['#1e130c', '#4b321c', '#8a6240', '#c89d7c', '#f5e6d3'],
  },
  solarized: {
    name: 'Solarized Dark',
    colors: ['#002b36', '#073642', '#268bd2', '#2aa198', '#859900', '#b58900', '#cb4b16', '#dc322f'],
  },
  truecolor: {
    name: 'Quantized True Color',
    colors: ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'],
  },
  custom: {
    name: 'Custom User Palette',
    colors: ['#000000', '#00ff41', '#00f0ff', '#ffffff'],
  },
};

export function getPaletteRgbList(paletteName: PaletteName, customColors: string[] = []): RGBColor[] {
  if (paletteName === 'custom' && customColors.length > 0) {
    return customColors.map(hexToRgb);
  }
  const pal = PRESET_PALETTES[paletteName] || PRESET_PALETTES.gameboy;
  return pal.colors.map(hexToRgb);
}

export function getCachedPalette(paletteName: PaletteName, customColors: string[] = []): CachedPaletteColor[] {
  const rgbList = getPaletteRgbList(paletteName, customColors);
  return createCachedPalette(rgbList);
}

// Find closest color using Oklab perceptual distance
export function findClosestPaletteColor(r: number, g: number, b: number, palette: RGBColor[]): RGBColor {
  if (palette.length === 0) return { r, g, b };
  if (palette.length === 1) return palette[0];

  const targetOklab = rgbToOklab(r, g, b);
  let minDist = Infinity;
  let closest = palette[0];

  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const cOklab = rgbToOklab(c.r, c.g, c.b);
    const dist = oklabDistanceSquared(targetOklab, cOklab);
    if (dist < minDist) {
      minDist = dist;
      closest = c;
    }
  }

  return closest;
}

export function findClosestCachedPaletteColor(r: number, g: number, b: number, cachedPalette: CachedPaletteColor[]): RGBColor {
  if (cachedPalette.length === 0) return { r, g, b };
  if (cachedPalette.length === 1) return cachedPalette[0].rgb;

  const targetOklab = rgbToOklab(r, g, b);
  let minDist = Infinity;
  let closest = cachedPalette[0].rgb;

  for (let i = 0; i < cachedPalette.length; i++) {
    const c = cachedPalette[i];
    const dist = oklabDistanceSquared(targetOklab, c.oklab);
    if (dist < minDist) {
      minDist = dist;
      closest = c.rgb;
    }
  }

  return closest;
}

