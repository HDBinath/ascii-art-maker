import { NextRequest, NextResponse } from 'next/server';
import { incrementPostLikeInDB } from '@/lib/cloudflareEnv';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const likesCount = await incrementPostLikeInDB(id);

    return NextResponse.json({
      success: true,
      id,
      likesCount,
    });
  } catch (error: any) {
    console.error('Error liking post:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update like' },
      { status: 500 }
    );
  }
}
