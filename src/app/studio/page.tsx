'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppMode, AppOptions } from '@/lib/types';
import { Header } from '@/components/Header';
import { Viewport } from '@/components/Viewport';
import { OriginalImagePiP } from '@/components/OriginalImagePiP';
import { BottomControlDock } from '@/components/BottomControlDock';
import { processAsciiArt, generateHtmlExport } from '@/lib/asciiEngine';
import { processDitheredPixelArt } from '@/lib/ditherEngine';
import { upscaleSourceCanvas } from '@/lib/upscaleHelper';
import { soundFx } from '@/lib/soundFx';
import { CheckCircle2 } from 'lucide-react';

export default function StudioPage() {
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
    upscaleFactor: 1,
    upscaleMode: 'smooth',
    exportScale: 1,
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
  const rawSourceRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);
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

  // Handle Upscale update on raw source
  const applyUpscaleToSource = useCallback(() => {
    if (!rawSourceRef.current || !sourceCanvasRef.current) return;
    const raw = rawSourceRef.current;
    const upscaled = upscaleSourceCanvas(raw, options.upscaleFactor, options.upscaleMode);

    const srcCanvas = sourceCanvasRef.current;
    srcCanvas.width = upscaled.width;
    srcCanvas.height = upscaled.height;
    const ctx = srcCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(upscaled, 0, 0);
      renderPipeline();
    }
  }, [options.upscaleFactor, options.upscaleMode, renderPipeline]);

  // Re-run pipeline or upscale whenever options change
  useEffect(() => {
    if (sourceType === 'upload') {
      if (rawSourceRef.current) {
        applyUpscaleToSource();
      } else {
        renderPipeline();
      }
    }
  }, [options, applyUpscaleToSource, renderPipeline, sourceType]);

  // Load Image onto source canvas
  const handleImageLoaded = useCallback((img: HTMLImageElement | HTMLCanvasElement) => {
    rawSourceRef.current = img;
    const srcCanvas = sourceCanvasRef.current;
    if (!srcCanvas) return;

    const upscaled = upscaleSourceCanvas(img, options.upscaleFactor, options.upscaleMode);
    srcCanvas.width = upscaled.width;
    srcCanvas.height = upscaled.height;
    const ctx = srcCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(upscaled, 0, 0);
      if ('toDataURL' in img) {
        setPreviewUrl(img.toDataURL('image/png'));
      } else {
        setPreviewUrl(srcCanvas.toDataURL('image/png'));
      }
      renderPipeline();
    }
  }, [options.upscaleFactor, options.upscaleMode, renderPipeline]);

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
    rawSourceRef.current = null;
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

  // Global Drag and Drop Handler
  const handleGlobalDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerUploadClick = () => {
    hiddenFileInputRef.current?.click();
  };

  const hasImage = Boolean(previewUrl || sourceType === 'webcam');

  return (
    <div
      className={`cyber-app-shell ${crtEnabled ? 'crt-active' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleGlobalDrop}
    >
      <input
        type="file"
        ref={hiddenFileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
        accept="image/*"
        className="hidden"
      />

      {/* CRT Scanline Shader Overlay */}
      <div className="crt-scanlines-overlay" />
      <div className="crt-glow-bloom" />

      {/* Top Header with Return to Home */}
      <Header
        mode={mode}
        setMode={setMode}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        crtEnabled={crtEnabled}
        setCrtEnabled={setCrtEnabled}
      />

      {/* Main Full-Screen Hero Viewport with Top-Right PiP */}
      <main className="cyber-fullscreen-viewport">
        <Viewport
          options={options}
          canvasRef={targetCanvasRef}
          sourceCanvasRef={sourceCanvasRef}
          hasImage={hasImage}
          onUploadClick={triggerUploadClick}
          onWebcamClick={() => {
            soundFx.playClick();
            setSourceType(sourceType === 'webcam' ? 'upload' : 'webcam');
          }}
          stats={stats}
        />

        {/* Floating Top-Right Picture-in-Picture Original View */}
        <OriginalImagePiP
          previewUrl={previewUrl}
          sourceType={sourceType}
          onClearImage={handleClearImage}
          onUploadClick={triggerUploadClick}
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
