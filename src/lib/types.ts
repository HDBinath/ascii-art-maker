export type AppMode = 'ascii' | 'dither' | 'hybrid';

export type DitherAlgorithm = 
  | 'floyd-steinberg'
  | 'atkinson'
  | 'blue-noise'
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
  | 'matrix'
  | 'braille'
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

export type UpscaleMode = 'smooth' | 'pixel' | 'edge';

export interface AppOptions {
  mode: AppMode;
  
  // Signal Pre-Processing & Common
  contrast: number; // 0.5 - 3.0
  brightness: number; // 0.5 - 2.5
  gamma: number; // 0.5 - 2.5 (default 1.0)
  invert: boolean;
  claheEnabled: boolean;
  claheClipLimit: number; // 1.0 - 5.0
  unsharpStrength: number; // 0.0 - 2.0 (high-pass edge sharpener)
  
  // Upscaling & Resolution
  upscaleFactor: number; // 1, 2, 4, 8
  upscaleMode: UpscaleMode; // 'smooth' (Bicubic) | 'pixel' (Nearest) | 'edge' (Edge-enhanced)
  exportScale: number; // 1x, 2x, 4x, 8x (HD / 4K / Print)
  
  // ASCII Specific
  columns: number; // 30 - 300
  fontSize: number; // 6 - 28
  aspectRatio: number; // 0.35 - 0.75
  autoAspectRatio: boolean; // Auto-detect glyph width/height
  charset: CharsetName;
  customCharset: string;
  asciiColorMode: 'matrix' | 'amber' | 'synthwave' | 'color' | 'bw';
  sobelEdgeInjection: boolean; // Override characters with directional edges
  sobelSensitivity: number; // 0.1 - 1.0
  dynamicFontSort: boolean; // True font density measurement
  
  // Dither Specific
  ditherAlgorithm: DitherAlgorithm;
  palette: PaletteName;
  customPaletteColors: string[];
  pixelSize: number; // 1 - 32 (downsampling factor)
  ditherAmount: number; // 0.0 - 1.5 (error diffusion strength)
  serpentineDither: boolean; // Alternating scanline traversal
  errorClamp: number; // 0.0 - 1.0 (limit bleed accumulation)
  noiseDampingFloor: number; // 0.0 - 0.2 (prevent speckle in flat backgrounds)
  colorDepthBits: number; // 1 - 8 bits per channel
  crtEffect: boolean;
  scanlines: boolean;

  // Hybrid Specific
  hybridTwoTone: boolean; // 2-color foreground + background cell quantization
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}
