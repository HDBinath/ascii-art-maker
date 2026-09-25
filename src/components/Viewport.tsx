'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AppOptions } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import { Maximize2, SplitSquareHorizontal, Hash, UploadCloud, Camera } from 'lucide-react';

interface ViewportProps {
  options: AppOptions;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasImage: boolean;
  isProcessing?: boolean;
  onUploadClick: () => void;
  onWebcamClick: () => void;
  stats: {
    width: number;
    height: number;
    count: number;
    unitName: string;
  };
}

const GLYPH_POOL = ['0', '1', '█', '#', '@', '¥', '§', '▲', '░', '▓', '▒', '✦', '⌘', 'Ø', '◈', '❖'];

export const Viewport: React.FC<ViewportProps> = ({
  options,
  canvasRef,
  sourceCanvasRef,
  hasImage,
  isProcessing = false,
  onUploadClick,
  onWebcamClick,
  stats,
}) => {
  const [splitView, setSplitView] = useState(false);
  const [splitPos, setSplitPos] = useState(50); // percentage (0 - 100)
  const [activeGlyph, setActiveGlyph] = useState('◈');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Cycle matrix glyphs when processing
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * GLYPH_POOL.length);
      setActiveGlyph(GLYPH_POOL[randomIdx]);
    }, 80);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      setSplitPos(Math.round((x / rect.width) * 100));
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div className="viewport-wrapper">
      {/* Top HUD Meta Bar */}
      <div className="viewport-hud-bar">
        <div className="hud-status-group">
          <span className="hud-badge active">
            <span className="pulse-dot" />
            <span>RENDER ENGINE: {options.mode.toUpperCase()}</span>
          </span>
          {hasImage && !isProcessing && (
            <>
              <span className="hud-meta">
                <Maximize2 className="w-3.5 h-3.5 text-neutral-300" />
                <span>{stats.width} × {stats.height}</span>
              </span>
              <span className="hud-meta">
                <Hash className="w-3.5 h-3.5 text-pink-400" />
                <span>{stats.count.toLocaleString()} {stats.unitName}</span>
              </span>
            </>
          )}
          {isProcessing && (
            <span className="hud-meta text-pink-400 animate-pulse">
              <span>PROCESSING STREAM...</span>
            </span>
          )}
        </div>

        {hasImage && !isProcessing && (
          <div className="hud-tools-group">
            <button
              type="button"
              className={`btn-hud-tab ${splitView ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setSplitView(!splitView);
              }}
              title="Toggle Split-Screen Comparison Slider"
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              <span>{splitView ? 'SPLIT VIEW' : 'FULL VIEW'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className={`viewport-screen-container ${options.crtEffect ? 'crt-screen-effect' : ''}`}
      >
        {/* Hidden Source Canvas */}
        <canvas ref={sourceCanvasRef} className="hidden-source-canvas" />

        {/* Output Canvas (ALWAYS MOUNTED so renderPipeline() never loses target canvas reference) */}
        <div
          className="canvas-wrapper-center"
          style={{
            display: hasImage ? 'flex' : 'none',
            opacity: isProcessing ? 0.3 : 1,
            transition: 'opacity 0.25s ease',
          }}
        >
          <canvas
            ref={canvasRef}
            className={`main-output-canvas ${splitView ? 'split-active' : ''}`}
          />
        </div>

        {/* Idle Dropzone */}
        {!hasImage && !isProcessing && (
          <div className="viewport-idle-dropzone" onClick={onUploadClick}>
            <div className="idle-icon-ring">
              <svg className="w-8 h-8" viewBox="0 0 66 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="33" y1="1" x2="33" y2="61" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
                <line x1="3" y1="31" x2="63" y2="31" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
                <line x1="11.8" y1="9.8" x2="54.2" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
                <line x1="54.2" y1="9.8" x2="11.8" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
              </svg>
            </div>
            <h2 className="idle-title">Drop an image here to convert</h2>
            <p className="idle-subtitle">Upload any low or high resolution photo to generate retro dithered pixel art or ASCII art</p>
            <div className="idle-quick-actions">
              <button
                type="button"
                className="btn-idle-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadClick();
                }}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Image</span>
              </button>
              <button
                type="button"
                className="btn-idle-action secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onWebcamClick();
                }}
              >
                <Camera className="w-4 h-4" />
                <span>Live Webcam</span>
              </button>
            </div>
            <span className="idle-hint">Supports PNG, JPG, WEBP, GIF, SVG</span>
          </div>
        )}

        {/* Futuristic Laser Scanning & Matrix Processing Overlay */}
        {isProcessing && (
          <div className="viewport-processing-overlay">
            <div className="processing-laser-line" />
            <div className="processing-glow-ring">
              <div className="processing-spinner" />
              <div className="processing-inner-glyph">
                <span className="matrix-char-flux">{activeGlyph}</span>
              </div>
            </div>
            <div className="processing-meta-box">
              <div className="processing-title">ORBIT NEURAL MATRIX ENGINE</div>
              <div className="processing-status-bar">
                <div className="processing-progress-bar" />
              </div>
              <div className="processing-subtitle">
                {options.mode === 'dither'
                  ? 'DIFFUSING ERROR PATTERNS...'
                  : options.mode === 'hybrid'
                  ? 'SYNTHESIZING DITHER-ASCII HYBRID PHOSPHOR...'
                  : 'MAPPING SUB-PIXEL LUMINANCE CHARACTERS...'}
              </div>
            </div>
          </div>
        )}

        {/* Split View Divider Handle */}
        {hasImage && !isProcessing && splitView && (
          <div
            className="split-divider-handle"
            style={{ left: `${splitPos}%` }}
            onPointerDown={handlePointerDown}
          >
            <div className="split-line" />
            <div className="split-knob">
              <SplitSquareHorizontal className="w-3.5 h-3.5 text-black" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

