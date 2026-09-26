import { RGBColor } from './types';

export interface OklabColor {
  L: number;
  a: number;
  b: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

// Pre-computed sRGB to Linear RGB lookup table for 0..255
const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  SRGB_TO_LINEAR[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Convert 8-bit sRGB (0-255) to Oklab color space
 */
export function rgbToOklab(r: number, g: number, b: number): OklabColor {
  const rLin = SRGB_TO_LINEAR[Math.max(0, Math.min(255, Math.round(r)))];
  const gLin = SRGB_TO_LINEAR[Math.max(0, Math.min(255, Math.round(g)))];
  const bLin = SRGB_TO_LINEAR[Math.max(0, Math.min(255, Math.round(b)))];

  const l = Math.cbrt(0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin);
  const m = Math.cbrt(0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin);
  const s = Math.cbrt(0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin);

  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

/**
 * Perceptual color distance in Oklab space
 */
export function oklabDistanceSquared(c1: OklabColor, c2: OklabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  // Weight L (lightness) slightly higher for retro dither clarity
  return 1.5 * dL * dL + da * da + db * db;
}

/**
 * Convert 8-bit sRGB to CIELAB (D65 standard illuminant)
 */
export function rgbToLab(r: number, g: number, b: number): LabColor {
  const rLin = SRGB_TO_LINEAR[Math.max(0, Math.min(255, Math.round(r)))];
  const gLin = SRGB_TO_LINEAR[Math.max(0, Math.min(255, Math.round(g)))];
  const bLin = SRGB_TO_LINEAR[Math.max(0, Math.min(255, Math.round(b)))];

  // sRGB D65 to XYZ
  let x = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
  let y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin;
  let z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin;

  // Normalize for D65 white point
  x /= 0.95047;
  y /= 1.00000;
  z /= 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export interface CachedPaletteColor {
  rgb: RGBColor;
  oklab: OklabColor;
}

/**
 * Cache palette colors with pre-calculated Oklab coordinates for ultra-fast matching
 */
export function createCachedPalette(colors: RGBColor[]): CachedPaletteColor[] {
  return colors.map(rgb => ({
    rgb,
    oklab: rgbToOklab(rgb.r, rgb.g, rgb.b),
  }));
}
