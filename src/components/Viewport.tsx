'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AppOptions } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import { Maximize2, SplitSquareHorizontal, Eye, Cpu, Hash } from 'lucide-react';

interface ViewportProps {
  options: AppOptions;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stats: {
    width: number;
    height: number;
    count: number;
    unitName: string;
  };
}

export const Viewport: React.FC<ViewportProps> = ({
  options,
  canvasRef,
  sourceCanvasRef,
  stats,
}) => {
  const [splitView, setSplitView] = useState(false);
  const [splitPos, setSplitPos] = useState(50); // percentage (0 - 100)
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

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
          <span className="hud-meta">
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{stats.width} × {stats.height}</span>
          </span>
          <span className="hud-meta">
            <Hash className="w-3.5 h-3.5 text-green-400" />
            <span>{stats.count.toLocaleString()} {stats.unitName}</span>
          </span>
        </div>

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
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className={`viewport-screen-container ${options.crtEffect ? 'crt-screen-effect' : ''}`}
      >
        {/* Hidden Source Canvas */}
        <canvas ref={sourceCanvasRef} className="hidden-source-canvas" />

        {/* Target Render Canvas */}
        <div className="canvas-wrapper-center">
          <canvas
            ref={canvasRef}
            className={`main-output-canvas ${splitView ? 'split-active' : ''}`}
          />
        </div>

        {/* Split View Divider Handle */}
        {splitView && (
          <div
            className="split-divider-handle"
            style={{ left: `${splitPos}%` }}
            onPointerDown={handlePointerDown}
          >
            <div className="split-line" />
            <div className="split-knob">
              <SplitSquareHorizontal className="w-3 h-3 text-black" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
