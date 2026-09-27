import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteGalleryPostFromDB } from '@/lib/cloudflareEnv';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    if (!postId) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    let authUserId: string | null = null;
    try {
      const authResult = await auth();
      authUserId = authResult.userId;
    } catch {
      // Worker auth fallback
    }

    const { searchParams } = new URL(request.url);
    const userId = authUserId || searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. You must be signed in to delete this artwork.' },
        { status: 401 }
      );
    }

    const deleted = await deleteGalleryPostFromDB(postId, userId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Artwork not found or you do not have permission to delete it.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, message: 'Artwork deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting gallery post:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
}
