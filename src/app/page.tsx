'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppMode, AppOptions } from '@/lib/types';
import { Header } from '@/components/Header';
import { Viewport } from '@/components/Viewport';
import { OriginalImagePiP } from '@/components/OriginalImagePiP';
import { BottomControlDock } from '@/components/BottomControlDock';
import { processAsciiArt, generateHtmlExport } from '@/lib/asciiEngine';
import { processDitheredPixelArt } from '@/lib/ditherEngine';
import { soundFx } from '@/lib/soundFx';
import { CheckCircle2, UploadCloud } from 'lucide-react';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('ascii');
  const [sourceType, setSourceType] = useState<'upload' | 'webcam'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [webcamMirrored, setWebcamMirrored] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);

  // App Options State
  const [options, setOptions] = useState<AppOptions>({
    mode: 'ascii',
    contrast: 1.2,
    brightness: 1.0,
    invert: false,
    columns: 110,
    fontSize: 12,
    aspectRatio: 0.55,
    charset: 'cyberpunk',
    customCharset: '',
    asciiColorMode: 'matrix',
    ditherAlgorithm: 'floyd-steinberg',
    palette: 'gameboy',
    customPaletteColors: [],
    pixelSize: 4,
    ditherAmount: 1.0,
    colorDepthBits: 4,
    crtEffect: true,
    scanlines: true,
  });

  // Sync mode into options
  useEffect(() => {
    setOptions(prev => ({ ...prev, mode }));
  }, [mode]);

  // Canvas & Media Refs
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cached Export Text & Stats
  const [plainText, setPlainText] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [stats, setStats] = useState({
    width: 0,
    height: 0,
    count: 0,
    unitName: 'CHARS'
  });

  // Toast state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

  // Process and Render
  const renderPipeline = useCallback(() => {
    const srcCanvas = sourceCanvasRef.current;
    const tgtCanvas = targetCanvasRef.current;
    if (!srcCanvas || !tgtCanvas || srcCanvas.width === 0 || srcCanvas.height === 0) return;

    if (options.mode === 'dither') {
      processDitheredPixelArt(srcCanvas, tgtCanvas, options);
      const lowW = Math.max(1, Math.floor(srcCanvas.width / options.pixelSize));
      const lowH = Math.max(1, Math.floor(srcCanvas.height / options.pixelSize));
      setStats({
        width: lowW,
        height: lowH,
        count: lowW * lowH,
        unitName: 'PIXELS'
      });
      setPlainText('');
      setHtmlContent('');
    } else {
      const isHybrid = options.mode === 'hybrid';
      const result = processAsciiArt(srcCanvas, tgtCanvas, options, isHybrid);
      if (result) {
        setPlainText(result.text);
        setHtmlContent(generateHtmlExport(result, options.asciiColorMode));
        setStats({
          width: result.cols,
          height: result.rowsCount,
          count: result.cols * result.rowsCount,
          unitName: 'CHARS'
        });
      }
    }
  }, [options]);

  // Re-run pipeline whenever options change
  useEffect(() => {
    if (sourceType === 'upload') {
      renderPipeline();
    }
  }, [options, renderPipeline, sourceType]);

  // Load Image onto source canvas
  const handleImageLoaded = useCallback((img: HTMLImageElement | HTMLCanvasElement) => {
    const srcCanvas = sourceCanvasRef.current;
    if (!srcCanvas) return;

    const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const h = 'naturalHeight' in img ? img.naturalHeight : img.height;

    srcCanvas.width = w;
    srcCanvas.height = h;
    const ctx = srcCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, w, h);
      if ('toDataURL' in img) {
        setPreviewUrl(img.toDataURL('image/png'));
      } else {
        setPreviewUrl(srcCanvas.toDataURL('image/png'));
      }
      renderPipeline();
    }
  }, [renderPipeline]);

  // File Upload Handler
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        handleImageLoaded(img);
        soundFx.playScan();
        showToast('Image Loaded Successfully!');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Webcam live frame loop
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isActive = true;

    if (sourceType === 'webcam') {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
          });
          if (videoRef.current && isActive) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            soundFx.playScan();

            const loop = () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                const srcCanvas = sourceCanvasRef.current;
                if (srcCanvas) {
                  const vw = videoRef.current.videoWidth || 640;
                  const vh = videoRef.current.videoHeight || 480;
                  if (srcCanvas.width !== vw || srcCanvas.height !== vh) {
                    srcCanvas.width = vw;
                    srcCanvas.height = vh;
                  }
                  const ctx = srcCanvas.getContext('2d');
                  if (ctx) {
                    ctx.save();
                    if (webcamMirrored) {
                      ctx.translate(vw, 0);
                      ctx.scale(-1, 1);
                    }
                    ctx.drawImage(videoRef.current, 0, 0, vw, vh);
                    ctx.restore();
                    renderPipeline();
                  }
                }
              }
              animFrameRef.current = requestAnimationFrame(loop);
            };
            animFrameRef.current = requestAnimationFrame(loop);
          }
        } catch (err) {
          console.error('Camera access denied:', err);
          showToast('Webcam access was denied or unavailable.');
          setSourceType('upload');
        }
      };
      startCamera();
    }

    return () => {
      isActive = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sourceType, webcamMirrored, renderPipeline]);

  // Clear Image
  const handleClearImage = () => {
    setPreviewUrl(null);
    const srcCanvas = sourceCanvasRef.current;
    const tgtCanvas = targetCanvasRef.current;
    if (srcCanvas) {
      const ctx = srcCanvas.getContext('2d');
      ctx?.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
      srcCanvas.width = 0;
      srcCanvas.height = 0;
    }
    if (tgtCanvas) {
      const ctx = tgtCanvas.getContext('2d');
      ctx?.clearRect(0, 0, tgtCanvas.width, tgtCanvas.height);
      tgtCanvas.width = 0;
      tgtCanvas.height = 0;
    }
    setPlainText('');
    setHtmlContent('');
    setStats({ width: 0, height: 0, count: 0, unitName: 'CHARS' });
  };

  // Generate Sample Presets
  const handleLoadSample = useCallback((sampleType: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sampleType === 'cyber-cat') {
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, 400, 400);

      // Ears
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(80, 160); ctx.lineTo(120, 50); ctx.lineTo(170, 130); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(320, 160); ctx.lineTo(280, 50); ctx.lineTo(230, 130); ctx.fill();

      // Head
      ctx.fillStyle = '#00ff41';
      ctx.beginPath();
      ctx.arc(200, 210, 110, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Eyes
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(160, 195, 22, 0, Math.PI * 2);
      ctx.arc(240, 195, 22, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(157, 182, 6, 26);
      ctx.fillRect(237, 182, 6, 26);

      // Whiskers
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(110, 240); ctx.lineTo(40, 225);
      ctx.moveTo(110, 255); ctx.lineTo(40, 260);
      ctx.moveTo(290, 240); ctx.lineTo(360, 225);
      ctx.moveTo(290, 255); ctx.lineTo(360, 260);
      ctx.stroke();

    } else if (sampleType === 'skull') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 400, 400);

      // Skull Cranium
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(200, 170, 100, 0, Math.PI * 2);
      ctx.fill();

      // Jaw
      ctx.fillRect(155, 230, 90, 80);

      // Eye Sockets
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(165, 175, 25, 0, Math.PI * 2);
      ctx.arc(235, 175, 25, 0, Math.PI * 2);
      ctx.fill();

      // Nose Cavity
      ctx.beginPath();
      ctx.moveTo(200, 195); ctx.lineTo(190, 225); ctx.lineTo(210, 225); ctx.fill();

      // Teeth
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      for (let i = 170; i <= 230; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, 270);
        ctx.lineTo(i, 305);
        ctx.stroke();
      }
    } else if (sampleType === 'synthwave') {
      const sky = ctx.createLinearGradient(0, 0, 0, 400);
      sky.addColorStop(0, '#0d0221');
      sky.addColorStop(0.6, '#261447');
      sky.addColorStop(1, '#ff3864');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 400, 400);

      const sun = ctx.createRadialGradient(200, 220, 20, 200, 220, 90);
      sun.addColorStop(0, '#ffe600');
      sun.addColorStop(0.7, '#ff0055');
      sun.addColorStop(1, 'transparent');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(200, 220, 90, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0d0221';
      for (let y = 170; y <= 270; y += 14) {
        ctx.fillRect(100, y, 200, (y - 150) * 0.08 + 2);
      }
    } else {
      ctx.fillStyle = '#001100';
      ctx.fillRect(0, 0, 400, 400);
      const grad = ctx.createRadialGradient(200, 200, 20, 200, 200, 180);
      grad.addColorStop(0, '#00ff41');
      grad.addColorStop(0.6, '#008f11');
      grad.addColorStop(1, '#001100');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(200, 200, 170, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px monospace';
      ctx.fillText('NEO::42', 110, 215);
    }

    handleImageLoaded(canvas);
  }, [handleImageLoaded]);

  // Load default sample on mount
  useEffect(() => {
    handleLoadSample('cyber-cat');
  }, [handleLoadSample]);

  // Global Drag and Drop Handler
  const handleGlobalDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`cyber-app-shell ${crtEnabled ? 'crt-active' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleGlobalDrop}
    >
      {/* CRT Scanline Shader Overlay */}
      <div className="crt-scanlines-overlay" />
      <div className="crt-glow-bloom" />

      {/* Top Header */}
      <Header
        mode={mode}
        setMode={setMode}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        crtEnabled={crtEnabled}
        setCrtEnabled={setCrtEnabled}
        onLoadSample={handleLoadSample}
      />

      {/* Main Full-Screen Hero Viewport with Top-Right PiP */}
      <main className="cyber-fullscreen-viewport">
        <Viewport
          options={options}
          canvasRef={targetCanvasRef}
          sourceCanvasRef={sourceCanvasRef}
          stats={stats}
        />

        {/* Floating Top-Right Picture-in-Picture Original View */}
        <OriginalImagePiP
          previewUrl={previewUrl}
          sourceType={sourceType}
          onClearImage={handleClearImage}
          onUploadClick={() => {}}
          webcamMirrored={webcamMirrored}
          setWebcamMirrored={setWebcamMirrored}
          videoRef={videoRef}
        />
      </main>

      {/* Bottom Control Dock (Consolidated Controls & Exports) */}
      <BottomControlDock
        options={options}
        setOptions={setOptions}
        sourceType={sourceType}
        setSourceType={setSourceType}
        onFileUpload={handleFileUpload}
        canvasRef={targetCanvasRef}
        plainText={plainText}
        htmlContent={htmlContent}
        onToast={showToast}
      />

      {/* Toast Alert Notification */}
      {toastMsg && (
        <div className="cyber-toast-alert">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
