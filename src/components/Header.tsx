'use client';

import React from 'react';
import { AppMode } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import Link from 'next/link';
import { Terminal, Tv, Volume2, VolumeX, Flame, Binary, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { Show, UserButton } from '@clerk/nextjs';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  crtEnabled: boolean;
  setCrtEnabled: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  audioEnabled,
  setAudioEnabled,
  crtEnabled,
  setCrtEnabled,
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
        <Link href="/" className="btn-utility" title="Return to Landing Page">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>

        {/* Orbit Brand Mark & Title */}
        <div className="brand-badge">
          <svg className="brand-asterisk-icon" viewBox="0 0 66 62" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="33" y1="1" x2="33" y2="61" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="3" y1="31" x2="63" y2="31" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="11.8" y1="9.8" x2="54.2" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="54.2" y1="9.8" x2="11.8" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
          </svg>
          <div className="brand-title">
            <span className="brand-title-white">OR</span>
            <span className="brand-title-pink">BIT</span>
          </div>
          <span className="brand-tag">STUDIO // RETRO PIXEL & ASCII</span>
        </div>

        {/* Mode Switcher Tabs */}
        <nav className="mode-nav-tabs">
          <button
            type="button"
            className={`tab-btn ${mode === 'ascii' ? 'active' : ''}`}
            onClick={() => handleModeChange('ascii')}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>ASCII ART</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'dither' ? 'active' : ''}`}
            onClick={() => handleModeChange('dither')}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>DITHERED PIXELS</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'hybrid' ? 'active' : ''}`}
            onClick={() => handleModeChange('hybrid')}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>DITHER-ASCII HYBRID</span>
          </button>
        </nav>
      </div>

      <div className="header-right">
        {/* CRT Scanline Toggle */}
        <button
          type="button"
          className={`btn-utility ${crtEnabled ? 'active' : ''}`}
          onClick={handleCrtToggle}
          title="Toggle CRT Scanlines & Glow"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>CRT FX</span>
        </button>

        {/* Audio Toggle */}
        <button
          type="button"
          className={`btn-utility ${audioEnabled ? 'active' : ''}`}
          onClick={handleAudioToggle}
          title="Toggle Web Audio SFX"
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>SFX</span>
        </button>

        {/* Clerk Auth Section */}
        <div className="header-auth-container flex items-center gap-2 ml-1">
          <Show when="signed-out">
            <Link href="/sign-in" className="btn-utility auth-btn-login" title="Sign In">
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <Link href="/sign-up" className="btn-utility auth-btn-register" title="Sign Up">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </Link>
          </Show>
          <Show when="signed-in">
            <div className="cyber-user-button-wrap flex items-center">
              <UserButton />
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
};

