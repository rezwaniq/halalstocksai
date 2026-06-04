import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByEmail, createUser, createBypassSession } from '@/lib/users';
import { sendAdminApprovalRequestResend } from '@/lib/email-resend';

const SESSION_COOKIE = 'hsa_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  // Dev bypass
  const bypass = process.env.DEV_BYPASS;
  if (bypass && email.trim().toLowerCase() === bypass.toLowerCase()) {
    const { randomUUID } = await import('crypto');
    const token = randomUUID();
    createBypassSession(token);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return NextResponse.json({ status: 'approved' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const existing = getUserByEmail(email);

  if (existing) {
    if (existing.status === 'approved') {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, existing.sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
      return NextResponse.json({ status: 'approved' });
    }
    return NextResponse.json({ status: 'pending' });
  }

  const user = createUser(email);

  try {
    await sendAdminApprovalRequestResend(email, user.approvalToken);
  } catch (err) {
    console.error('Failed to send admin email via Resend:', err);
  }

  return NextResponse.json({ status: 'pending' });
}
