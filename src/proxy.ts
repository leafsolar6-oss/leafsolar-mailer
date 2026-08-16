/**
 * Request proxy (Next.js 16 renamed middleware -> proxy).
 *
 * Gates the app behind the login page:
 *  - Public: /login, /welcome, /unsubscribe, auth/tracking/unsubscribe APIs,
 *    static assets.
 *  - Everything else requires the session cookie. Pages redirect to /login;
 *    API routes return 401 (they also re-validate the token server-side).
 *
 * Edge-safe: only uses request cookies + NextResponse.
 */
import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'ls_session';

const PUBLIC_PAGES = ['/login', '/welcome', '/unsubscribe', '/forgot-password', '/reset-password'];
// /api/scheduler is intentionally public at the proxy layer: the route itself
// enforces auth via the CRON_SECRET bearer token / x-vercel-cron header, so
// the GitHub Actions scheduler (no session cookie) can reach it.
const PUBLIC_API = ['/api/auth', '/api/t', '/api/unsubscribe', '/api/health', '/api/scheduler'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const isApi = pathname.startsWith('/api');
  const isPublicApi = PUBLIC_API.some(p => pathname === p || pathname.startsWith(`${p}/`));
  const isPublicPage = PUBLIC_PAGES.some(p => pathname === p || pathname.startsWith(`${p}/`));

  if (isApi) {
    if (!isPublicApi && !token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Non-API routes.
  if (!isPublicPage && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in — skip the login/welcome screens.
  if (isPublicPage && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets and public media.
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
