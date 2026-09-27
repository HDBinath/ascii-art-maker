import { NextRequest, NextResponse } from 'next/server';
import { getImageFromR2 } from '@/lib/cloudflareEnv';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await context.params;
    if (!key || key.length === 0) {
      return new NextResponse('Invalid image key', { status: 400 });
    }

    const fullKey = key.join('/');
    const result = await getImageFromR2(fullKey);

    if (!result) {
      return new NextResponse('Image not found', { status: 404 });
    }

    return new Response(result.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': result.contentType || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving gallery image:', error);
    return new NextResponse('Failed to serve image', { status: 500 });
  }
}
