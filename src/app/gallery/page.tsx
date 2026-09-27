'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { GalleryPost, GalleryModeFilter, GallerySortOption } from '@/lib/types';
import { GalleryDetailModal } from '@/components/GalleryDetailModal';
import { soundFx } from '@/lib/soundFx';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Show, UserButton } from '@clerk/nextjs';
import {
  ArrowLeft,
  Globe,
  Sliders,
  Sparkles,
  Heart,
  Download,
  Terminal,
  Flame,
  Binary,
  Layers,
  CheckCircle2,
  RefreshCw,
  LogIn,
  UserPlus,
} from 'lucide-react';

function GalleryContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeMode, setActiveMode] = useState<GalleryModeFilter>('all');
  const [activeSort, setActiveSort] = useState<GallerySortOption>('newest');
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [likedPostsSet, setLikedPostsSet] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        mode: activeMode,
        sort: activeSort,
        limit: '50',
      });
      const res = await fetch(`/api/gallery/posts?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);

        // Check if there is a ?view=id in URL
        const viewId = searchParams.get('view');
        if (viewId) {
          const match = data.posts.find((p: GalleryPost) => p.id === viewId);
          if (match) setSelectedPost(match);
        }
      }
    } catch (err) {
      console.error('Failed to load gallery posts:', err);
      showToast('Could not load community feed.');
    } finally {
      setIsLoading(false);
    }
  }, [activeMode, activeSort, searchParams]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle Likes
  const handleLikePost = async (postId: string) => {
    soundFx.playClick();
    try {
      const res = await fetch(`/api/gallery/posts/${postId}/like`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLikedPostsSet(prev => new Set(prev).add(postId));
        setPosts(prev =>
          prev.map(p => (p.id === postId ? { ...p, likesCount: data.likesCount, isLikedByMe: true } : p))
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(prev => prev ? { ...prev, likesCount: data.likesCount, isLikedByMe: true } : null);
        }
      }
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleCardClick = (post: GalleryPost) => {
    soundFx.playClick();
    setSelectedPost(post);
  };

  return (
    <div className="gallery-page-container">
      {/* Background Ambient Glow */}
      <div className="gallery-ambient-glow-1" />
      <div className="gallery-ambient-glow-2" />

      {/* Global Gallery Top Header */}
      <header className="cyber-header gallery-header">
        <div className="header-left">
          <Link href="/studio" className="btn-utility" title="Return to Cyber Studio">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="utility-label">Studio</span>
          </Link>
          <Link href="/" className="btn-utility header-home-btn" title="Return to Home">
            <span className="utility-label">Home</span>
          </Link>

          {/* Orbit Brand */}
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
            <span className="brand-tag">GLOBAL ARCHIVE</span>
          </div>
        </div>

        <div className="header-right">
          <Link href="/studio" className="btn-create-nav">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Create Artwork</span>
          </Link>

          {/* Clerk Auth Section */}
          <div className="header-auth-container flex items-center gap-2 ml-1">
            <Show when="signed-out">
              <Link href="/sign-in" className="btn-utility auth-btn-login" title="Sign In">
                <LogIn className="w-3.5 h-3.5" />
                <span className="utility-label">Sign In</span>
              </Link>
              <Link href="/sign-up" className="btn-utility auth-btn-register" title="Sign Up">
                <UserPlus className="w-3.5 h-3.5" />
                <span className="utility-label">Sign Up</span>
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

      {/* Main Gallery Scroll Area */}
      <main className="gallery-main-content">
        {/* Hero Banner */}
        <section className="gallery-hero-section">
          <div className="gallery-hero-badge">
            <Globe className="w-3.5 h-3.5 text-pink-400" />
            <span>GLOBAL COMMUNITY CYPHER ARCHIVE</span>
          </div>
          <h1 className="gallery-hero-heading">
            Community <span className="section-title-gradient">Creations & Masters</span>
          </h1>
          <p className="gallery-hero-desc">
            Explore retro dithered pixel art, sub-pixel ASCII typography, and hybrid phosphor renders published live by creators around the world.
          </p>
        </section>

        {/* Filter & Sort Controls Hub */}
        <div className="gallery-filter-hub">
          {/* Mode Tabs */}
          <div className="gallery-mode-filters">
            <button
              type="button"
              className={`gallery-filter-pill ${activeMode === 'all' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setActiveMode('all');
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ALL CREATIONS</span>
            </button>
            <button
              type="button"
              className={`gallery-filter-pill ${activeMode === 'ascii' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setActiveMode('ascii');
              }}
            >
              <Terminal className="w-3.5 h-3.5 text-green-400" />
              <span>ASCII ART</span>
            </button>
            <button
              type="button"
              className={`gallery-filter-pill ${activeMode === 'dither' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setActiveMode('dither');
              }}
            >
              <Flame className="w-3.5 h-3.5 text-pink-400" />
              <span>DITHERED PIXELS</span>
            </button>
            <button
              type="button"
              className={`gallery-filter-pill ${activeMode === 'hybrid' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setActiveMode('hybrid');
              }}
            >
              <Binary className="w-3.5 h-3.5 text-cyan-400" />
              <span>HYBRID PHOSPHOR</span>
            </button>
          </div>

          {/* Sort Switcher */}
          <div className="gallery-sort-group">
            <span className="sort-label">SORT:</span>
            <button
              type="button"
              className={`sort-pill ${activeSort === 'newest' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setActiveSort('newest');
              }}
            >
              NEWEST
            </button>
            <button
              type="button"
              className={`sort-pill ${activeSort === 'likes' ? 'active' : ''}`}
              onClick={() => {
                soundFx.playClick();
                setActiveSort('likes');
              }}
            >
              MOST POPULAR
            </button>
            <button
              type="button"
              className="gallery-refresh-btn"
              onClick={() => {
                soundFx.playClick();
                fetchPosts();
              }}
              title="Refresh feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <section className="gallery-grid-section">
          {isLoading ? (
            /* Loading Skeleton Grid */
            <div className="gallery-posts-grid">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="gallery-card skeleton-card">
                  <div className="skeleton-image-box animate-pulse" />
                  <div className="skeleton-meta-box">
                    <div className="skeleton-line w-3/4 animate-pulse" />
                    <div className="skeleton-line w-1/2 animate-pulse mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            /* Card Grid */
            <div className="gallery-posts-grid">
              {posts.map((post) => {
                const isLiked = likedPostsSet.has(post.id) || post.isLikedByMe;
                return (
                  <article
                    key={post.id}
                    className="gallery-post-card"
                    onClick={() => handleCardClick(post)}
                  >
                    {/* Image Preview Container */}
                    <div className="card-image-wrap">
                      <img
                        src={post.imageUrl || `/api/gallery/image/${post.imageKey}`}
                        alt={post.title}
                        className="card-main-image"
                        loading="lazy"
                      />
                      <span className={`card-mode-badge ${post.mode}`}>
                        {post.mode.toUpperCase()}
                      </span>
                      <div className="card-hover-overlay">
                        <span className="btn-card-inspect">Inspect Creation</span>
                      </div>
                    </div>

                    {/* Card Meta Content */}
                    <div className="card-meta-container">
                      <div className="card-header-row">
                        <h3 className="card-post-title truncate" title={post.title}>
                          {post.title}
                        </h3>
                      </div>

                      <div className="card-creator-bar">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={post.userAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                            alt={post.userName}
                            className="card-creator-avatar"
                          />
                          <span className="card-creator-name truncate">
                            {post.userName}
                          </span>
                        </div>

                        {/* Heart / Like Button */}
                        <button
                          type="button"
                          className={`card-like-btn ${isLiked ? 'liked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikePost(post.id);
                          }}
                          title="Like this artwork"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                          <span>{post.likesCount}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="gallery-empty-state">
              <div className="empty-icon-ring">
                <Globe className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="empty-title">NO CREATIONS IN THIS SECTOR YET</h3>
              <p className="empty-desc">
                Be the first cyber artist to render and broadcast an artwork in the {activeMode.toUpperCase()} archive.
              </p>
              <Link href="/studio" className="btn-empty-action">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Open Studio &amp; Create</span>
              </Link>
            </div>
          )}
        </section>
      </main>

      {/* Artwork Detail Modal */}
      {selectedPost && (
        <GalleryDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLikePost}
          onToast={showToast}
        />
      )}

      {/* Toast Alert */}
      {toastMsg && (
        <div className="cyber-toast-alert">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="gallery-page-container"><div className="p-8 text-neutral-400">Loading Community Gallery...</div></div>}>
      <GalleryContent />
    </Suspense>
  );
}
