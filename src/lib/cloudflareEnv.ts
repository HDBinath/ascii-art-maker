import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GalleryPost } from './types';

// In-memory local fallback store for development when D1/R2 bindings are not active in `next dev`
const localMemoryStore = {
  posts: [] as GalleryPost[],
  images: new Map<string, { buffer: Uint8Array; contentType: string }>(),
  likes: new Set<string>(), // `${userId}:${postId}`
};

export interface R2BucketBinding {
  put: (key: string, value: Uint8Array | ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string } }) => Promise<any>;
  get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete: (key: string) => Promise<any>;
}

export interface D1DatabaseBinding {
  prepare: (query: string) => {
    bind: (...args: any[]) => {
      run: () => Promise<{ success: boolean }>;
      all: <T = any>() => Promise<{ results: T[]; success: boolean }>;
      first: <T = any>(colName?: string) => Promise<T | null>;
    };
  };
}

export interface CloudflareEnv {
  GALLERY_BUCKET?: R2BucketBinding;
  orbit_gallery?: R2BucketBinding;
  DB?: D1DatabaseBinding;
  orbit_gallery_db?: D1DatabaseBinding;
}

export function getSafeCloudflareEnv(): CloudflareEnv {
  try {
    const ctx = getCloudflareContext();
    if (ctx && ctx.env) {
      return ctx.env as CloudflareEnv;
    }
  } catch {
    // Running outside OpenNext worker (e.g. Next.js local development)
  }
  return {};
}

function getBucket(env: CloudflareEnv): R2BucketBinding | undefined {
  return env.orbit_gallery || env.GALLERY_BUCKET;
}

function getDatabase(env: CloudflareEnv): D1DatabaseBinding | undefined {
  return env.orbit_gallery_db || env.DB;
}

// ---------------------------------------------------------------------------
// R2 Storage Helpers (with local fallback)
// ---------------------------------------------------------------------------
export async function saveImageToR2(key: string, buffer: Uint8Array, contentType = 'image/png'): Promise<string> {
  const env = getSafeCloudflareEnv();
  const bucket = getBucket(env);
  if (bucket) {
    await bucket.put(key, buffer, {
      httpMetadata: { contentType },
    });
    return key;
  }

  // Fallback to local memory store
  localMemoryStore.images.set(key, { buffer, contentType });
  return key;
}

export async function getImageFromR2(key: string): Promise<{ buffer: Uint8Array; contentType: string } | null> {
  const env = getSafeCloudflareEnv();
  const bucket = getBucket(env);
  if (bucket) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    const arrayBuffer = await new Response(obj.body).arrayBuffer();
    return {
      buffer: new Uint8Array(arrayBuffer),
      contentType: obj.httpMetadata?.contentType || 'image/png',
    };
  }

  // Fallback from local memory store
  const item = localMemoryStore.images.get(key);
  if (item) return item;
  return null;
}

// ---------------------------------------------------------------------------
// D1 Database Helpers (with local fallback)
// ---------------------------------------------------------------------------
export async function insertGalleryPostToDB(post: GalleryPost): Promise<GalleryPost> {
  const env = getSafeCloudflareEnv();
  const db = getDatabase(env);
  if (db) {
    await db.prepare(`
      INSERT INTO gallery_posts (
        id, user_id, user_name, user_avatar, title, description, mode,
        image_key, thumbnail_key, plain_text, width, height, unit_name,
        options_json, likes_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      post.id,
      post.userId,
      post.userName,
      post.userAvatar || null,
      post.title,
      post.description || null,
      post.mode,
      post.imageKey,
      post.thumbnailKey || null,
      post.plainText || null,
      post.width,
      post.height,
      post.unitName,
      post.optionsJson || (post.options ? JSON.stringify(post.options) : null),
      post.likesCount || 0,
      post.createdAt || Date.now()
    ).run();
    return post;
  }

  // Fallback to local memory store
  localMemoryStore.posts.unshift(post);
  return post;
}

export async function queryGalleryPostsFromDB(
  mode: string = 'all',
  sort: string = 'newest',
  limit: number = 40,
  offset: number = 0,
  userId?: string
): Promise<{ posts: GalleryPost[]; total: number }> {
  const env = getSafeCloudflareEnv();
  const db = getDatabase(env);
  if (db) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (mode && mode !== 'all') {
      conditions.push('mode = ?');
      params.push(mode);
    }

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'likes' ? 'likes_count DESC, created_at DESC' : 'created_at DESC';

    const countQuery = `SELECT COUNT(*) as total FROM gallery_posts ${whereClause}`;
    const countStmt = params.length > 0
      ? db.prepare(countQuery).bind(...params)
      : db.prepare(countQuery).bind();
    const countRes = await countStmt.first<{ total: number }>();
    const total = countRes?.total || 0;

    const listQuery = `SELECT * FROM gallery_posts ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const listStmt = params.length > 0
      ? db.prepare(listQuery).bind(...params, limit, offset)
      : db.prepare(listQuery).bind(limit, offset);
    
    const rows = await listStmt.all<any>();
    const posts: GalleryPost[] = (rows.results || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userAvatar: r.user_avatar,
      title: r.title,
      description: r.description,
      mode: r.mode,
      imageKey: r.image_key,
      thumbnailKey: r.thumbnail_key,
      plainText: r.plain_text,
      width: r.width,
      height: r.height,
      unitName: r.unit_name,
      optionsJson: r.options_json,
      options: r.options_json ? JSON.parse(r.options_json) : undefined,
      likesCount: r.likes_count,
      createdAt: r.created_at,
    }));

    return { posts, total };
  }

  // Fallback from local memory store
  let filtered = [...localMemoryStore.posts];
  if (mode && mode !== 'all') {
    filtered = filtered.filter(p => p.mode === mode);
  }
  if (userId) {
    filtered = filtered.filter(p => p.userId === userId);
  }
  if (sort === 'likes') {
    filtered.sort((a, b) => b.likesCount - a.likesCount || b.createdAt - a.createdAt);
  } else {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);
  return { posts: paginated, total };
}

export async function incrementPostLikeInDB(postId: string): Promise<number> {
  const env = getSafeCloudflareEnv();
  const db = getDatabase(env);
  if (db) {
    await db.prepare(`
      UPDATE gallery_posts SET likes_count = likes_count + 1 WHERE id = ?
    `).bind(postId).run();

    const post = await db.prepare(`
      SELECT likes_count FROM gallery_posts WHERE id = ?
    `).bind(postId).first<{ likes_count: number }>();

    return post?.likes_count || 1;
  }

  // Fallback in memory
  const found = localMemoryStore.posts.find(p => p.id === postId);
  if (found) {
    found.likesCount = (found.likesCount || 0) + 1;
    return found.likesCount;
  }
  return 1;
}

export async function deleteGalleryPostFromDB(postId: string, userId: string): Promise<boolean> {
  const env = getSafeCloudflareEnv();
  const db = getDatabase(env);
  const bucket = getBucket(env);

  if (db) {
    // Find post to check ownership and get imageKey
    const post = await db.prepare(`SELECT user_id, image_key, thumbnail_key FROM gallery_posts WHERE id = ?`)
      .bind(postId)
      .first<{ user_id: string; image_key: string; thumbnail_key: string | null }>();

    if (!post || post.user_id !== userId) {
      return false;
    }

    // Delete image from R2 if bucket is bound
    if (bucket && post.image_key) {
      try {
        await bucket.delete(post.image_key);
        if (post.thumbnail_key) {
          await bucket.delete(post.thumbnail_key);
        }
      } catch (err) {
        console.warn('Error deleting R2 image key:', err);
      }
    }

    // Delete record from D1
    await db.prepare(`DELETE FROM gallery_posts WHERE id = ? AND user_id = ?`).bind(postId, userId).run();
    return true;
  }

  // Fallback in memory
  const index = localMemoryStore.posts.findIndex(p => p.id === postId && p.userId === userId);
  if (index !== -1) {
    const post = localMemoryStore.posts[index];
    if (post.imageKey) localMemoryStore.images.delete(post.imageKey);
    localMemoryStore.posts.splice(index, 1);
    return true;
  }
  return false;
}
