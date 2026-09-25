'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Terminal,
  Flame,
  Camera,
  Layers,
  Sparkles,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Sliders,
  Palette,
  Binary,
  Download,
  BookmarkPlus,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { getAllSavedArtworks, deleteArtworkFromVault, SavedArtwork } from '@/lib/artStorage';
import './landingPoster.css';

const FRONT_LILY_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_192942_e1086505-d7da-433b-a59b-8220f4e6c808.png&w=1280&q=85';

const REVEAL_LILY_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_151324_bf318a5f-5525-4fc7-aab5-e9a341018828.png&w=1280&q=85';

// Trail Math Constants
const TRAIL_MAX_POINTS = 60;
const TRAIL_HEAD_R = 140;
const TRAIL_NOISE_AMP = 44;
const TRAIL_BLOB_PTS = 24;
const TRAIL_FADE_SPEED = 0.92;
const TRAIL_SAMPLE_DIST = 8;

interface TrailPoint {
  x: number;
  y: number;
  r: number;
  alpha: number;
  seed: number;
}

export const LandingPoster: React.FC = () => {
  const router = useRouter();
  const [isAnim, setIsAnim] = useState<boolean>(true);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [pillText, setPillText] = useState<string>('Launch Studio');

  // Vault Artworks State
  const [savedArtworks, setSavedArtworks] = useState<SavedArtwork[]>([]);
  const [previewModalArt, setPreviewModalArt] = useState<SavedArtwork | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const stageRef = useRef<HTMLElement | null>(null);
  const flowerRef = useRef<HTMLDivElement | null>(null);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const topLayerRef = useRef<HTMLDivElement | null>(null);

  // Offscreen Mask Canvases
  const bgMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const topMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interactive Trail State
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isHoveringRef = useRef<boolean>(false);
  const headRadiusRef = useRef<number>(0);
  const pointsRef = useRef<TrailPoint[]>([]);
  const lastSampleRef = useRef<{ x: number; y: number } | null>(null);
  const timeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Load Saved Artworks from IndexedDB
  const refreshGallery = useCallback(async () => {
    try {
      const items = await getAllSavedArtworks();
      setSavedArtworks(items);
    } catch {
      setSavedArtworks([]);
    }
  }, []);

  useEffect(() => {
    refreshGallery();
  }, [refreshGallery]);

  const handleDeleteArt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteArtworkFromVault(id);
    await refreshGallery();
    showToast('Artwork removed from Vault');
  };

  const handleDownloadSavedPng = (art: SavedArtwork, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = art.fullDataUrl || art.thumbnailDataUrl;
    link.download = `orbit_${art.mode}_${art.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('PNG Downloaded!');
  };

  const handleCopySavedText = (art: SavedArtwork, e: React.MouseEvent) => {
    e.stopPropagation();
    if (art.plainText) {
      navigator.clipboard.writeText(art.plainText);
      showToast('Copied ASCII text to clipboard!');
    }
  };

  // Remove .anim class after entrance choreography
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnim(false);
    }, 5500);
    return () => clearTimeout(timer);
  }, []);

  // Track window scroll to reveal sticky top navigation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard accessibility for mobile sheet and preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewModalArt) setPreviewModalArt(null);
        if (menuOpen) setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, previewModalArt]);

  // Blob drawing with 3-frequency harmonic noise & quadratic bezier curves
  const drawMorphBlob = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    t: number,
    seed: number
  ) => {
    if (r < 2) return;
    const pts: { x: number; y: number }[] = [];
    const numPoints = TRAIL_BLOB_PTS;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const n1 = Math.sin(angle * 3 + t * 1.4 + seed) * 0.45;
      const n2 = Math.sin(angle * 5 - t * 0.9 + seed * 2.3) * 0.3;
      const n3 = Math.cos(angle * 2 + t * 1.8 + seed * 0.7) * 0.25;
      const noise = (n1 + n2 + n3) * TRAIL_NOISE_AMP * (r / 140);
      const radius = Math.max(0, r + noise);
      pts.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }

    ctx.beginPath();
    ctx.moveTo((pts[0].x + pts[pts.length - 1].x) / 2, (pts[0].y + pts[pts.length - 1].y) / 2);
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      const midX = (pts[i].x + next.x) / 2;
      const midY = (pts[i].y + next.y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    ctx.closePath();
    ctx.fill();
  }, []);

  // Animation and Trail Loop
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!bgMaskCanvasRef.current) {
      bgMaskCanvasRef.current = document.createElement('canvas');
    }
    if (!topMaskCanvasRef.current) {
      topMaskCanvasRef.current = document.createElement('canvas');
    }

    const bgCanvas = bgMaskCanvasRef.current;
    const topCanvas = topMaskCanvasRef.current;

    const renderLoop = () => {
      const flower = flowerRef.current;
      if (!flower) {
        rafRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const rect = flower.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      if (bgCanvas.width !== w || bgCanvas.height !== h) {
        bgCanvas.width = w;
        bgCanvas.height = h;
      }
      if (topCanvas.width !== w || topCanvas.height !== h) {
        topCanvas.width = w;
        topCanvas.height = h;
      }

      const isHovering = isHoveringRef.current;
      const targetR = isHovering ? TRAIL_HEAD_R : 0;
      headRadiusRef.current += (targetR - headRadiusRef.current) * (isHovering ? 0.14 : 0.04);

      // Add trail point if mouse moved sufficient distance
      if (isHovering && headRadiusRef.current > 5) {
        const mx = mousePosRef.current.x - rect.left;
        const my = mousePosRef.current.y - rect.top;

        let shouldPush = false;
        if (!lastSampleRef.current) {
          shouldPush = true;
        } else {
          const dx = mx - lastSampleRef.current.x;
          const dy = my - lastSampleRef.current.y;
          if (Math.hypot(dx, dy) >= TRAIL_SAMPLE_DIST) {
            shouldPush = true;
          }
        }

        if (shouldPush) {
          pointsRef.current.push({
            x: mx,
            y: my,
            r: headRadiusRef.current,
            alpha: 1.0,
            seed: Math.random() * 100,
          });
          if (pointsRef.current.length > TRAIL_MAX_POINTS) {
            pointsRef.current.shift();
          }
          lastSampleRef.current = { x: mx, y: my };
        }
      }

      // Decay points
      for (let i = pointsRef.current.length - 1; i >= 0; i--) {
        const p = pointsRef.current[i];
        p.alpha *= TRAIL_FADE_SPEED;
        p.r *= 0.995;
        if (p.alpha < 0.01 || p.r < 2) {
          pointsRef.current.splice(i, 1);
        }
      }

      timeRef.current += 0.016;

      const bgCtx = bgCanvas.getContext('2d');
      const topCtx = topCanvas.getContext('2d');

      if (bgCtx && topCtx) {
        if (pointsRef.current.length === 0 && headRadiusRef.current < 2) {
          // Idle / No Trail active: reset masks to default CSS states
          if (topLayerRef.current) {
            topLayerRef.current.style.maskImage = 'linear-gradient(#0000, #0000)';
            topLayerRef.current.style.webkitMaskImage = 'linear-gradient(#0000, #0000)';
          }
          if (bgLayerRef.current) {
            bgLayerRef.current.style.maskImage = 'none';
            bgLayerRef.current.style.webkitMaskImage = 'none';
          }
        } else {
          // Render Background Layer Mask (White base with destination-out punched holes)
          bgCtx.globalCompositeOperation = 'source-over';
          bgCtx.fillStyle = '#ffffff';
          bgCtx.fillRect(0, 0, w, h);

          bgCtx.globalCompositeOperation = 'destination-out';
          pointsRef.current.forEach((p) => {
            bgCtx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            drawMorphBlob(bgCtx, p.x, p.y, p.r, timeRef.current, p.seed);
          });

          // Render Reveal Layer Mask (Transparent base with white additive blobs)
          topCtx.clearRect(0, 0, w, h);
          topCtx.globalCompositeOperation = 'source-over';
          pointsRef.current.forEach((p) => {
            topCtx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            drawMorphBlob(topCtx, p.x, p.y, p.r, timeRef.current, p.seed);
          });

          const bgDataUrl = bgCanvas.toDataURL('image/png');
          const topDataUrl = topCanvas.toDataURL('image/png');

          if (bgLayerRef.current) {
            bgLayerRef.current.style.maskImage = `url(${bgDataUrl})`;
            bgLayerRef.current.style.webkitMaskImage = `url(${bgDataUrl})`;
          }
          if (topLayerRef.current) {
            topLayerRef.current.style.maskImage = `url(${topDataUrl})`;
            topLayerRef.current.style.webkitMaskImage = `url(${topDataUrl})`;
          }
        }
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    };

    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawMorphBlob]);

  // Stage Mouse Events
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    isHoveringRef.current = true;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    isHoveringRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    lastSampleRef.current = null;
  };

  const handlePillClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setPillText('Opening Studio...');
    router.push('/studio');
  };

  return (
    <div className={`landing-page-root ${isAnim ? 'anim' : ''}`}>
      {/* ====================================================================
          STICKY TOP NAVIGATION BAR (Revealed when user scrolls down)
          ==================================================================== */}
      <header className={`sticky-landing-header ${isScrolled ? 'visible' : ''}`} aria-hidden={!isScrolled}>
        <a href="#home" className="sticky-brand-group">
          <svg className="sticky-asterisk" viewBox="0 0 66 62" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="33" y1="1" x2="33" y2="61" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="3" y1="31" x2="63" y2="31" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="11.8" y1="9.8" x2="54.2" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="54.2" y1="9.8" x2="11.8" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
          </svg>
          <div className="sticky-brand-title">
            <span>OR</span>
            <span className="sticky-brand-pink">BIT</span>
          </div>
        </a>

        <ul className="sticky-nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#gallery">Gallery</a></li>
          <li><a href="#engines">Engines</a></li>
          <li><Link href="/studio">Studio</Link></li>
        </ul>

        <button
          type="button"
          className="sticky-launch-btn"
          onClick={handlePillClick}
        >
          <span>Launch Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ====================================================================
          1. HERO POSTER SECTION (#home)
          ==================================================================== */}
      <div className="hero-stage-wrapper" id="home">
        <section
          ref={stageRef}
          className="stage"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Brand Mark (Asterisk SVG) */}
          <div className="brand-mark" aria-label="Orbit Brand">
            <svg viewBox="0 0 66 62" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="33" y1="1" x2="33" y2="61" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
              <line x1="3" y1="31" x2="63" y2="31" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
              <line x1="11.8" y1="9.8" x2="54.2" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
              <line x1="54.2" y1="9.8" x2="11.8" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            </svg>
          </div>

          {/* Primary Desktop Nav */}
          <ul className="primary-nav" role="navigation" aria-label="Main Navigation">
            <li className="nav-item-home">
              <a href="#home">Home</a>
            </li>
            <li className="nav-item-resources">
              <a href="#gallery">Gallery</a>
            </li>
            <li className="nav-item-benefits">
              <a href="#engines">Engines</a>
            </li>
            <li className="nav-item-contact">
              <Link href="/studio">Studio</Link>
            </li>
          </ul>

          {/* Action Pill Button (Directs to Studio) */}
          <button
            type="button"
            className="secure-pill"
            onClick={handlePillClick}
            aria-label="Direct to Studio"
          >
            <span>{pillText}</span>
          </button>

          {/* Wordmark ORBIT */}
          <h1 className="orbit-word" id="orbit-title" aria-label="Orbit">
            <span className="orbit-word__mask">
              <span className="orbit-word__inner">
                <span className="orbit-word__white">
                  <span className="orbit-word__o">O</span>R
                </span>
                <span className="orbit-word__pink">BIT</span>
              </span>
            </span>
          </h1>

          {/* Flower Stack (Front & Reveal with dynamic morph-trail masks) */}
          <div className="flower" ref={flowerRef}>
            <img
              className="flower__sizer"
              src={FRONT_LILY_URL}
              alt=""
              aria-hidden="true"
            />
            <div className="flower__layer flower__layer--bg" ref={bgLayerRef}>
              <img
                src={FRONT_LILY_URL}
                alt="Pixel-art pink and violet lily"
              />
            </div>
            <div className="flower__layer flower__layer--top" ref={topLayerRef} aria-hidden="true">
              <img
                src={REVEAL_LILY_URL}
                alt=""
              />
            </div>
          </div>

          {/* Left Corner Copy - Tailored for Generative ASCII & Dither Art */}
          <p className="support-copy support-copy--left">
            <span className="support-copy__inner">
              Sub-pixel luminance,<br />mathematically rendered.
            </span>
          </p>

          {/* Right Corner Copy - Tailored for Matrix Typography */}
          <p className="support-copy support-copy--right">
            <span className="support-copy__inner">
              Every character matrix,<br />infinitely scalable.
            </span>
          </p>

          {/* Scroll Prompt */}
          <a href="#gallery" className="hero-scroll-prompt" aria-label="Scroll down to explore gallery">
            <div className="scroll-mouse-icon">
              <div className="scroll-wheel-dot" />
            </div>
            <span>EXPLORE</span>
          </a>

          {/* Mobile Burger Button */}
          <button
            type="button"
            className={`mobile-burger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <div className="mobile-burger-lines">
              <span />
              <span />
              <span />
            </div>
          </button>

          {/* Mobile Backdrop Scrim */}
          <div
            className={`mobile-scrim ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Navigation Sheet */}
          <div className={`mobile-sheet ${menuOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
            <nav className="mobile-nav-links">
              <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
              <a href="#gallery" onClick={() => setMenuOpen(false)}>Gallery</a>
              <a href="#engines" onClick={() => setMenuOpen(false)}>Engines</a>
              <Link href="/studio" onClick={() => setMenuOpen(false)}>Studio</Link>
            </nav>

            <button
              type="button"
              className="mobile-pill"
              onClick={(e) => {
                setMenuOpen(false);
                handlePillClick(e);
              }}
            >
              {pillText}
            </button>
          </div>
        </section>
      </div>

      {/* ====================================================================
          2. SAVED CREATIONS & ART VAULT GALLERY SECTION (#gallery)
          ==================================================================== */}
      <section className="content-section" id="gallery">
        <div className="section-header flex justify-between items-end flex-wrap gap-4">
          <div>
            <span className="section-tag">01 // ART VAULT</span>
            <h2 className="section-title">
              Your Saved <span className="section-title-gradient">Creations & Masters</span>
            </h2>
            <p className="section-desc">
              All rendered ASCII typography and dithered artworks saved directly to your browser's private local vault. Zero cloud uploads, unlimited high-resolution retention.
            </p>
          </div>
          <Link href="/studio" className="btn-vault-action-primary">
            <BookmarkPlus className="w-4 h-4" />
            <span>Create New in Studio</span>
          </Link>
        </div>

        {savedArtworks.length > 0 ? (
          <div className="gallery-card-grid">
            {savedArtworks.map((art) => (
              <div key={art.id} className="vault-art-card" onClick={() => setPreviewModalArt(art)}>
                <div className="vault-art-thumb-wrapper">
                  <img src={art.thumbnailDataUrl} alt={art.title} className="vault-art-thumb" />
                  <div className="vault-art-overlay">
                    <button
                      type="button"
                      className="btn-vault-icon"
                      onClick={(e) => handleDownloadSavedPng(art, e)}
                      title="Download PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {art.plainText && (
                      <button
                        type="button"
                        className="btn-vault-icon"
                        onClick={(e) => handleCopySavedText(art, e)}
                        title="Copy ASCII Text"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-vault-icon danger"
                      onClick={(e) => handleDeleteArt(art.id, e)}
                      title="Delete Artwork"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="vault-mode-badge">{art.mode.toUpperCase()}</span>
                </div>

                <div className="vault-art-info">
                  <h4 className="vault-art-title">{art.title}</h4>
                  <div className="vault-art-meta">
                    <span>{art.stats.width} × {art.stats.height} {art.stats.unitName}</span>
                    <span>{new Date(art.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="vault-empty-showcase">
            <div className="vault-empty-card">
              <div className="vault-empty-icon-ring">
                <BookmarkPlus className="w-8 h-8 text-pink-400" />
              </div>
              <h3 className="vault-empty-title">Your Art Vault is Empty</h3>
              <p className="vault-empty-desc">
                Launch the studio to generate your first ASCII art or dithered pixel transformation and hit <strong>SAVE</strong> in the export dock.
              </p>
              <Link href="/studio" className="btn-cta-launch-sm">
                <span>Open Studio to Generate</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ====================================================================
          3. CORE ENGINES & MODES SECTION (#engines)
          ==================================================================== */}
      <section className="content-section" id="engines">
        <div className="section-header">
          <span className="section-tag">02 // ALGORITHMIC ENGINES</span>
          <h2 className="section-title">
            Computational Artistry <span className="section-title-gradient">Engineered at Scale</span>
          </h2>
          <p className="section-desc">
            Convert any photograph, graphic, or live camera feed into retro-futuristic ASCII typography and mathematical error-diffused dithered matrices in real-time.
          </p>
        </div>

        <div className="orbit-grid-4">
          {/* Card 1 */}
          <div className="orbit-feature-card">
            <div>
              <div className="card-num">MODE // 01</div>
              <div className="card-icon-wrap">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="card-title">Neural ASCII Matrix</h3>
              <p className="card-text">
                Sub-pixel brightness mapping across 7 distinct density character sets (Cyberpunk, Matrix, Binary, and Classic block ramps) with font aspect ratio compensation.
              </p>
            </div>
            <div className="card-badges">
              <span className="card-badge">7 Charsets</span>
              <span className="card-badge">Aspect Sync</span>
              <span className="card-badge">HTML Exporter</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="orbit-feature-card">
            <div>
              <div className="card-num">MODE // 02</div>
              <div className="card-icon-wrap">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="card-title">Dither Matrix Lab</h3>
              <p className="card-text">
                9 hardware-accelerated dithering algorithms including Floyd-Steinberg, Atkinson, Bayer 4×4/8×8 ordered patterns, Sierra Lite, Burkes, and Halftone frequency screening.
              </p>
            </div>
            <div className="card-badges">
              <span className="card-badge">9 Algorithms</span>
              <span className="card-badge">Error Diffusion</span>
              <span className="card-badge">Bit Depth Control</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="orbit-feature-card">
            <div>
              <div className="card-num">MODE // 03</div>
              <div className="card-icon-wrap">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="card-title">Live Camera Stream</h3>
              <p className="card-text">
                Zero-latency 60 FPS webcam ingestion. Turn your live camera into a real-time ASCII hologram or 1-bit Macintosh phosphor viewfinder with live horizontal flipping.
              </p>
            </div>
            <div className="card-badges">
              <span className="card-badge">60 FPS Realtime</span>
              <span className="card-badge">Zero Server Lag</span>
              <span className="card-badge">Mirror Mode</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="orbit-feature-card">
            <div>
              <div className="card-num">MODE // 04</div>
              <div className="card-icon-wrap">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="card-title">8K UHD Master Export</h3>
              <p className="card-text">
                Asynchronous binary streaming generates uncompressed 4K and 8K print-ready PNG posters without memory corruption, plus pure ANSI text and CSS-styled web pages.
              </p>
            </div>
            <div className="card-badges">
              <span className="card-badge">Up to 8192px</span>
              <span className="card-badge">Binary Blob Stream</span>
              <span className="card-badge">Lossless PNG</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. 3-STEP CREATIVE WORKFLOW
          ==================================================================== */}
      <section className="content-section">
        <div className="section-header">
          <span className="section-tag">03 // CREATIVE WORKFLOW</span>
          <h2 className="section-title">
            From Raw Pixels to <span className="section-title-gradient">Master Art in Seconds</span>
          </h2>
          <p className="section-desc">
            A streamlined, responsive workstation designed for designers, developers, digital artists, and creative technologists.
          </p>
        </div>

        <div className="workflow-grid">
          <div className="workflow-card">
            <div className="workflow-card-step">1</div>
            <h3 className="workflow-card-title">Ingest Any Source</h3>
            <p className="workflow-card-text">
              Drag and drop any high or low resolution image file (PNG, JPG, WEBP, SVG) or click to initiate your live webcam feed directly.
            </p>
          </div>

          <div className="workflow-card">
            <div className="workflow-card-step">2</div>
            <h3 className="workflow-card-title">Modulate & Upscale</h3>
            <p className="workflow-card-text">
              Switch between ASCII, Dithered Pixels, and Hybrid modes. Apply 2x, 4x, or 8x nearest-neighbor or smooth bicubic upscaling.
            </p>
          </div>

          <div className="workflow-card">
            <div className="workflow-card-step">3</div>
            <h3 className="workflow-card-title">Save & Export Masters</h3>
            <p className="workflow-card-text">
              Save your creation directly to your local Art Vault library or download uncompressed 4K / 8K UHD lossless PNGs.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. TECHNICAL ARCHITECTURE MATRIX
          ==================================================================== */}
      <section className="content-section">
        <div className="tech-matrix-box">
          <div className="tech-stat-unit">
            <span className="tech-stat-value">100%</span>
            <span className="tech-stat-label">Local Compute</span>
            <span className="tech-stat-sub">Zero images uploaded to servers. All pixel processing occurs client-side in browser memory.</span>
          </div>

          <div className="tech-stat-unit">
            <span className="tech-stat-value">0 ms</span>
            <span className="tech-stat-label">Queue Latency</span>
            <span className="tech-stat-sub">Instantaneous rendering powered by HTML5 Canvas and WebGL acceleration.</span>
          </div>

          <div className="tech-stat-unit">
            <span className="tech-stat-value">8K UHD</span>
            <span className="tech-stat-label">Max Canvas Buffer</span>
            <span className="tech-stat-sub">Up to 8192×8192px multi-megabyte lossless binary export streaming.</span>
          </div>

          <div className="tech-stat-unit">
            <span className="tech-stat-value">IndexedDB</span>
            <span className="tech-stat-label">Local Vault Storage</span>
            <span className="tech-stat-sub">Persistent offline library of your generated artworks and exact parameters.</span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. FINAL CALL TO ACTION & FOOTER
          ==================================================================== */}
      <div className="cta-section-wrapper">
        <svg className="cta-asterisk" viewBox="0 0 66 62" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="33" y1="1" x2="33" y2="61" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
          <line x1="3" y1="31" x2="63" y2="31" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
          <line x1="11.8" y1="9.8" x2="54.2" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
          <line x1="54.2" y1="9.8" x2="11.8" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
        </svg>

        <h2 className="cta-heading">
          Create Art from <span className="section-title-gradient">Pixels & Typography</span>
        </h2>
        <p className="cta-sub">
          Launch the full-screen studio now. No accounts required, completely private, offline-ready, and free.
        </p>

        <button
          type="button"
          className="btn-cta-launch"
          onClick={handlePillClick}
        >
          <span>Launch Studio Now</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Minimal Footer */}
      <footer className="orbit-footer">
        <div className="footer-left">
          <svg className="w-5 h-5" viewBox="0 0 66 62" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="33" y1="1" x2="33" y2="61" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="3" y1="31" x2="63" y2="31" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="11.8" y1="9.8" x2="54.2" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
            <line x1="54.2" y1="9.8" x2="11.8" y2="52.2" stroke="#ffffff" strokeWidth="5" strokeLinecap="square" />
          </svg>
          <span>ORBIT STUDIO // NEURAL ASCII & DITHER MATRIX GENERATOR</span>
        </div>
        <div className="footer-links">
          <a href="#home">Back to Top ↑</a>
          <a href="#gallery">Vault Gallery</a>
          <Link href="/studio">Open Studio</Link>
        </div>
      </footer>

      {/* Preview Modal for Saved Works */}
      {previewModalArt && (
        <div className="vault-modal-backdrop" onClick={() => setPreviewModalArt(null)}>
          <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vault-modal-header">
              <div className="flex items-center gap-2">
                <span className="vault-mode-badge">{previewModalArt.mode.toUpperCase()}</span>
                <h3 className="text-white font-medium text-base">{previewModalArt.title}</h3>
              </div>
              <button
                type="button"
                className="btn-vault-icon"
                onClick={() => setPreviewModalArt(null)}
              >
                ✕
              </button>
            </div>

            <div className="vault-modal-body">
              <img
                src={previewModalArt.fullDataUrl || previewModalArt.thumbnailDataUrl}
                alt={previewModalArt.title}
                className="vault-modal-preview-img"
              />
            </div>

            <div className="vault-modal-footer">
              <div className="text-xs text-neutral-400">
                {previewModalArt.stats.width} × {previewModalArt.stats.height} {previewModalArt.stats.unitName}
              </div>
              <div className="flex items-center gap-2">
                {previewModalArt.plainText && (
                  <button
                    type="button"
                    className="btn-vault-action-secondary"
                    onClick={(e) => handleCopySavedText(previewModalArt, e)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-vault-action-primary"
                  onClick={(e) => handleDownloadSavedPng(previewModalArt, e)}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="cyber-toast-alert">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
