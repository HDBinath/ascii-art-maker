'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, Show } from '@clerk/nextjs';
import { GalleryPost } from '@/lib/types';
import { getAllSavedArtworks, deleteArtworkFromVault, SavedArtwork } from '@/lib/artStorage';
import { GalleryDetailModal } from '@/components/GalleryDetailModal';
import { PublishGalleryModal } from '@/components/PublishGalleryModal';
import {
  Globe,
  ArrowLeft,
  Sliders,
  Layers,
  Sparkles,
  Heart,
  Trash2,
  Download,
  Copy,
  ExternalLink,
  Flame,
  Binary,
  Terminal,
  Share2,
  RefreshCw,
  PlusCircle,
  FolderLock,
  CloudUpload,
  User,
  Shield,
  Eye,
} from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { userId } = useAuth();

  const [activeTab, setActiveTab] = useState<'published' | 'vault'>('published');
  
  // Cloud Posts State
  const [cloudPosts, setCloudPosts] = useState<GalleryPost[]>([]);
  const [loadingCloud, setLoadingCloud] = useState<boolean>(true);
  
  // Local Vault State
  const [vaultArtworks, setVaultArtworks] = useState<SavedArtwork[]>([]);
  const [loadingVault, setLoadingVault] = useState<boolean>(true);

  // Modals & Toast
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null);
  const [publishModalArt, setPublishModalArt] = useState<SavedArtwork | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch Cloud Published Posts
  const fetchUserCloudPosts = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingCloud(true);
      const res = await fetch(`/api/gallery/posts?userId=${encodeURIComponent(userId)}&limit=100&sort=newest`);
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setCloudPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load user cloud posts:', err);
    } finally {
      setLoadingCloud(false);
    }
  }, [userId]);

  // Fetch Local IndexedDB Vault
  const fetchLocalVault = useCallback(async () => {
    try {
      setLoadingVault(true);
      const items = await getAllSavedArtworks();
      setVaultArtworks(items);
    } catch (err) {
      console.error('Failed to load local vault:', err);
    } finally {
      setLoadingVault(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn && userId) {
      fetchUserCloudPosts();
    }
    fetchLocalVault();
  }, [isSignedIn, userId, fetchUserCloudPosts, fetchLocalVault]);

  // Delete Published Post from D1 + R2
  const handleDeleteCloudPost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this artwork from the Community Gallery?')) {
      return;
    }

    try {
      setIsDeletingId(postId);
      const res = await fetch(`/api/gallery/posts/${postId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCloudPosts(prev => prev.filter(p => p.id !== postId));
        showToast('Artwork deleted from Community Gallery');
      } else {
        showToast(data.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting artwork');
    } finally {
      setIsDeletingId(null);
    }
  };

  // Delete Local Vault Artwork
  const handleDeleteVaultArt = async (artId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this artwork from your private browser vault?')) {
      return;
    }
    await deleteArtworkFromVault(artId);
    await fetchLocalVault();
    showToast('Artwork removed from local vault');
  };

  // Download PNG helper
  const handleDownloadImage = (url: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('PNG Downloaded!');
  };

  // Copy ASCII text helper
  const handleCopyText = (text: string | null | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (text) {
      navigator.clipboard.writeText(text);
      showToast('Copied ASCII text to clipboard!');
    }
  };

  // Remix in Studio
  const handleRemix = (post: GalleryPost) => {
    if (post.optionsJson || post.options) {
      try {
        sessionStorage.setItem('orbit_remix_options', post.optionsJson || JSON.stringify(post.options));
        sessionStorage.setItem('orbit_remix_mode', post.mode);
      } catch {}
    }
    router.push('/studio');
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'dither':
        return <Flame className="w-3.5 h-3.5 text-pink-400" />;
      case 'hybrid':
        return <Binary className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  // Calculate total likes received across all cloud posts
  const totalLikesReceived = cloudPosts.reduce((acc, p) => acc + (p.likesCount || 0), 0);

  return (
    <div className="account-page-wrapper min-h-screen text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="gallery-toast-pill animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Account Navigation Header */}
      <header className="account-top-header">
        <div className="account-header-inner max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="btn-utility" title="Return to Landing Page">
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link href="/gallery" className="btn-utility" title="Community Gallery">
              <Globe className="w-4 h-4 text-pink-400" />
              <span>Gallery</span>
            </Link>
            <Link href="/studio" className="btn-utility text-pink-400" title="Launch Studio">
              <Sliders className="w-4 h-4" />
              <span>Studio</span>
            </Link>
          </div>

          <div className="brand-badge-sm flex items-center gap-2">
            <span className="brand-asterisk-icon-sm">✦</span>
            <span className="font-mono text-xs tracking-widest text-neutral-400">CREATOR HUB // VAULT</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Show when="signed-out">
          <div className="account-signin-card max-w-md mx-auto my-16 p-8 text-center bg-neutral-900/80 border border-neutral-800 rounded-2xl backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-cyan-500/20 border border-pink-500/40 flex items-center justify-center">
              <User className="w-8 h-8 text-pink-400" />
            </div>
            <h2 className="text-2xl font-bold font-mono tracking-wider text-white mb-2">
              CREATOR AUTHENTICATION
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              Sign in to manage your published community artworks, view real-time likes metrics, and sync your creations.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/sign-in" className="btn-cta-launch-sm w-full justify-center">
                <span>Sign In to Account</span>
              </Link>
              <Link href="/sign-up" className="btn-utility w-full justify-center">
                <span>Create New Account</span>
              </Link>
            </div>
          </div>
        </Show>

        <Show when="signed-in">
          {/* User Profile Banner & Stats */}
          <div className="account-profile-banner mb-10 p-6 md:p-8 rounded-2xl border border-neutral-800/80 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 shadow-2xl relative overflow-hidden">
            <div className="banner-cyber-grid-overlay" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Avatar & User Info */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-pink-500/50 shadow-lg shadow-pink-500/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-neutral-800 border-2 border-pink-500/50 flex items-center justify-center font-mono text-2xl font-bold text-pink-400">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center" title="Active Creator">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-wide">
                      {user?.fullName || user?.username || 'Cyber Pilot'}
                    </h1>
                    <span className="creator-badge-pill">PILOT</span>
                  </div>
                  <p className="text-xs font-mono text-neutral-400">
                    {user?.primaryEmailAddress?.emailAddress || `@${user?.username || 'user'}`}
                  </p>
                </div>
              </div>

              {/* Creator Metrics */}
              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <div className="stat-metric-card">
                  <div className="stat-metric-val">{cloudPosts.length}</div>
                  <div className="stat-metric-label">PUBLISHED ARTS</div>
                </div>
                <div className="stat-metric-card">
                  <div className="stat-metric-val text-pink-400 flex items-center gap-1 justify-center">
                    <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
                    <span>{totalLikesReceived}</span>
                  </div>
                  <div className="stat-metric-label">COMMUNITY LIKES</div>
                </div>
                <div className="stat-metric-card">
                  <div className="stat-metric-val text-cyan-400">{vaultArtworks.length}</div>
                  <div className="stat-metric-label">LOCAL VAULT</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="account-tabs-dock flex items-center justify-between flex-wrap gap-4 mb-8 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('published')}
                className={`account-tab-btn ${activeTab === 'published' ? 'active' : ''}`}
              >
                <Globe className="w-4 h-4" />
                <span>Community Published</span>
                <span className="tab-count-badge">{cloudPosts.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vault')}
                className={`account-tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
              >
                <FolderLock className="w-4 h-4" />
                <span>Private Browser Vault</span>
                <span className="tab-count-badge">{vaultArtworks.length}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'published') fetchUserCloudPosts();
                  else fetchLocalVault();
                }}
                className="btn-utility text-xs"
                title="Refresh creations"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>

              <Link href="/studio" className="btn-cta-launch-sm text-xs py-2 px-3">
                <PlusCircle className="w-4 h-4" />
                <span>New Creation</span>
              </Link>
            </div>
          </div>

          {/* =================================================================
              TAB 1: PUBLISHED COMMUNITY POSTS (D1 Database)
              ================================================================= */}
          {activeTab === 'published' && (
            <div>
              {loadingCloud ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="account-art-skeleton animate-pulse" />
                  ))}
                </div>
              ) : cloudPosts.length === 0 ? (
                <div className="account-empty-state">
                  <div className="account-empty-icon-box">
                    <CloudUpload className="w-8 h-8 text-pink-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No Published Artworks Yet</h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
                    You haven't posted any artwork to the Community Gallery. Launch Studio, create an ASCII or Dither piece, and click <strong>Post to Gallery</strong>.
                  </p>
                  <Link href="/studio" className="btn-cta-launch-sm inline-flex items-center gap-2">
                    <span>Open Studio</span>
                    <Sliders className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {cloudPosts.map((post) => (
                    <div
                      key={post.id}
                      className="account-art-card group"
                      onClick={() => setSelectedPost(post)}
                    >
                      <div className="account-art-thumb-wrap">
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt={post.title} className="account-art-img" />
                        ) : (
                          <div className="account-art-placeholder">
                            <Layers className="w-8 h-8 text-neutral-600" />
                          </div>
                        )}

                        <div className="account-art-overlay">
                          <button
                            type="button"
                            className="btn-vault-icon"
                            onClick={(e) => post.imageUrl && handleDownloadImage(post.imageUrl, post.title, e)}
                            title="Download PNG"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {post.plainText && (
                            <button
                              type="button"
                              className="btn-vault-icon"
                              onClick={(e) => handleCopyText(post.plainText, e)}
                              title="Copy ASCII Text"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-vault-icon danger"
                            onClick={(e) => handleDeleteCloudPost(post.id, e)}
                            title="Delete Post"
                            disabled={isDeletingId === post.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <span className={`carousel-mode-badge ${post.mode}`}>
                          {getModeIcon(post.mode)}
                          <span>{post.mode.toUpperCase()}</span>
                        </span>
                      </div>

                      <div className="account-art-info">
                        <h4 className="account-art-title">{post.title}</h4>
                        <div className="account-art-meta">
                          <span>{post.width} × {post.height} {post.unitName}</span>
                          <div className="flex items-center gap-1 text-pink-400">
                            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                            <span>{post.likesCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 2: PRIVATE BROWSER VAULT (IndexedDB)
              ================================================================= */}
          {activeTab === 'vault' && (
            <div>
              {loadingVault ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="account-art-skeleton animate-pulse" />
                  ))}
                </div>
              ) : vaultArtworks.length === 0 ? (
                <div className="account-empty-state">
                  <div className="account-empty-icon-box">
                    <FolderLock className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Browser Vault is Empty</h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
                    Creations saved to your private browser storage will appear here for fast offline access.
                  </p>
                  <Link href="/studio" className="btn-cta-launch-sm inline-flex items-center gap-2">
                    <span>Open Studio</span>
                    <Sliders className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {vaultArtworks.map((art) => (
                    <div
                      key={art.id}
                      className="account-art-card group"
                    >
                      <div className="account-art-thumb-wrap">
                        <img
                          src={art.thumbnailDataUrl}
                          alt={art.title}
                          className="account-art-img"
                        />

                        <div className="account-art-overlay">
                          <button
                            type="button"
                            className="btn-vault-icon"
                            onClick={(e) => handleDownloadImage(art.fullDataUrl || art.thumbnailDataUrl, art.title, e)}
                            title="Download PNG"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {art.plainText && (
                            <button
                              type="button"
                              className="btn-vault-icon"
                              onClick={(e) => handleCopyText(art.plainText, e)}
                              title="Copy ASCII Text"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-vault-icon danger"
                            onClick={(e) => handleDeleteVaultArt(art.id, e)}
                            title="Delete from Vault"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <span className={`carousel-mode-badge ${art.mode}`}>
                          {getModeIcon(art.mode)}
                          <span>{art.mode.toUpperCase()}</span>
                        </span>
                      </div>

                      <div className="account-art-info">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="account-art-title">{art.title}</h4>
                        </div>
                        <div className="account-art-meta mb-3">
                          <span>{art.stats.width} × {art.stats.height} {art.stats.unitName}</span>
                          <span>{new Date(art.timestamp).toLocaleDateString()}</span>
                        </div>

                        {/* Publish to Community Button */}
                        <button
                          type="button"
                          onClick={() => setPublishModalArt(art)}
                          className="btn-vault-publish-inline w-full"
                        >
                          <CloudUpload className="w-3.5 h-3.5" />
                          <span>Publish to Gallery</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Show>
      </main>

      {/* Published Post Inspection Modal */}
      {selectedPost && (
        <GalleryDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={(postId: string, newLikes?: number) => {
            setCloudPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: newLikes || p.likesCount + 1 } : p));
          }}
          onToast={showToast}
          onRemix={handleRemix}
        />
      )}

      {/* Publish from Local Vault Modal */}
      {publishModalArt && (
        <PublishGalleryModal
          isOpen={true}
          onClose={() => setPublishModalArt(null)}
          onPublished={() => {
            setPublishModalArt(null);
            fetchUserCloudPosts();
            showToast('Artwork published to Community Gallery!');
            setActiveTab('published');
          }}
          initialTitle={publishModalArt.title}
          mode={publishModalArt.mode}
          renderStats={{
            width: publishModalArt.stats.width,
            height: publishModalArt.stats.height,
            count: publishModalArt.stats.count,
            unitName: publishModalArt.stats.unitName,
          }}
          imageBase64={publishModalArt.fullDataUrl || publishModalArt.thumbnailDataUrl}
          plainText={publishModalArt.plainText}
          renderOptions={publishModalArt.options}
        />
      )}
    </div>
  );
}
