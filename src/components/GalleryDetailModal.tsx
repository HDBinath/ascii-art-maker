'use client';

import React, { useState } from 'react';
import { GalleryPost } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import Link from 'next/link';
import {
  X,
  Heart,
  Download,
  Copy,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  Maximize2,
  Hash,
  Share2,
} from 'lucide-react';

interface GalleryDetailModalProps {
  post: GalleryPost | null;
  onClose: () => void;
  onLike?: (postId: string, newLikesCount?: number) => Promise<void> | void;
  onToast?: (msg: string) => void;
  onRemix?: (post: GalleryPost) => void;
}

export const GalleryDetailModal: React.FC<GalleryDetailModalProps> = ({
  post,
  onClose,
  onLike,
  onToast,
  onRemix,
}) => {
  const [isLiking, setIsLiking] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [localLikes, setLocalLikes] = useState<number | null>(null);

  if (!post) return null;

  const currentLikes = localLikes !== null ? localLikes : post.likesCount;

  const showToast = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    soundFx.playClick();
    const nextLikes = (localLikes !== null ? localLikes : post.likesCount) + 1;
    setLocalLikes(nextLikes);
    try {
      if (onLike) {
        await onLike(post.id, nextLikes);
      } else {
        await fetch(`/api/gallery/posts/${post.id}/like`, { method: 'POST' });
      }
    } catch {
      showToast('Failed to like artwork');
    } finally {
      setIsLiking(false);
    }
  };

  const handleCopyAscii = () => {
    if (!post.plainText) {
      showToast('No plain text ASCII available for this artwork.');
      return;
    }
    soundFx.playClick();
    navigator.clipboard.writeText(post.plainText)
      .then(() => {
        setCopiedText(true);
        showToast('Copied ASCII art to clipboard!');
        setTimeout(() => setCopiedText(false), 2000);
      })
      .catch(() => showToast('Clipboard access denied.'));
  };

  const handleDownloadImage = () => {
    soundFx.playScan();
    const link = document.createElement('a');
    link.href = post.imageUrl || `/api/gallery/image/${post.imageKey}`;
    link.download = `orbit_${post.mode}_${post.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Artwork image downloaded!');
  };

  const handleShare = () => {
    soundFx.playClick();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/gallery?view=${post.id}` : '';
    if (navigator.share && url) {
      navigator.share({
        title: post.title,
        text: `Check out "${post.title}" on Orbit Cyber Studio Gallery!`,
        url,
      }).catch(() => {});
    } else if (url) {
      navigator.clipboard.writeText(url)
        .then(() => showToast('Share link copied to clipboard!'))
        .catch(() => showToast('Failed to copy link.'));
    }
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="gallery-modal-overlay" onClick={onClose}>
      <div
        className="gallery-modal-card detail-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gallery-modal-header">
          <div className="flex items-center gap-2">
            <span className="gallery-mode-pill">{post.mode.toUpperCase()}</span>
            <span className="gallery-modal-title truncate">{post.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="gallery-modal-icon-btn"
              onClick={handleShare}
              title="Share artwork link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="gallery-modal-close-btn"
              onClick={onClose}
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="gallery-modal-body detail-modal-grid">
          {/* Main Artwork Preview Canvas */}
          <div className="detail-image-panel">
            <div className="detail-image-stage">
              <img
                src={post.imageUrl || `/api/gallery/image/${post.imageKey}`}
                alt={post.title}
                className="detail-main-img"
              />
            </div>
          </div>

          {/* Details & Action Panel */}
          <div className="detail-info-panel">
            {/* Title & Creator */}
            <div className="detail-meta-header">
              <h2 className="detail-artwork-title">{post.title}</h2>
              <div className="detail-creator-row">
                <img
                  src={post.userAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                  alt={post.userName}
                  className="creator-avatar"
                />
                <div className="creator-details">
                  <span className="creator-name">{post.userName}</span>
                  <span className="detail-date">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {post.description && (
              <div className="detail-description-box">
                <p>{post.description}</p>
              </div>
            )}

            {/* Render Specs Badges */}
            <div className="detail-specs-grid">
              <div className="detail-spec-chip">
                <span className="spec-label">DIMENSIONS</span>
                <span className="spec-value">
                  <Maximize2 className="w-3 h-3 text-neutral-400 inline mr-1" />
                  {post.width} × {post.height}
                </span>
              </div>
              <div className="detail-spec-chip">
                <span className="spec-label">DENSITY</span>
                <span className="spec-value">
                  <Hash className="w-3 h-3 text-pink-400 inline mr-1" />
                  {(post.width * post.height).toLocaleString()} {post.unitName}
                </span>
              </div>
              <div className="detail-spec-chip">
                <span className="spec-label">RENDER ENGINE</span>
                <span className="spec-value">
                  <Layers className="w-3 h-3 text-cyan-400 inline mr-1" />
                  {post.mode.toUpperCase()}
                </span>
              </div>
              {post.options?.palette && (
                <div className="detail-spec-chip">
                  <span className="spec-label">COLOR PALETTE</span>
                  <span className="spec-value uppercase">{post.options.palette}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="detail-actions-cluster">
              <button
                type="button"
                className={`btn-detail-action like-btn ${post.isLikedByMe ? 'liked' : ''}`}
                onClick={handleLike}
                disabled={isLiking}
              >
                <Heart className={`w-4 h-4 ${post.isLikedByMe || (localLikes !== null && localLikes > post.likesCount) ? 'fill-pink-500 text-pink-500' : 'text-pink-400'}`} />
                <span>{currentLikes} {currentLikes === 1 ? 'Like' : 'Likes'}</span>
              </button>

              <button
                type="button"
                className="btn-detail-action primary"
                onClick={handleDownloadImage}
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>

              {post.plainText && (
                <button
                  type="button"
                  className="btn-detail-action secondary"
                  onClick={handleCopyAscii}
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedText ? 'Copied!' : 'Copy ASCII Text'}</span>
                </button>
              )}

              {onRemix ? (
                <button
                  type="button"
                  className="btn-detail-action remix-btn"
                  onClick={() => {
                    onClose();
                    onRemix(post);
                  }}
                >
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Remix in Studio</span>
                </button>
              ) : (
                <Link
                  href="/studio"
                  className="btn-detail-action remix-btn"
                  onClick={onClose}
                >
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Open Studio</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
