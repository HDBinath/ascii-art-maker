'use client';

import React, { useState, useRef } from 'react';
import { soundFx } from '@/lib/soundFx';
import { Eye, EyeOff, X, UploadCloud, Camera, RefreshCw } from 'lucide-react';

interface OriginalImagePiPProps {
  previewUrl: string | null;
  sourceType: 'upload' | 'webcam';
  onClearImage: () => void;
  onUploadClick: () => void;
  webcamMirrored: boolean;
  setWebcamMirrored: (mirrored: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const OriginalImagePiP: React.FC<OriginalImagePiPProps> = ({
  previewUrl,
  sourceType,
  onClearImage,
  onUploadClick,
  webcamMirrored,
  setWebcamMirrored,
  videoRef,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!previewUrl && sourceType !== 'webcam') {
    return null;
  }

  return (
    <div className={`pip-floating-widget ${collapsed ? 'collapsed' : ''}`}>
      <div className="pip-header">
        <div className="pip-title">
          <span className="pip-dot" />
          <span>ORIGINAL FEED</span>
        </div>
        <div className="pip-actions">
          {sourceType === 'webcam' && (
            <button
              type="button"
              className="btn-pip-tool"
              onClick={() => {
                soundFx.playClick();
                setWebcamMirrored(!webcamMirrored);
              }}
              title="Flip Mirror"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            className="btn-pip-tool"
            onClick={() => {
              soundFx.playClick();
              setCollapsed(!collapsed);
            }}
            title={collapsed ? 'Expand Feed' : 'Collapse Feed'}
          >
            {collapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>

          {sourceType === 'upload' && (
            <button
              type="button"
              className="btn-pip-tool btn-pip-close"
              onClick={() => {
                soundFx.playClick();
                onClearImage();
              }}
              title="Clear Image"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="pip-body" style={{ display: collapsed ? 'none' : 'block' }}>
        {sourceType === 'upload' && previewUrl && (
          <img src={previewUrl} alt="Original Input" className="pip-preview-image" />
        )}

        {sourceType === 'webcam' && (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`pip-video-stream ${webcamMirrored ? 'mirrored' : ''}`}
          />
        )}
      </div>
    </div>
  );
};
