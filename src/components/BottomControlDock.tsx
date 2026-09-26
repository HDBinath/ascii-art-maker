'use client';

import React from 'react';
import { AppOptions, CharsetName, DitherAlgorithm, PaletteName } from '@/lib/types';
import { PRESET_PALETTES } from '@/lib/palettes';
import { DENSITY_CHARSETS } from '@/lib/asciiEngine';
import { soundFx } from '@/lib/soundFx';
import {
  Layers,
  Sliders,
  Palette,
  Type,
  Wand2,
} from 'lucide-react';

interface BottomControlDockProps {
  options: AppOptions;
  setOptions: React.Dispatch<React.SetStateAction<AppOptions>>;
  onToast?: (msg: string) => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  options,
  setOptions,
}) => {
  const updateOption = <K extends keyof AppOptions>(key: K, value: AppOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handlePillClick = <K extends keyof AppOptions>(key: K, value: AppOptions[K]) => {
    soundFx.playClick();
    updateOption(key, value);
  };

  return (
    <footer className="bottom-dock-wrapper">
      <div className="bottom-dock-container">
        {/* 1. SIGNAL PRE-PROCESSING & OPTICAL CONTROLS */}
        <div className="dock-column dock-gain-col">
          <span className="dock-col-label">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> SIGNAL PRE-PROCESSING
          </span>
          <div className="dock-sliders-cluster">
            {/* Contrast */}
            <div className="dock-slider-unit">
              <div className="dock-slider-label">
                <span>CONTRAST</span>
                <span className="dock-badge">{options.contrast.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={options.contrast}
                onChange={(e) => updateOption('contrast', parseFloat(e.target.value))}
                className="dock-slider"
              />
            </div>

            {/* Brightness */}
            <div className="dock-slider-unit">
              <div className="dock-slider-label">
                <span>BRIGHTNESS</span>
                <span className="dock-badge">{options.brightness.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={options.brightness}
                onChange={(e) => updateOption('brightness', parseFloat(e.target.value))}
                className="dock-slider"
              />
            </div>

            {/* Gamma Curve */}
            <div className="dock-slider-unit">
              <div className="dock-slider-label">
                <span>GAMMA (γ)</span>
                <span className="dock-badge">{options.gamma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={options.gamma}
                onChange={(e) => updateOption('gamma', parseFloat(e.target.value))}
                className="dock-slider"
                title="Non-linear gamma curve to lift midtones without washing highlights"
              />
            </div>

            {/* Unsharp Mask (Edge Sharpener) */}
            <div className="dock-slider-unit">
              <div className="dock-slider-label">
                <span>SHARPEN</span>
                <span className="dock-badge">{options.unsharpStrength > 0 ? `${(options.unsharpStrength * 100).toFixed(0)}%` : 'OFF'}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={options.unsharpStrength}
                onChange={(e) => updateOption('unsharpStrength', parseFloat(e.target.value))}
                className="dock-slider"
                title="Unsharp mask high-pass edge sharpener"
              />
            </div>

            {/* Checkboxes: CLAHE & Invert */}
            <div className="flex items-center gap-3 mt-1">
              <label className="dock-checkbox-label">
                <input
                  type="checkbox"
                  checked={options.claheEnabled}
                  onChange={(e) => {
                    soundFx.playClick();
                    updateOption('claheEnabled', e.target.checked);
                  }}
                  className="dock-check-input"
                />
                <span className="dock-checkbox-box" />
                <span title="Contrast Limited Adaptive Histogram Equalization for micro-detail enhancement">CLAHE</span>
              </label>

              <label className="dock-checkbox-label">
                <input
                  type="checkbox"
                  checked={options.invert}
                  onChange={(e) => {
                    soundFx.playClick();
                    updateOption('invert', e.target.checked);
                  }}
                  className="dock-check-input"
                />
                <span className="dock-checkbox-box" />
                <span>INVERT</span>
              </label>
            </div>
          </div>
        </div>

        <div className="dock-divider" />

        {/* 2. DYNAMIC MODE ENGINE CONTROLS */}
        {options.mode === 'dither' ? (
          <>
            {/* Dither Algorithm & Error Diffusion Controls */}
            <div className="dock-column dock-main-controls-col">
              <span className="dock-col-label">
                <Layers className="w-3.5 h-3.5 text-pink-400" /> DITHER ALGORITHM & DIFFUSION
              </span>
              <div className="dock-pill-scroll">
                {(
                  [
                    ['floyd-steinberg', 'Floyd-Steinberg'],
                    ['atkinson', 'Atkinson (Mac)'],
                    ['blue-noise', 'Blue Noise (64×64)'],
                    ['bayer-4', 'Bayer 4×4'],
                    ['bayer-8', 'Bayer 8×8'],
                    ['sierra', 'Sierra Lite'],
                    ['burkes', 'Burkes'],
                    ['halftone', 'Halftone Dots'],
                    ['noise', 'White Noise'],
                    ['threshold', 'Threshold'],
                  ] as [DitherAlgorithm, string][]
                ).map(([algo, label]) => (
                  <button
                    key={algo}
                    type="button"
                    className={`dock-pill-btn ${options.ditherAlgorithm === algo ? 'active' : ''}`}
                    onClick={() => handlePillClick('ditherAlgorithm', algo)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="dock-sliders-cluster mt-1">
                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>PIXEL SIZE</span>
                    <span className="dock-badge">{options.pixelSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    step="1"
                    value={options.pixelSize}
                    onChange={(e) => updateOption('pixelSize', parseInt(e.target.value))}
                    className="dock-slider"
                  />
                </div>

                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>DIFFUSION</span>
                    <span className="dock-badge">{Math.round(options.ditherAmount * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.05"
                    value={options.ditherAmount}
                    onChange={(e) => updateOption('ditherAmount', parseFloat(e.target.value))}
                    className="dock-slider"
                  />
                </div>

                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>ERROR CLAMP</span>
                    <span className="dock-badge">{Math.round(options.errorClamp * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={options.errorClamp}
                    onChange={(e) => updateOption('errorClamp', parseFloat(e.target.value))}
                    className="dock-slider"
                    title="Clamp maximum error bleed accumulation"
                  />
                </div>

                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>NOISE FLOOR</span>
                    <span className="dock-badge">{(options.noiseDampingFloor * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.15"
                    step="0.01"
                    value={options.noiseDampingFloor}
                    onChange={(e) => updateOption('noiseDampingFloor', parseFloat(e.target.value))}
                    className="dock-slider"
                    title="Skip error diffusion on flat uniform background areas"
                  />
                </div>

                {/* Serpentine Scan Toggle */}
                <label className="dock-checkbox-label mt-0.5">
                  <input
                    type="checkbox"
                    checked={options.serpentineDither}
                    onChange={(e) => {
                      soundFx.playClick();
                      updateOption('serpentineDither', e.target.checked);
                    }}
                    className="dock-check-input"
                  />
                  <span className="dock-checkbox-box" />
                  <span title="Alternate scanline direction every row to eliminate diagonal artifacts">SERPENTINE SCAN</span>
                </label>
              </div>
            </div>

            <div className="dock-divider" />

            {/* Dither Palette Selector */}
            <div className="dock-column dock-palettes-col">
              <span className="dock-col-label">
                <Palette className="w-3.5 h-3.5 text-amber-400" /> OKLAB COLOR PALETTES
              </span>
              <div className="dock-palettes-scroll">
                {(Object.keys(PRESET_PALETTES) as PaletteName[]).map((palKey) => {
                  const pal = PRESET_PALETTES[palKey];
                  return (
                    <button
                      key={palKey}
                      type="button"
                      className={`dock-pal-card ${options.palette === palKey ? 'active' : ''}`}
                      onClick={() => handlePillClick('palette', palKey)}
                    >
                      <span className="dock-pal-title">{pal.name.split(' (')[0]}</span>
                      <div className="dock-pal-swatches">
                        {pal.colors.slice(0, 4).map((c, i) => (
                          <span key={i} className="dock-swatch" style={{ background: c }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : options.mode === 'hybrid' ? (
          <>
            {/* Dither-ASCII Hybrid Controls */}
            <div className="dock-column dock-main-controls-col">
              <span className="dock-col-label">
                <Wand2 className="w-3.5 h-3.5 text-pink-400" /> DITHER-ASCII HYBRID PHOSPHOR
              </span>
              <div className="dock-sliders-cluster">
                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>COLUMNS</span>
                    <span className="dock-badge">{options.columns}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="240"
                    step="2"
                    value={options.columns}
                    onChange={(e) => updateOption('columns', parseInt(e.target.value))}
                    className="dock-slider"
                  />
                </div>

                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>FONT SIZE</span>
                    <span className="dock-badge">{options.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="24"
                    step="1"
                    value={options.fontSize}
                    onChange={(e) => updateOption('fontSize', parseInt(e.target.value))}
                    className="dock-slider"
                  />
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <label className="dock-checkbox-label">
                    <input
                      type="checkbox"
                      checked={options.hybridTwoTone}
                      onChange={(e) => {
                        soundFx.playClick();
                        updateOption('hybridTwoTone', e.target.checked);
                      }}
                      className="dock-check-input"
                    />
                    <span className="dock-checkbox-box" />
                    <span title="2-color k-means quantization per character cell">2-TONE CELL QUANTIZATION</span>
                  </label>

                  <label className="dock-checkbox-label">
                    <input
                      type="checkbox"
                      checked={options.autoAspectRatio}
                      onChange={(e) => {
                        soundFx.playClick();
                        updateOption('autoAspectRatio', e.target.checked);
                      }}
                      className="dock-check-input"
                    />
                    <span className="dock-checkbox-box" />
                    <span>AUTO RATIO</span>
                  </label>
                </div>
              </div>

              {/* Charset Ramp Pills */}
              <div className="dock-pill-scroll mt-1">
                {(Object.keys(DENSITY_CHARSETS) as CharsetName[]).map((cName) => (
                  <button
                    key={cName}
                    type="button"
                    className={`dock-pill-btn ${options.charset === cName ? 'active' : ''}`}
                    onClick={() => handlePillClick('charset', cName)}
                  >
                    {cName.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="dock-divider" />

            {/* Hybrid Palette Selector */}
            <div className="dock-column dock-palettes-col">
              <span className="dock-col-label">
                <Palette className="w-3.5 h-3.5 text-amber-400" /> CHROMINANCE PALETTES
              </span>
              <div className="dock-palettes-scroll">
                {(Object.keys(PRESET_PALETTES) as PaletteName[]).map((palKey) => {
                  const pal = PRESET_PALETTES[palKey];
                  return (
                    <button
                      key={palKey}
                      type="button"
                      className={`dock-pal-card ${options.palette === palKey ? 'active' : ''}`}
                      onClick={() => handlePillClick('palette', palKey)}
                    >
                      <span className="dock-pal-title">{pal.name.split(' (')[0]}</span>
                      <div className="dock-pal-swatches">
                        {pal.colors.slice(0, 4).map((c, i) => (
                          <span key={i} className="dock-swatch" style={{ background: c }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ASCII Grid & Optical Edge Controls */}
            <div className="dock-column dock-main-controls-col">
              <span className="dock-col-label">
                <Type className="w-3.5 h-3.5 text-green-400" /> ASCII GRID & EDGE INJECTION
              </span>
              <div className="dock-sliders-cluster">
                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>COLUMNS</span>
                    <span className="dock-badge">{options.columns}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="2"
                    value={options.columns}
                    onChange={(e) => updateOption('columns', parseInt(e.target.value))}
                    className="dock-slider"
                  />
                </div>

                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>FONT SIZE</span>
                    <span className="dock-badge">{options.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="24"
                    step="1"
                    value={options.fontSize}
                    onChange={(e) => updateOption('fontSize', parseInt(e.target.value))}
                    className="dock-slider"
                  />
                </div>

                {!options.autoAspectRatio && (
                  <div className="dock-slider-unit">
                    <div className="dock-slider-label">
                      <span>MANUAL RATIO</span>
                      <span className="dock-badge">{options.aspectRatio.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.35"
                      max="0.75"
                      step="0.01"
                      value={options.aspectRatio}
                      onChange={(e) => updateOption('aspectRatio', parseFloat(e.target.value))}
                      className="dock-slider"
                    />
                  </div>
                )}

                {/* Sobel Sensitivity */}
                {options.sobelEdgeInjection && (
                  <div className="dock-slider-unit">
                    <div className="dock-slider-label">
                      <span>EDGE SENSITIVITY</span>
                      <span className="dock-badge">{Math.round(options.sobelSensitivity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={options.sobelSensitivity}
                      onChange={(e) => updateOption('sobelSensitivity', parseFloat(e.target.value))}
                      className="dock-slider"
                      title="Sensitivity threshold for directional edge character insertion"
                    />
                  </div>
                )}

                {/* Checkboxes: Auto Ratio, Sobel Edge, Font Sort */}
                <div className="flex items-center gap-3 mt-1">
                  <label className="dock-checkbox-label">
                    <input
                      type="checkbox"
                      checked={options.autoAspectRatio}
                      onChange={(e) => {
                        soundFx.playClick();
                        updateOption('autoAspectRatio', e.target.checked);
                      }}
                      className="dock-check-input"
                    />
                    <span className="dock-checkbox-box" />
                    <span title="Auto-detect exact font width-to-height ratio from offscreen canvas">AUTO RATIO</span>
                  </label>

                  <label className="dock-checkbox-label">
                    <input
                      type="checkbox"
                      checked={options.sobelEdgeInjection}
                      onChange={(e) => {
                        soundFx.playClick();
                        updateOption('sobelEdgeInjection', e.target.checked);
                      }}
                      className="dock-check-input"
                    />
                    <span className="dock-checkbox-box" />
                    <span title="Inject directional line characters along strong contours">SOBEL EDGES</span>
                  </label>

                  <label className="dock-checkbox-label">
                    <input
                      type="checkbox"
                      checked={options.dynamicFontSort}
                      onChange={(e) => {
                        soundFx.playClick();
                        updateOption('dynamicFontSort', e.target.checked);
                      }}
                      className="dock-check-input"
                    />
                    <span className="dock-checkbox-box" />
                    <span title="Sort ramp dynamically by measuring actual glyph pixel fill ratio">FONT PROFILER</span>
                  </label>
                </div>
              </div>

              {/* Charset Ramp Pills */}
              <div className="dock-pill-scroll mt-1">
                {(Object.keys(DENSITY_CHARSETS) as CharsetName[]).map((cName) => (
                  <button
                    key={cName}
                    type="button"
                    className={`dock-pill-btn ${options.charset === cName ? 'active' : ''}`}
                    onClick={() => handlePillClick('charset', cName)}
                  >
                    {cName === 'braille' ? '⠃ BRAILLE (4X)' : cName.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="dock-divider" />

            {/* ASCII Themes */}
            <div className="dock-column dock-theme-col">
              <span className="dock-col-label">
                <Palette className="w-3.5 h-3.5 text-pink-400" /> COLOR THEME
              </span>
              <div className="dock-theme-grid">
                {(
                  [
                    ['matrix', 'Matrix Phosphor'],
                    ['amber', 'Amber CRT'],
                    ['synthwave', 'Synthwave Neon'],
                    ['color', 'RGB Full Color'],
                    ['bw', 'Monochrome B&W'],
                  ] as const
                ).map(([tMode, label]) => (
                  <button
                    key={tMode}
                    type="button"
                    className={`dock-theme-btn ${options.asciiColorMode === tMode ? 'active' : ''}`}
                    onClick={() => handlePillClick('asciiColorMode', tMode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  );
};
