'use client';

import React from 'react';
import { AppOptions, CharsetName, DitherAlgorithm, PaletteName } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import { PRESET_PALETTES } from '@/lib/palettes';
import { DENSITY_CHARSETS } from '@/lib/asciiEngine';
import {
  Sliders,
  Type,
  Grid,
  Sun,
  Contrast,
  Scaling,
  Palette,
  Binary,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ControlDeckProps {
  options: AppOptions;
  setOptions: React.Dispatch<React.SetStateAction<AppOptions>>;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({ options, setOptions }) => {
  const updateOption = <K extends keyof AppOptions>(key: K, value: AppOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handlePillClick = <K extends keyof AppOptions>(key: K, value: AppOptions[K]) => {
    soundFx.playClick();
    updateOption(key, value);
  };

  return (
    <div className="control-deck-container">
      {/* Universal Adjustments (Contrast, Brightness, Invert) */}
      <div className="control-group">
        <div className="group-heading">
          <Sliders className="w-3.5 h-3.5 text-green-400" />
          <span>IMAGE SIGNAL GAIN</span>
        </div>

        <div className="slider-item">
          <div className="slider-header">
            <label><Contrast className="w-3 h-3" /> CONTRAST</label>
            <span className="slider-badge">{options.contrast.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={options.contrast}
            onChange={(e) => updateOption('contrast', parseFloat(e.target.value))}
            className="hud-slider"
          />
        </div>

        <div className="slider-item">
          <div className="slider-header">
            <label><Sun className="w-3 h-3" /> BRIGHTNESS</label>
            <span className="slider-badge">{options.brightness.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={options.brightness}
            onChange={(e) => updateOption('brightness', parseFloat(e.target.value))}
            className="hud-slider"
          />
        </div>

        <div className="toggle-checkbox-row">
          <label className="cyber-checkbox-label">
            <input
              type="checkbox"
              checked={options.invert}
              onChange={(e) => {
                soundFx.playClick();
                updateOption('invert', e.target.checked);
              }}
              className="cyber-check"
            />
            <span className="check-box-styled" />
            <span>INVERT LUMINANCE</span>
          </label>
        </div>
      </div>

      {/* DITHER PIXEL ART CONTROLS */}
      {options.mode === 'dither' && (
        <div className="control-group animate-fade-in">
          <div className="group-heading">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>DITHERING ALGORITHM</span>
          </div>

          <div className="pill-grid">
            {(
              [
                ['floyd-steinberg', 'Floyd-Steinberg'],
                ['atkinson', 'Atkinson (Mac)'],
                ['bayer-4', 'Bayer 4×4'],
                ['bayer-8', 'Bayer 8×8'],
                ['sierra', 'Sierra Lite'],
                ['burkes', 'Burkes'],
                ['halftone', 'Halftone Dots'],
                ['noise', 'Blue Noise'],
                ['threshold', 'Threshold'],
              ] as [DitherAlgorithm, string][]
            ).map(([algo, label]) => (
              <button
                key={algo}
                type="button"
                className={`hud-pill-btn ${options.ditherAlgorithm === algo ? 'active' : ''}`}
                onClick={() => handlePillClick('ditherAlgorithm', algo)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="slider-item mt-3">
            <div className="slider-header">
              <label><Grid className="w-3 h-3" /> PIXEL SCALE (BLOCK SIZE)</label>
              <span className="slider-badge">{options.pixelSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              step="1"
              value={options.pixelSize}
              onChange={(e) => updateOption('pixelSize', parseInt(e.target.value))}
              className="hud-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-header">
              <label><Sparkles className="w-3 h-3" /> DITHER INTENSITY</label>
              <span className="slider-badge">{Math.round(options.ditherAmount * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={options.ditherAmount}
              onChange={(e) => updateOption('ditherAmount', parseFloat(e.target.value))}
              className="hud-slider"
            />
          </div>

          {/* PALETTES */}
          <div className="group-heading mt-4">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span>COLOR PALETTES</span>
          </div>

          <div className="palette-buttons-grid">
            {(Object.keys(PRESET_PALETTES) as PaletteName[]).map((palKey) => {
              const pal = PRESET_PALETTES[palKey];
              return (
                <button
                  key={palKey}
                  type="button"
                  className={`palette-card-btn ${options.palette === palKey ? 'active' : ''}`}
                  onClick={() => handlePillClick('palette', palKey)}
                >
                  <span className="pal-name">{pal.name.split(' (')[0]}</span>
                  <div className="pal-swatches">
                    {pal.colors.slice(0, 5).map((color, idx) => (
                      <span key={idx} className="swatch" style={{ background: color }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ASCII & HYBRID CONTROLS */}
      {(options.mode === 'ascii' || options.mode === 'hybrid') && (
        <div className="control-group animate-fade-in">
          <div className="group-heading">
            <Type className="w-3.5 h-3.5 text-green-400" />
            <span>ASCII GRID RESOLUTION</span>
          </div>

          <div className="slider-item">
            <div className="slider-header">
              <label><Grid className="w-3 h-3" /> COLUMNS</label>
              <span className="slider-badge">{options.columns}</span>
            </div>
            <input
              type="range"
              min="30"
              max="240"
              step="2"
              value={options.columns}
              onChange={(e) => updateOption('columns', parseInt(e.target.value))}
              className="hud-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-header">
              <label><Type className="w-3 h-3" /> FONT SIZE</label>
              <span className="slider-badge">{options.fontSize}px</span>
            </div>
            <input
              type="range"
              min="6"
              max="24"
              step="1"
              value={options.fontSize}
              onChange={(e) => updateOption('fontSize', parseInt(e.target.value))}
              className="hud-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-header">
              <label><Scaling className="w-3 h-3" /> CHAR ASPECT RATIO</label>
              <span className="slider-badge">{options.aspectRatio.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.35"
              max="0.75"
              step="0.01"
              value={options.aspectRatio}
              onChange={(e) => updateOption('aspectRatio', parseFloat(e.target.value))}
              className="hud-slider"
            />
          </div>

          {/* Character Ramps */}
          <div className="group-heading mt-4">
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span>CHARACTER RAMP</span>
          </div>

          <div className="pill-grid">
            {(Object.keys(DENSITY_CHARSETS) as CharsetName[]).map((cName) => (
              <button
                key={cName}
                type="button"
                className={`hud-pill-btn ${options.charset === cName ? 'active' : ''}`}
                onClick={() => handlePillClick('charset', cName)}
              >
                {cName.toUpperCase()}
              </button>
            ))}
          </div>

          {options.charset === 'custom' && (
            <div className="custom-input-box mt-2">
              <input
                type="text"
                value={options.customCharset}
                onChange={(e) => updateOption('customCharset', e.target.value)}
                placeholder="Enter chars from dark -> bright (e.g.  .:=*#@)"
                className="hud-text-input"
              />
            </div>
          )}

          {/* Color Palettes for ASCII */}
          <div className="group-heading mt-4">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span>ASCII THEME</span>
          </div>

          <div className="pill-grid">
            {(
              [
                ['matrix', 'Matrix Phosphor (#00ff41)'],
                ['amber', 'Retro Amber CRT (#ffb000)'],
                ['synthwave', 'Synthwave Neon'],
                ['color', 'RGB Full Color'],
                ['bw', 'Monochrome B&W'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`hud-pill-btn ${options.asciiColorMode === mode ? 'active' : ''}`}
                onClick={() => handlePillClick('asciiColorMode', mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
