import { NextRequest, NextResponse } from 'next/server';
import { recordOpen, recordClick, findLogByTrackingId } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 1x1 transparent GIF
const PIXEL_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const PIXEL = Buffer.from(PIXEL_B64, 'base64');

function pixelResponse(): NextResponse {
  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}

/**
 * Public tracking endpoint, hit by email clients and link clicks.
 *  - /api/t?type=open&id=<trackingId>  -> records an open, returns 1x1 pixel
 *  - /api/t?type=click&id=<trackingId>&url=<encoded> -> records click, redirects
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const id = req.nextUrl.searchParams.get('id') || '';

  const known = id ? !!findLogByTrackingId(id) : false;

  if (type === 'click') {
    if (known) {
      const raw = req.nextUrl.searchParams.get('url') || '';
      let target = raw;
      try { target = decodeURIComponent(raw); } catch { /* keep raw */ }
      if (/^https?:\/\//i.test(target)) {
        recordClick(id, target);
        return NextResponse.redirect(target);
      }
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Default + open: serve the pixel (record open only if the log exists).
  if (known) recordOpen(id);
  return pixelResponse();
}
