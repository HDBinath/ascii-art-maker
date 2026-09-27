import { NextRequest, NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';
import { insertGalleryPostToDB, queryGalleryPostsFromDB, saveImageToR2 } from '@/lib/cloudflareEnv';
import { GalleryPost } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { posts, total } = await queryGalleryPostsFromDB(mode, sort, limit, offset);

    // Map image keys to image delivery proxy routes
    const enrichedPosts = posts.map(p => ({
      ...p,
      imageUrl: p.imageKey ? `/api/gallery/image/${p.imageKey}` : undefined,
    }));

    return NextResponse.json({
      success: true,
      posts: enrichedPosts,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching gallery posts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let clerkUser: any = null;
    try {
      clerkUser = await currentUser();
    } catch {
      // Edge worker context handling
    }

    let authUserId: string | null = null;
    try {
      const authResult = await auth();
      authUserId = authResult.userId;
    } catch {}

    const body = await request.json();
    const {
      title,
      description,
      mode = 'ascii',
      imageBase64,
      plainText = '',
      stats = { width: 0, height: 0, count: 0, unitName: 'CHARS' },
      options = null,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Artwork title is required' },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Rendered image data is required' },
        { status: 400 }
      );
    }

    // Determine user profile
    const userId = authUserId || clerkUser?.id || body.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'You must be signed in to post artwork to the gallery.' },
        { status: 401 }
      );
    }

    const userName =
      clerkUser?.fullName ||
      clerkUser?.username ||
      clerkUser?.firstName ||
      (clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0]) ||
      body.userName ||
      'Cyber Pilot';

    const userAvatar = clerkUser?.imageUrl || body.userAvatar || null;

    // Convert data URL / base64 string into binary Uint8Array
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const imageKey = `posts/${postId}.png`;

    // Save image to R2
    await saveImageToR2(imageKey, binaryBuffer, 'image/png');

    // Create post record
    const postRecord: GalleryPost = {
      id: postId,
      userId,
      userName,
      userAvatar,
      title: title.trim(),
      description: description ? description.trim() : null,
      mode,
      imageKey,
      plainText: plainText || null,
      width: stats.width || 0,
      height: stats.height || 0,
      unitName: stats.unitName || (mode === 'dither' ? 'PIXELS' : 'CHARS'),
      options: options || undefined,
      optionsJson: options ? JSON.stringify(options) : null,
      likesCount: 0,
      createdAt: Date.now(),
    };

    // Save metadata to D1
    await insertGalleryPostToDB(postRecord);

    return NextResponse.json(
      {
        success: true,
        post: {
          ...postRecord,
          imageUrl: `/api/gallery/image/${imageKey}`,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating gallery post:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to publish post' },
      { status: 500 }
    );
  }
}
