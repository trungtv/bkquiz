import type { NextFetchEvent, NextRequest } from 'next/server';
import { detectBot } from '@arcjet/next';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import arcjet from '@/libs/Arcjet';
import { routing } from '@/libs/I18nRouting';
import { AppConfig } from '@/utils/AppConfig';

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
  const pathname = req.nextUrl.pathname;

  // 1. TRƯỜNG HỢP API: Cho qua ngay lập tức, không xử lý gì thêm
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 2. Redirect /privacy và /terms (cho Google OAuth)
  if (pathname === '/privacy' || pathname === '/terms') {
    return NextResponse.redirect(new URL(`/${AppConfig.defaultLocale}${pathname}`, req.url));
  }

  // 3. Bảo vệ bot bằng Arcjet (không chạy cho API)
  void event;
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(req);
    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // 4. Kiểm tra Auth cho dashboard
  if (isProtectedPathname(pathname)) {
    if (process.env.DEV_BYPASS_AUTH === '1') {
      return handleI18nRouting(req);
    }
    const hasSession = !!req.cookies.get('authjs.session-token')
      || !!req.cookies.get('__Secure-authjs.session-token');

    if (!hasSession) {
      return NextResponse.redirect(buildSignInUrl(req));
    }
  }

  // 5. Xử lý i18n cho các route còn lại
  return handleI18nRouting(req);
}

export const config = {
  // Matcher chuẩn để loại bỏ API và các file tĩnh
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
