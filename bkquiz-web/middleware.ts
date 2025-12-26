import type { NextFetchEvent, NextRequest } from 'next/server';
import { detectBot } from '@arcjet/next';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import arcjet from '@/libs/Arcjet';
import { routing } from '@/libs/I18nRouting';
import { AppConfig } from '@/utils/AppConfig';

// Note: we keep i18n + Arcjet behavior from the boilerplate.
const handleI18nRouting = createMiddleware(routing);

const aj = arcjet.withRule(
  detectBot({
    mode: 'LIVE',
    allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW', 'CATEGORY:MONITOR'],
  }),
);

function isProtectedPathname(pathname: string) {
  return pathname === '/dashboard'
    || pathname.startsWith('/dashboard/')
    || pathname.endsWith('/dashboard')
    || pathname.includes('/dashboard/');
}

function buildSignInUrl(req: NextRequest) {
  const localePrefix = req.nextUrl.pathname.match(/^\/([a-z]{2})(\/|$)/i)?.[1];
  const signInPath = localePrefix ? `/${localePrefix}/sign-in` : '/sign-in';
  return new URL(signInPath, req.url);
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  void event;
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(req);
    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Let API routes pass-through (avoid i18n rewrites on /api/*)
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Redirect /privacy and /terms to default locale (for OAuth consent screen)
  const pathname = req.nextUrl.pathname;
  if (pathname === '/privacy' || pathname === '/terms') {
    const defaultLocale = AppConfig.defaultLocale;
    return NextResponse.redirect(new URL(`/${defaultLocale}${pathname}`, req.url));
  }

  // Minimal protection for dashboard area. (We will later add role checks per page/API.)
  if (isProtectedPathname(req.nextUrl.pathname)) {
    if (process.env.DEV_BYPASS_AUTH === '1') {
      return handleI18nRouting(req);
    }
    const hasSession = !!req.cookies.get('authjs.session-token')
      || !!req.cookies.get('__Secure-authjs.session-token');

    if (!hasSession) {
      return NextResponse.redirect(buildSignInUrl(req));
    }
  }

  return handleI18nRouting(req);
}

export const config = {
  // Exclude API routes, static files, and Next.js internals from middleware
  // CRITICAL: 'api' must be first to prevent i18n routing from intercepting NextAuth
  matcher: [
    '/((?!api|_next/static|_next/image|_next|_vercel|monitoring|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
