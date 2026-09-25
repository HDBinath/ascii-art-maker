'use client';

import React, { useRef } from 'react';
import { AppOptions, CharsetName, DitherAlgorithm, PaletteName, UpscaleMode } from '@/lib/types';
import { PRESET_PALETTES } from '@/lib/palettes';
import { DENSITY_CHARSETS } from '@/lib/asciiEngine';
import { generateHighResExportCanvas, exportCanvasToBlob } from '@/lib/upscaleHelper';
import { soundFx } from '@/lib/soundFx';
import {
  UploadCloud,
  Camera,
  Contrast,
  Sun,
  Grid,
  Type,
  Scaling,
  Layers,
  Sparkles,
  Download,
  FileText,
  Code,
  Copy,
  Sliders,
  Palette,
  Binary,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BottomControlDockProps {
  options: AppOptions;
  setOptions: React.Dispatch<React.SetStateAction<AppOptions>>;
  sourceType: 'upload' | 'webcam';
  setSourceType: (type: 'upload' | 'webcam') => void;
  onFileUpload: (file: File) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  plainText: string;
  htmlContent: string;
  onToast: (msg: string) => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  options,
  setOptions,
  sourceType,
  setSourceType,
  onFileUpload,
  canvasRef,
  plainText,
  htmlContent,
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateOption = <K extends keyof AppOptions>(key: K, value: AppOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handlePillClick = <K extends keyof AppOptions>(key: K, value: AppOptions[K]) => {
    soundFx.playClick();
    updateOption(key, value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.85 },
        colors: ['#ffc5dc', '#fd86db', '#ffffff', '#ff94e0', '#fce7f3'],
      });
    } catch {}
  };

  const handleDownloadPng = async () => {
    if (!canvasRef.current) return;
    soundFx.playScan();
    triggerConfetti();
    onToast(`Generating ${options.exportScale}x High-Res PNG...`);

    try {
      // Generate high-resolution export canvas scaled by options.exportScale (up to 8K)
      const exportCanvas = generateHighResExportCanvas(canvasRef.current, options.exportScale);
      const blob = await exportCanvasToBlob(exportCanvas);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const scaleLabel = options.exportScale > 1 ? `_${options.exportScale}x_HD` : '';
      link.download = `orbit_${options.mode}${scaleLabel}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const fileSizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      onToast(`PNG Downloaded (${options.exportScale}x: ${exportCanvas.width}×${exportCanvas.height}px, ${fileSizeMb} MB)!`);
    } catch (err) {
      console.error('High-res export failed:', err);
      onToast('Export failed: Image resolution exceeds system memory.');
    }
  };

  const handleDownloadTxt = () => {
    if (!plainText) {
      onToast('No ASCII text available to export.');
      return;
    }
    soundFx.playScan();
    triggerConfetti();

    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyber_ascii_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onToast('Plain Text File Saved!');
  };

  const handleDownloadHtml = () => {
    if (!htmlContent) {
      onToast('No HTML document available.');
      return;
    }
    soundFx.playScan();
    triggerConfetti();

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyber_ascii_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onToast('Standalone HTML Webpage Exported!');
  };

  const handleCopyClipboard = () => {
    if (!plainText) {
      onToast('No text available to copy.');
      return;
    }
    soundFx.playClick();
    navigator.clipboard.writeText(plainText)
      .then(() => onToast('Copied ASCII Art to Clipboard!'))
      .catch(() => onToast('Clipboard access denied.'));
  };

  return (
    <footer className="bottom-dock-wrapper">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="bottom-dock-container">
        {/* 1. SOURCE & UPSCALE SELECTOR */}
        <div className="dock-column dock-source-col">
          <span className="dock-col-label"><UploadCloud className="w-3.5 h-3.5 text-green-400" /> SOURCE & UPSCALE</span>
          <div className="dock-button-stack">
            <button
              type="button"
              className={`dock-btn ${sourceType === 'upload' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setSourceType('upload');
                fileInputRef.current?.click();
              }}
              title="Upload New Image File"
            >
              <UploadCloud className="w-4 h-4" />
              <span>UPLOAD IMAGE</span>
            </button>

            <button
              type="button"
              className={`dock-btn ${sourceType === 'webcam' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setSourceType(sourceType === 'webcam' ? 'upload' : 'webcam');
              }}
              title="Toggle Live Webcam Feed"
            >
              <Camera className="w-4 h-4" />
              <span>{sourceType === 'webcam' ? 'STOP WEBCAM' : 'START WEBCAM'}</span>
            </button>
          </div>

          {/* Source Upscale Factor Chips */}
          <div className="dock-upscale-chips mt-1">
            <span className="dock-sub-label">INPUT SCALE:</span>
            {[1, 2, 4, 8].map((factor) => (
              <button
                key={factor}
                type="button"
                className={`dock-chip-btn ${options.upscaleFactor === factor ? 'active' : ''}`}
                onClick={() => handlePillClick('upscaleFactor', factor)}
                title={`Upscale source image by ${factor}x before conversion`}
              >
                {factor}x
              </button>
            ))}
          </div>
        </div>

        <div className="dock-divider" />

        {/* 2. SIGNAL GAIN CONTROLS */}
        <div className="dock-column dock-gain-col">
          <span className="dock-col-label"><Sliders className="w-3.5 h-3.5 text-cyan-400" /> SIGNAL GAIN</span>
          <div className="dock-sliders-cluster">
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

          {/* Upscale Resampling Mode */}
          <div className="dock-upscale-chips mt-1">
            <span className="dock-sub-label">UPSCALE MODE:</span>
            {(
              [
                ['smooth', 'Bicubic (Photo)'],
                ['pixel', 'Nearest (Pixel Art)'],
                ['edge', 'Edge Sharpened'],
              ] as [UpscaleMode, string][]
            ).map(([uMode, label]) => (
              <button
                key={uMode}
                type="button"
                className={`dock-chip-btn ${options.upscaleMode === uMode ? 'active' : ''}`}
                onClick={() => handlePillClick('upscaleMode', uMode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="dock-divider" />

        {/* 3. DYNAMIC MODE ENGINE CONTROLS */}
        {options.mode === 'dither' ? (
          <>
            {/* Dither Algorithm & Sliders */}
            <div className="dock-column dock-main-controls-col">
              <span className="dock-col-label"><Layers className="w-3.5 h-3.5 text-pink-400" /> DITHER ALGORITHM</span>
              <div className="dock-pill-scroll">
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
              </div>
            </div>

            <div className="dock-divider" />

            {/* Dither Palette Selector */}
            <div className="dock-column dock-palettes-col">
              <span className="dock-col-label"><Palette className="w-3.5 h-3.5 text-amber-400" /> COLOR PALETTES</span>
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
            {/* ASCII & Hybrid Grid Controls */}
            <div className="dock-column dock-main-controls-col">
              <span className="dock-col-label"><Type className="w-3.5 h-3.5 text-green-400" /> ASCII GRID & CHARACTERS</span>
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

                <div className="dock-slider-unit">
                  <div className="dock-slider-label">
                    <span>RATIO</span>
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

            {/* ASCII Themes */}
            <div className="dock-column dock-theme-col">
              <span className="dock-col-label"><Palette className="w-3.5 h-3.5 text-pink-400" /> COLOR THEME</span>
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

        <div className="dock-divider" />

        {/* 4. EXPORT HUB & HIGH-RES SCALE */}
        <div className="dock-column dock-export-col">
          <span className="dock-col-label"><Download className="w-3.5 h-3.5 text-green-400" /> EXPORT & HIGH-RES</span>
          <div className="dock-button-stack">
            <button
              type="button"
              className="dock-export-btn primary"
              onClick={handleDownloadPng}
              title={`Download rendered image at ${options.exportScale}x High-Resolution PNG`}
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD PNG ({options.exportScale}x)</span>
            </button>

            {(options.mode === 'ascii' || options.mode === 'hybrid') && (
              <div className="dock-sub-actions-row">
                <button
                  type="button"
                  className="dock-export-btn secondary"
                  onClick={handleDownloadTxt}
                  title="Save .TXT plain text file"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>.TXT</span>
                </button>
                <button
                  type="button"
                  className="dock-export-btn secondary"
                  onClick={handleDownloadHtml}
                  title="Export styled .HTML webpage"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>.HTML</span>
                </button>
                <button
                  type="button"
                  className="dock-export-btn secondary"
                  onClick={handleCopyClipboard}
                  title="Copy ASCII text to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY</span>
                </button>
              </div>
            )}
          </div>

          {/* Export Scale Multiplier */}
          <div className="dock-upscale-chips mt-1">
            <span className="dock-sub-label">OUTPUT RES:</span>
            {[
              [1, '1x'],
              [2, '2x HD'],
              [4, '4x 4K'],
              [8, '8x Max'],
            ].map(([scale, label]) => (
              <button
                key={scale}
                type="button"
                className={`dock-chip-btn ${options.exportScale === scale ? 'active' : ''}`}
                onClick={() => handlePillClick('exportScale', scale as number)}
                title={`Export downloadable image at ${scale}x scale`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
