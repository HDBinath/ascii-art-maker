export type AppMode = 'ascii' | 'dither' | 'hybrid';

export type DitherAlgorithm = 
  | 'floyd-steinberg'
  | 'atkinson'
  | 'bayer-4'
  | 'bayer-8'
  | 'sierra'
  | 'burkes'
  | 'halftone'
  | 'threshold'
  | 'noise';

export type CharsetName = 
  | 'simple'
  | 'cyberpunk'
  | 'blocks'
  | 'binary'
  | 'detailed'
  | 'braille'
  | 'matrix'
  | 'custom';

export type PaletteName = 
  | 'gameboy'
  | 'cyberpunk'
  | 'cga'
  | 'pico8'
  | 'c64'
  | 'macintosh'
  | 'amber'
  | 'synthwave'
  | 'sepia'
  | 'solarized'
  | 'truecolor'
  | 'custom';

export interface AppOptions {
  mode: AppMode;
  // Common
  contrast: number; // 0.5 - 3.0
  brightness: number; // 0.5 - 2.5
  invert: boolean;
  
  // ASCII Specific
  columns: number; // 30 - 240
  fontSize: number; // 6 - 28
  aspectRatio: number; // 0.35 - 0.75
  charset: CharsetName;
  customCharset: string;
  asciiColorMode: 'matrix' | 'amber' | 'synthwave' | 'color' | 'bw';
  
  // Dither Specific
  ditherAlgorithm: DitherAlgorithm;
  palette: PaletteName;
  customPaletteColors: string[];
  pixelSize: number; // 1 - 32 (downsampling factor)
  ditherAmount: number; // 0.0 - 1.0 (error diffusion strength)
  colorDepthBits: number; // 1 - 8 bits per channel
  crtEffect: boolean;
  scanlines: boolean;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}
