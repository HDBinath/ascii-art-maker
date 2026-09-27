'use client';

import React, { useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { AppOptions, GalleryPost } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import {
  X,
  Sparkles,
  Globe,
  UploadCloud,
  CheckCircle2,
  Lock,
  ArrowRight,
  Maximize2,
  Hash,
} from 'lucide-react';

interface PublishGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  options: AppOptions;
  plainText?: string;
  stats: {
    width: number;
    height: number;
    count: number;
    unitName: string;
  };
  onToast: (msg: string) => void;
}

export const PublishGalleryModal: React.FC<PublishGalleryModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  options,
  plainText,
  stats,
  onToast,
}) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedPost, setPublishedPost] = useState<GalleryPost | null>(null);

  if (!isOpen) return null;

  // Extract current canvas data URL for preview
  const dataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataUrl) {
      onToast('No rendered artwork available to publish.');
      return;
    }

    if (!title.trim()) {
      onToast('Please enter an artwork title.');
      return;
    }

    if (!isSignedIn) {
      onToast('Please sign in to publish your artwork.');
      return;
    }

    soundFx.playScan();
    setIsPublishing(true);

    try {
      const response = await fetch('/api/gallery/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          mode: options.mode,
          imageBase64: dataUrl,
          plainText: plainText || undefined,
          stats,
          options,
          userId: user.id,
          userName: user.fullName || user.username || user.firstName || 'Cyber Pilot',
          userAvatar: user.imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to post artwork.');
      }

      soundFx.playPower();
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.4 },
          colors: ['#00f0ff', '#fd86db', '#ffffff', '#ffc5dc', '#00ff41'],
        });
      } catch {}

      setPublishedPost(data.post);
      onToast('Artwork published to Global Community Gallery!');
    } catch (err: any) {
      console.error('Publish error:', err);
      onToast(err.message || 'Error publishing artwork.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleModalClose = () => {
    soundFx.playClick();
    setPublishedPost(null);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="gallery-modal-overlay" onClick={handleModalClose}>
      <div
        className="gallery-modal-card publish-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gallery-modal-header">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-pink-400" />
            <span className="gallery-modal-title">POST TO GLOBAL COMMUNITY GALLERY</span>
          </div>
          <button
            type="button"
            className="gallery-modal-close-btn"
            onClick={handleModalClose}
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="gallery-modal-body">
          {publishedPost ? (
            /* Success State */
            <div className="publish-success-state">
              <div className="success-icon-badge">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="success-title">TRANSMISSION BROADCAST SUCCESSFUL</h3>
              <p className="success-sub">
                Your artwork <strong>&ldquo;{publishedPost.title}&rdquo;</strong> is now live on the public community gallery for all cyber pilots to admire!
              </p>

              {dataUrl && (
                <div className="success-preview-wrap">
                  <img src={dataUrl} alt={publishedPost.title} className="success-preview-img" />
                </div>
              )}

              <div className="success-actions flex gap-3 mt-4">
                <Link
                  href="/gallery"
                  className="btn-publish-action primary"
                  onClick={handleModalClose}
                >
                  <Globe className="w-4 h-4" />
                  <span>View in Gallery</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  className="btn-publish-action secondary"
                  onClick={handleModalClose}
                >
                  <span>Done</span>
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handlePublish} className="publish-form-grid">
              {/* Left Column: Image Preview & Specs */}
              <div className="publish-preview-col">
                <div className="publish-preview-frame">
                  {dataUrl ? (
                    <img src={dataUrl} alt="Rendered Artwork Preview" className="publish-preview-canvas-img" />
                  ) : (
                    <div className="publish-preview-empty">No Render Available</div>
                  )}
                  <span className="publish-mode-tag">
                    {options.mode.toUpperCase()}
                  </span>
                </div>

                <div className="publish-specs-strip">
                  <span className="publish-spec-item">
                    <Maximize2 className="w-3 h-3 text-neutral-400" />
                    <span>{stats.width} × {stats.height}</span>
                  </span>
                  <span className="publish-spec-item">
                    <Hash className="w-3 h-3 text-pink-400" />
                    <span>{stats.count.toLocaleString()} {stats.unitName}</span>
                  </span>
                </div>

                {/* Creator Attribution */}
                {isLoaded && isSignedIn && user ? (
                  <div className="publish-creator-badge">
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || 'Creator'}
                      className="creator-avatar"
                    />
                    <div className="creator-info">
                      <span className="creator-label">CREATOR</span>
                      <span className="creator-name">
                        {user.fullName || user.username || user.firstName || 'Cyber Pilot'}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Right Column: Inputs & Auth Notice */}
              <div className="publish-inputs-col">
                {!isSignedIn ? (
                  /* Signed Out Notice */
                  <div className="publish-auth-gate">
                    <div className="auth-gate-icon">
                      <Lock className="w-6 h-6 text-pink-400" />
                    </div>
                    <h4 className="auth-gate-title">PILOT IDENTIFICATION REQUIRED</h4>
                    <p className="auth-gate-desc">
                      Sign in to your account to sign and broadcast your creations to the global community gallery.
                    </p>
                    <SignInButton mode="modal">
                      <button type="button" className="btn-auth-prompt">
                        <Sparkles className="w-4 h-4" />
                        <span>Sign In to Publish</span>
                      </button>
                    </SignInButton>
                  </div>
                ) : (
                  /* Form Inputs */
                  <>
                    <div className="publish-input-group">
                      <label className="publish-label">
                        ARTWORK TITLE <span className="text-pink-400">*</span>
                      </label>
                      <input
                        type="text"
                        className="publish-input"
                        placeholder="e.g., Cybernetic Phosphor Dream #04"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={80}
                        required
                        disabled={isPublishing}
                        autoFocus
                      />
                    </div>

                    <div className="publish-input-group">
                      <label className="publish-label">
                        DESCRIPTION / NOTES <span className="publish-optional">(OPTIONAL)</span>
                      </label>
                      <textarea
                        className="publish-textarea"
                        placeholder="Share details about your conversion, algorithms used, or artistic vision..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={400}
                        rows={3}
                        disabled={isPublishing}
                      />
                      <span className="publish-char-count">{description.length}/400</span>
                    </div>

                    <div className="publish-notice-box">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                      <span>
                        Your artwork will be stored in Cloudflare R2 and indexed in the public gallery for community appreciation.
                      </span>
                    </div>

                    <div className="publish-footer-actions">
                      <button
                        type="button"
                        className="btn-publish-cancel"
                        onClick={handleModalClose}
                        disabled={isPublishing}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-publish-submit"
                        disabled={isPublishing || !title.trim()}
                      >
                        {isPublishing ? (
                          <>
                            <span className="publish-spinner" />
                            <span>Broadcasting...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>Publish Artwork</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
