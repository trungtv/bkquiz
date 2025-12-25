import { NextResponse } from 'next/server';

/**
 * API route để xóa cookie dev role khi sign out trong dev mode
 * Chỉ hoạt động khi DEV_BYPASS_AUTH=1
 */
export async function POST() {
  if (process.env.DEV_BYPASS_AUTH !== '1') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const res = NextResponse.json({ success: true });
  // Xóa cookie bằng cách set với maxAge = 0
  res.cookies.set('bkquiz_dev_role', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
