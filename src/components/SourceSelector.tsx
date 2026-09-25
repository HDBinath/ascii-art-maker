'use client';

import React, { useRef, useEffect } from 'react';
import { soundFx } from '@/lib/soundFx';
import { UploadCloud, Camera, Image as ImageIcon, X, RefreshCw } from 'lucide-react';

interface SourceSelectorProps {
  sourceType: 'upload' | 'webcam';
  setSourceType: (type: 'upload' | 'webcam') => void;
  onImageLoaded: (img: HTMLImageElement | HTMLCanvasElement) => void;
  previewUrl: string | null;
  onClearImage: () => void;
  webcamMirrored: boolean;
  setWebcamMirrored: (mirrored: boolean) => void;
  onWebcamFrame: (videoEl: HTMLVideoElement) => void;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  sourceType,
  setSourceType,
  onImageLoaded,
  previewUrl,
  onClearImage,
  webcamMirrored,
  setWebcamMirrored,
  onWebcamFrame,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Handle Webcam streaming
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
                onWebcamFrame(videoRef.current);
              }
              animFrameRef.current = requestAnimationFrame(loop);
            };
            animFrameRef.current = requestAnimationFrame(loop);
          }
        } catch (err) {
          console.error('Camera access denied:', err);
          alert('Webcam access was denied or is unavailable.');
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
  }, [sourceType, onWebcamFrame, setSourceType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          onImageLoaded(img);
          soundFx.playScan();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          onImageLoaded(img);
          soundFx.playScan();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="source-selector-card">
      <div className="source-tabs">
        <button
          type="button"
          className={`source-tab-btn ${sourceType === 'upload' ? 'active' : ''}`}
          onClick={() => { soundFx.playClick(); setSourceType('upload'); }}
        >
          <ImageIcon className="w-4 h-4" />
          <span>IMAGE UPLOAD</span>
        </button>
        <button
          type="button"
          className={`source-tab-btn ${sourceType === 'webcam' ? 'active' : ''}`}
          onClick={() => { soundFx.playClick(); setSourceType('webcam'); }}
        >
          <Camera className="w-4 h-4" />
          <span>LIVE WEBCAM</span>
        </button>
      </div>

      {sourceType === 'upload' ? (
        <div
          className="dropzone-area"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); }}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {previewUrl ? (
            <div className="thumbnail-preview-wrap">
              <img src={previewUrl} alt="Source Preview" className="thumbnail-img" />
              <button
                type="button"
                className="btn-clear-thumb"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playClick();
                  onClearImage();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                title="Clear current image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="dropzone-idle">
              <div className="dropzone-icon-badge">
                <UploadCloud className="w-6 h-6 text-green-400" />
              </div>
              <p className="dropzone-prompt">DRAG & DROP IMAGE OR BROWSE</p>
              <span className="dropzone-hint">Supports PNG, JPG, WEBP, GIF, SVG</span>
            </div>
          )}
        </div>
      ) : (
        <div className="webcam-box">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`webcam-video-el ${webcamMirrored ? 'mirrored' : ''}`}
          />
          <div className="webcam-overlay-hud">
            <span className="rec-badge"><span className="rec-dot" /> LIVE STREAM</span>
            <button
              type="button"
              className="btn-hud-tool"
              onClick={() => { soundFx.playClick(); setWebcamMirrored(!webcamMirrored); }}
              title="Flip Mirror"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
