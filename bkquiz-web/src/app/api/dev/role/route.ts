import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  if (process.env.DEV_BYPASS_AUTH !== '1') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  const url = new URL(req.url);
  const role = url.searchParams.get('role') === 'student' ? 'student' : 'teacher';
  const next = url.searchParams.get('next') ?? '/dashboard';

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set('bkquiz_dev_role', role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return res;
}

// EOF
