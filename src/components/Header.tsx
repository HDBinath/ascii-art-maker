'use client';

import React from 'react';
import { AppMode } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import { Terminal, Sparkles, Tv, Volume2, VolumeX, Eye, Flame, Binary } from 'lucide-react';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  crtEnabled: boolean;
  setCrtEnabled: (enabled: boolean) => void;
  onLoadSample: (sampleType: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  audioEnabled,
  setAudioEnabled,
  crtEnabled,
  setCrtEnabled,
  onLoadSample,
}) => {
  const handleModeChange = (newMode: AppMode) => {
    soundFx.playClick();
    setMode(newMode);
  };

  const handleAudioToggle = () => {
    const next = !audioEnabled;
    soundFx.enabled = next;
    setAudioEnabled(next);
    if (next) {
      soundFx.playPower();
    }
  };

  const handleCrtToggle = () => {
    soundFx.playClick();
    setCrtEnabled(!crtEnabled);
  };

  return (
    <header className="cyber-header">
      <div className="header-left">
        <div className="brand-badge">
          <span className="brand-title">CYBER::STUDIO</span>
          <span className="brand-tag">v2.0 // NEURAL_PIXEL</span>
        </div>

        {/* Mode Switcher Tabs */}
        <nav className="mode-nav-tabs">
          <button
            type="button"
            className={`tab-btn ${mode === 'ascii' ? 'active' : ''}`}
            onClick={() => handleModeChange('ascii')}
          >
            <Terminal className="w-4 h-4" />
            <span>ASCII ART</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'dither' ? 'active' : ''}`}
            onClick={() => handleModeChange('dither')}
          >
            <Flame className="w-4 h-4" />
            <span>DITHERED PIXELS</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'hybrid' ? 'active' : ''}`}
            onClick={() => handleModeChange('hybrid')}
          >
            <Binary className="w-4 h-4" />
            <span>DITHER-ASCII HYBRID</span>
          </button>
        </nav>
      </div>

      <div className="header-right">
        {/* Preset Samples */}
        <div className="sample-presets-group">
          <span className="group-label"><Sparkles className="w-3.5 h-3.5" /> SAMPLES:</span>
          <button type="button" className="btn-chip" onClick={() => { soundFx.playClick(); onLoadSample('cyber-cat'); }}>Cyber-Cat</button>
          <button type="button" className="btn-chip" onClick={() => { soundFx.playClick(); onLoadSample('skull'); }}>Skull</button>
          <button type="button" className="btn-chip" onClick={() => { soundFx.playClick(); onLoadSample('matrix-neo'); }}>Grid</button>
          <button type="button" className="btn-chip" onClick={() => { soundFx.playClick(); onLoadSample('synthwave'); }}>Synthwave</button>
        </div>

        <div className="header-divider" />

        {/* CRT Scanline Toggle */}
        <button
          type="button"
          className={`btn-utility ${crtEnabled ? 'active' : ''}`}
          onClick={handleCrtToggle}
          title="Toggle CRT Scanlines & Glow"
        >
          <Tv className="w-4 h-4" />
          <span>CRT FX</span>
        </button>

        {/* Audio Toggle */}
        <button
          type="button"
          className={`btn-utility ${audioEnabled ? 'active' : ''}`}
          onClick={handleAudioToggle}
          title="Toggle Web Audio Synthesizer FX"
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>SFX</span>
        </button>
      </div>
    </header>
  );
};
