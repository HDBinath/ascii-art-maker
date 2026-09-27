'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GalleryPost } from '@/lib/types';
import { GalleryDetailModal } from './GalleryDetailModal';
import {
  Sparkles,
  Flame,
  Binary,
  Terminal,
  Heart,
  ArrowRight,
  Eye,
  Sliders,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface LandingGalleryCarouselProps {
  onRemix?: (post: GalleryPost) => void;
}

export const LandingGalleryCarousel: React.FC<LandingGalleryCarouselProps> = ({ onRemix }) => {
  const router = useRouter();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Fetch top 20 recent arts
  const fetchRecentArts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gallery/posts?limit=20&sort=newest');
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load recent carousel arts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentArts();
  }, []);

  const handlePostLiked = (postId: string, newLikes?: number) => {
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, likesCount: newLikes ?? (p.likesCount + 1) } : p))
    );
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(prev => (prev ? { ...prev, likesCount: newLikes ?? (prev.likesCount + 1) } : null));
    }
  };

  const handleRemix = (post: GalleryPost) => {
    if (onRemix) {
      onRemix(post);
    } else {
      if (post.optionsJson || post.options) {
        try {
          sessionStorage.setItem('orbit_remix_options', post.optionsJson || JSON.stringify(post.options));
          sessionStorage.setItem('orbit_remix_mode', post.mode);
        } catch {}
      }
      router.push('/studio');
    }
  };

  // Split posts into 2 rows
  // If fewer than 4 items, duplicate items to allow continuous smooth marquee animation
  const effectivePosts = posts.length > 0 ? posts : [];
  
  // Row 1: odd indices (0, 2, 4, ...)
  // Row 2: even indices (1, 3, 5, ...)
  const row1Posts = effectivePosts.filter((_, idx) => idx % 2 === 0);
  const row2Posts = effectivePosts.filter((_, idx) => idx % 2 === 1);

  // To make continuous looping seamless, duplicate list
  const duplicatedRow1 = [...row1Posts, ...row1Posts, ...row1Posts];
  const duplicatedRow2 = [...row2Posts, ...row2Posts, ...row2Posts];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'dither':
        return <Flame className="w-3 h-3 text-pink-400" />;
      case 'hybrid':
        return <Binary className="w-3 h-3 text-cyan-400" />;
      default:
        return <Terminal className="w-3 h-3 text-emerald-400" />;
    }
  };

  const renderCard = (post: GalleryPost, keyPrefix: string, index: number) => (
    <div
      key={`${keyPrefix}-${post.id}-${index}`}
      className="carousel-cyber-card"
      onClick={() => setSelectedPost(post)}
    >
      <div className="carousel-card-thumb-wrap">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={post.title}
            className="carousel-card-img"
            loading="lazy"
          />
        ) : (
          <div className="carousel-card-placeholder">
            <Layers className="w-8 h-8 text-neutral-600" />
          </div>
        )}
        <div className="carousel-card-overlay">
          <button
            type="button"
            className="btn-carousel-inspect"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPost(post);
            }}
          >
            <Eye className="w-4 h-4" />
            <span>Inspect</span>
          </button>
          <button
            type="button"
            className="btn-carousel-remix"
            onClick={(e) => {
              e.stopPropagation();
              handleRemix(post);
            }}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Remix</span>
          </button>
        </div>

        <span className={`carousel-mode-badge ${post.mode}`}>
          {getModeIcon(post.mode)}
          <span>{post.mode.toUpperCase()}</span>
        </span>
      </div>

      <div className="carousel-card-info">
        <h4 className="carousel-card-title">{post.title}</h4>
        <div className="carousel-card-meta">
          <div className="carousel-card-author">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt="" className="carousel-avatar-img" />
            ) : (
              <div className="carousel-avatar-fallback">
                {post.userName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="carousel-author-name">{post.userName}</span>
          </div>

          <div className="carousel-card-likes">
            <Heart className={`w-3.5 h-3.5 ${post.likesCount > 0 ? 'fill-pink-500 text-pink-500' : 'text-neutral-500'}`} />
            <span>{post.likesCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="landing-carousel-container">
      {/* Top Header Controls */}
      <div className="carousel-header-dock">
        <div className="carousel-header-left">
          <div className="carousel-live-pill">
            <span className="live-dot" />
            <span>LIVE COMMUNITY FEED</span>
          </div>
          <span className="carousel-count-tag">
            {posts.length > 0 ? `${posts.length} RECENT CREATIONS` : 'READY TO POST'}
          </span>
        </div>

        <div className="carousel-header-right">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="btn-carousel-control"
            title={isPaused ? 'Resume Auto-Scroll' : 'Pause Auto-Scroll'}
          >
            <span>{isPaused ? '▶ RESUME' : '⏸ PAUSE'}</span>
          </button>

          <Link href="/gallery" className="btn-carousel-explore">
            <span>Explore Gallery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Dual-Row Carousel */}
      {loading ? (
        <div className="carousel-loading-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="carousel-skeleton-card animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="carousel-empty-showcase">
          <div className="carousel-empty-box">
            <Sparkles className="w-8 h-8 text-pink-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Be the First Creator</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
              Export your ASCII and dither artworks from Studio and click <strong>Post to Gallery</strong> to showcase your work here.
            </p>
            <Link href="/studio" className="btn-cta-launch-sm inline-flex items-center gap-2">
              <span>Create in Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={`carousel-tracks-wrapper ${isPaused ? 'is-paused' : ''}`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Row 1: Scrolling Left */}
          <div className="carousel-row-track track-left">
            <div className="carousel-track-inner">
              {duplicatedRow1.map((post, i) => renderCard(post, 'r1', i))}
            </div>
          </div>

          {/* Row 2: Scrolling Right */}
          {row2Posts.length > 0 && (
            <div className="carousel-row-track track-right mt-4">
              <div className="carousel-track-inner">
                {duplicatedRow2.map((post, i) => renderCard(post, 'r2', i))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Artwork Detail Modal */}
      {selectedPost && (
        <GalleryDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handlePostLiked}
          onRemix={handleRemix}
        />
      )}
    </div>
  );
};
