'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [pillText, setPillText] = useState<string>('Launch Studio');

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

  // Remove .anim class after entrance choreography
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnim(false);
    }, 5500);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard accessibility for mobile sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

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
    <main className={`landing-viewport ${isAnim ? 'anim' : ''}`}>
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
            <Link href="#home">Home</Link>
          </li>
          <li className="nav-item-resources">
            <Link href="#resources">Resources</Link>
          </li>
          <li className="nav-item-benefits">
            <Link href="#benefits">Benefits</Link>
          </li>
          <li className="nav-item-contact">
            <Link href="#contact">Contact</Link>
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

        {/* Left Corner Copy */}
        <p className="support-copy support-copy--left">
          <span className="support-copy__inner">
            Every workflow,<br />intelligently connected.
          </span>
        </p>

        {/* Right Corner Copy */}
        <p className="support-copy support-copy--right">
          <span className="support-copy__inner">
            Less manual work.<br />More meaningful output.
          </span>
        </p>

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
            <Link href="#home" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="#resources" onClick={() => setMenuOpen(false)}>Resources</Link>
            <Link href="#benefits" onClick={() => setMenuOpen(false)}>Benefits</Link>
            <Link href="#contact" onClick={() => setMenuOpen(false)}>Contact</Link>
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
    </main>
  );
};
